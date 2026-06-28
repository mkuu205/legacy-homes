import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  PaymentProvider,
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  PaymentStatusRequest,
  PaymentStatusResponse,
  CallbackVerificationRequest,
  CallbackVerificationResponse,
} from './payment-provider.interface';
import { logger } from '../utils/logger';
import prisma from '../config/prisma';

/**
 * Production Pesapal v3 provider.
 *
 * Hardening over the previous version:
 *  - Always sends `Accept: application/json` (Pesapal v3 occasionally 415s otherwise).
 *  - Token cache uses a defensive 60-second skew and falls back to 4 minutes if
 *    `expiryDate` is missing/unparseable (the API has been seen to omit it).
 *  - Auto-registers IPN at startup if PESAPAL_IPN_ID is missing, and persists the
 *    notification_id into SystemSetting so we never re-register on every boot.
 *  - All HTTP requests share a 15s timeout and explicit User-Agent so failures
 *    surface in logs instead of hanging forever.
 *  - Status mapping covers COMPLETED / FAILED / INVALID / REVERSED.
 */
export class PesapalProvider implements PaymentProvider {
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly baseUrl = 'https://pay.pesapal.com/v3';
  private readonly callbackUrl: string;
  private readonly ipnUrl: string;

  private ipnId: string;
  private accessToken: string | null = null;
  private tokenExpiry = 0;
  private http: AxiosInstance;

  constructor() {
    this.consumerKey = process.env.PESAPAL_CONSUMER_KEY || '';
    this.consumerSecret = process.env.PESAPAL_CONSUMER_SECRET || '';
    this.ipnId = process.env.PESAPAL_IPN_ID || '';
    this.callbackUrl = process.env.PESAPAL_CALLBACK_URL || '';
    this.ipnUrl = process.env.PESAPAL_IPN_URL || process.env.PESAPAL_CALLBACK_URL || '';

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 15_000,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'LegacyHomes/1.0' },
    });

    if (!this.consumerKey || !this.consumerSecret) {
      logger.error('[PESAPAL] PESAPAL_CONSUMER_KEY / PESAPAL_CONSUMER_SECRET missing');
    }
  }

  isConfigured(): boolean {
    // ipnId becomes available after first ensureIpnRegistered(); don't gate config on it.
    return !!(this.consumerKey && this.consumerSecret && this.callbackUrl);
  }

  getProviderName(): string {
    return 'PESAPAL';
  }

  // ────────────────────────────────────────────────────────────────────────
  // Auth
  // ────────────────────────────────────────────────────────────────────────
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry > Date.now() + 60_000) return this.accessToken;

    logger.info('[PESAPAL] requesting access token');
    const { data } = await this.http.post('/api/Auth/RequestToken', {
      consumer_key: this.consumerKey,
      consumer_secret: this.consumerSecret,
    });

    if (!data?.token) {
      logger.error('[PESAPAL] token request returned no token', { data });
      throw new Error(data?.message || data?.error?.message || 'Pesapal token request failed');
    }

    const parsed = data.expiryDate ? Date.parse(data.expiryDate) : NaN;
    this.tokenExpiry = Number.isFinite(parsed) ? parsed : Date.now() + 4 * 60_000;
    this.accessToken = data.token as string;
    return this.accessToken;
  }

  // ────────────────────────────────────────────────────────────────────────
  // IPN registration (idempotent, persisted)
  // ────────────────────────────────────────────────────────────────────────
  async ensureIpnRegistered(): Promise<string> {
    if (this.ipnId) return this.ipnId;

    // Try DB cache first
    const cached = await prisma.systemSetting
      .findUnique({ where: { key: 'PESAPAL_IPN_ID' } })
      .catch(() => null);
    if (cached?.value) {
      this.ipnId = cached.value;
      return this.ipnId;
    }

    if (!this.ipnUrl) {
      throw new Error('PESAPAL_IPN_URL (or PESAPAL_CALLBACK_URL) is required to register an IPN');
    }

    const token = await this.getAccessToken();
    const { data } = await this.http.post(
      '/api/URLSetup/RegisterIPN',
      { url: this.ipnUrl, ipn_notification_type: 'POST' },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!data?.ipn_id) {
      logger.error('[PESAPAL] IPN registration returned no ipn_id', { data });
      throw new Error('Pesapal IPN registration failed');
    }

    this.ipnId = data.ipn_id;
    await prisma.systemSetting
      .upsert({
        where: { key: 'PESAPAL_IPN_ID' },
        update: { value: this.ipnId },
        create: { key: 'PESAPAL_IPN_ID', value: this.ipnId },
      })
      .catch((e) => logger.warn('[PESAPAL] could not persist ipn_id', { e }));

    logger.info('[PESAPAL] IPN registered', { ipnId: this.ipnId });
    return this.ipnId;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Submit order
  // ────────────────────────────────────────────────────────────────────────
  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      if (!this.isConfigured()) return { success: false, error: 'Pesapal provider not configured' };

      const token = await this.getAccessToken();
      const ipnId = await this.ensureIpnRegistered();

      const residentName = String((request as any).residentName || 'Resident').trim();
      const [firstName, ...rest] = residentName.split(/\s+/);
      const lastName = rest.join(' ') || 'Legacy Homes';

      const payload = {
        id: request.externalReference,
        currency: 'KES',
        amount: Number(request.amount),
        description: `Legacy Homes Bill #${(request as any).billNumber || request.billId}`.slice(0, 100),
        callback_url: this.callbackUrl,
        notification_id: ipnId,
        billing_address: {
          phone_number: request.phoneNumber,
          email_address: (request as any).residentEmail || 'resident@legacyhomes.co.ke',
          first_name: firstName || 'Resident',
          last_name: lastName,
          country_code: 'KE',
        },
      };

      logger.info('[PESAPAL] submitting order', { ref: request.externalReference, amount: payload.amount });
      const { data } = await this.http.post('/api/Transactions/SubmitOrderRequest', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Pesapal returns { order_tracking_id, merchant_reference, redirect_url, status, error }
      if (data?.status && String(data.status) !== '200') {
        const errMsg = data.error?.message || data.message || 'Pesapal rejected the order';
        logger.error('[PESAPAL] order rejected', { data });
        return { success: false, error: errMsg, providerData: data };
      }
      if (!data?.order_tracking_id || !data?.redirect_url) {
        return { success: false, error: 'Invalid response from Pesapal', providerData: data };
      }

      return {
        success: true,
        orderId: data.order_tracking_id,
        checkoutUrl: data.redirect_url,
        message: 'Order created — redirect customer to checkout',
        providerData: data,
      };
    } catch (e) {
      return { success: false, error: extractAxiosError(e) };
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // GetTransactionStatus
  // ────────────────────────────────────────────────────────────────────────
  async verifyPaymentStatus(req: PaymentStatusRequest): Promise<PaymentStatusResponse> {
    try {
      const orderTrackingId = req.orderId || req.transactionId;
      if (!orderTrackingId) {
        return { status: 'FAILED', message: 'Missing orderId/transactionId for verification' };
      }
      const token = await this.getAccessToken();
      const { data } = await this.http.get(
        `/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const desc = String(data?.payment_status_description || '').toUpperCase();
      const code = data?.status_code ?? data?.payment_status_code;
      // Pesapal status codes: 0=INVALID, 1=COMPLETED, 2=FAILED, 3=REVERSED
      let status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' = 'PENDING';
      if (desc === 'COMPLETED' || code === 1) status = 'SUCCESSFUL';
      else if (desc === 'FAILED' || desc === 'INVALID' || desc === 'REVERSED' || code === 0 || code === 2 || code === 3) status = 'FAILED';

      return {
        status,
        message: data?.description || desc || 'Verified',
        amount: data?.amount,
        currency: data?.currency,
        receiptNumber: data?.confirmation_code,
        confirmationCode: data?.confirmation_code,
        providerData: data,
      };
    } catch (e) {
      return { status: 'FAILED', message: extractAxiosError(e) };
    }
  }

  async verifyCallback(request: CallbackVerificationRequest): Promise<CallbackVerificationResponse> {
    const payload = request.payload || {};
    const orderTrackingId = payload.OrderTrackingId || payload.order_tracking_id;
    if (!orderTrackingId) return { valid: false, message: 'Missing OrderTrackingId' };

    const verified = await this.verifyPaymentStatus({ orderId: orderTrackingId });
    return {
      valid: true,
      transactionId: orderTrackingId,
      status: verified.status,
      amount: verified.amount,
      message: verified.message,
    };
  }

  async registerIPN(url: string): Promise<string | null> {
    // Manual override; bypasses cache so admins can re-register a moved URL.
    const token = await this.getAccessToken();
    const { data } = await this.http.post(
      '/api/URLSetup/RegisterIPN',
      { url, ipn_notification_type: 'POST' },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data?.ipn_id ?? null;
  }

  /** Health probe — succeeds only against live production credentials. */
  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; reason?: string }> {
    const t = Date.now();
    try {
      await this.getAccessToken();
      return { ok: true, latencyMs: Date.now() - t };
    } catch (e) {
      return { ok: false, latencyMs: Date.now() - t, reason: extractAxiosError(e) };
    }
  }
}

function extractAxiosError(e: unknown): string {
  if (e instanceof AxiosError) {
    const data = e.response?.data;
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
    return `${e.code || 'HTTP'} ${e.response?.status ?? ''} ${e.message}`.trim();
  }
  return e instanceof Error ? e.message : 'Unknown error';
}
