// src/providers/pesapal.provider.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
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

export enum PaymentStatus {
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  REVERSED = 'REVERSED',
  INVALID = 'INVALID',
}

const PESAPAL_STATUS_MAP: Record<string, PaymentStatus> = {
  'COMPLETED': PaymentStatus.SUCCESSFUL,
  'FAILED': PaymentStatus.FAILED,
  'INVALID': PaymentStatus.INVALID,
  'REVERSED': PaymentStatus.REVERSED,
  'PENDING': PaymentStatus.PENDING,
};

const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const RETRYABLE_ERRORS = new Set(['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT']);

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class PesapalProvider implements PaymentProvider {
  private consumerKey: string;
  private consumerSecret: string;
  private ipnId: string | null = null;
  private callbackUrl: string;
  private cancellationUrl?: string;
  private baseUrl: string = 'https://pay.pesapal.com/v3';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private isInitialized: boolean = false;
  
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private readonly FAILURE_THRESHOLD = 5;
  private readonly CIRCUIT_TIMEOUT = 60000;
  private lastFailureTime: number = 0;
  private ipnRegistrationAttempted: boolean = false;

  constructor() {
    this.consumerKey = process.env.PESAPAL_CONSUMER_KEY || '';
    this.consumerSecret = process.env.PESAPAL_CONSUMER_SECRET || '';
    this.callbackUrl = process.env.PAYMENT_CALLBACK_URL || process.env.PESAPAL_CALLBACK_URL || '';
    this.cancellationUrl = process.env.PESAPAL_CANCELLATION_URL;
    
    if (!this.consumerKey || !this.consumerSecret) {
      logger.error('[PESAPAL] Consumer Key or Secret is missing');
    }

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      if (this.isInitialized) return;
      logger.info('[PESAPAL] Initializing provider...');
      await this.ensureIPNRegistered();
      this.isInitialized = true;
      logger.info('[PESAPAL] Provider initialized successfully');
    } catch (error) {
      logger.error('[PESAPAL] Initialization failed:', error);
    }
  }

  private async ensureIPNRegistered(): Promise<void> {
    try {
      if (this.ipnId) {
        logger.info(`[PESAPAL] Using existing IPN ID: ${this.ipnId}`);
        return;
      }

      if (this.ipnRegistrationAttempted) {
        logger.warn('[PESAPAL] IPN registration already attempted but failed');
        return;
      }

      this.ipnRegistrationAttempted = true;

      if (!this.callbackUrl) {
        logger.error('[PESAPAL] Cannot register IPN: callback URL not configured');
        return;
      }

      const token = await this.getAccessToken();

      logger.info('[PESAPAL] Checking for existing IPN...');
      const existingIpnId = await this.getExistingIPN(this.callbackUrl);
      
      if (existingIpnId) {
        this.ipnId = existingIpnId;
        logger.info(`[PESAPAL] Reusing existing IPN: ${this.ipnId}`);
        return;
      }

      logger.info(`[PESAPAL] Registering new IPN URL: ${this.callbackUrl}`);
      const response = await this.makeRequest<{ ipn_id: string; status: string }>(
        'POST',
        '/api/URLSetup/RegisterIPN',
        {
          url: this.callbackUrl,
          ipn_notification_type: 'POST'
        },
        token
      );

      if (response?.ipn_id && response?.status === '200') {
        this.ipnId = response.ipn_id;
        logger.info(`[PESAPAL] IPN registered successfully: ${this.ipnId}`);
      } else {
        throw new Error('IPN registration failed: Invalid response');
      }
    } catch (error) {
      logger.error('[PESAPAL] IPN registration error:', error);
      throw error;
    }
  }

  private async getExistingIPN(url: string): Promise<string | null> {
    try {
      const token = await this.getAccessToken();
      const response = await this.makeRequest<any[]>(
        'GET',
        '/api/URLSetup/GetIpnList',
        undefined,
        token
      );

      if (Array.isArray(response)) {
        const existing = response.find(
          (ipn: any) => ipn.url === url && ipn.status === '200'
        );
        if (existing?.ipn_id) {
          return existing.ipn_id;
        }
      }
      return null;
    } catch (error) {
      logger.error('[PESAPAL] Get IPN list error:', error);
      return null;
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry > Date.now() + 30000) {
      return this.accessToken;
    }

    logger.info('[PESAPAL] Requesting new access token');
    const response = await this.makeRequest<{
      token: string;
      expiryDate: string;
      status: string;
      message: string;
    }>(
      'POST',
      '/api/Auth/RequestToken',
      {
        consumer_key: this.consumerKey,
        consumer_secret: this.consumerSecret,
      }
    );

    if (response?.token && response?.status === '200') {
      this.accessToken = response.token;
      this.tokenExpiry = new Date(response.expiryDate).getTime();
      logger.info(`[PESAPAL] Access token received. Expires at: ${response.expiryDate}`);
      return this.accessToken;
    }

    throw new Error(response?.message || 'Invalid token response from Pesapal');
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any,
    token?: string | null,
    retryCount: number = 0
  ): Promise<T> {
    if (this.circuitState === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.CIRCUIT_TIMEOUT) {
        this.circuitState = CircuitState.HALF_OPEN;
        logger.info('[PESAPAL] Circuit breaker: Half-open - testing health');
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    const startTime = Date.now();
    const url = `${this.baseUrl}${endpoint}`;
    const config: AxiosRequestConfig = {
      method,
      url,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      ...(data && { data }),
    };

    try {
      const response = await axios(config);
      const duration = Date.now() - startTime;

      logger.info(`[PESAPAL] ${method} ${endpoint} - ${response.status} (${duration}ms)`);

      if (this.circuitState === CircuitState.HALF_OPEN) {
        this.circuitState = CircuitState.CLOSED;
        this.failureCount = 0;
        logger.info('[PESAPAL] Circuit breaker: Closed - service recovered');
      }

      this.failureCount = 0;
      return response.data as T;
    } catch (error) {
      const duration = Date.now() - startTime;
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const errorCode = axiosError.code;

      const isRetryable = this.isRetryableError(axiosError);

      if (status === 401 && retryCount === 0) {
        logger.warn('[PESAPAL] Received 401 - refreshing token and retrying');
        this.accessToken = null;
        const newToken = await this.getAccessToken();
        return this.makeRequest<T>(method, endpoint, data, newToken, retryCount + 1);
      }

      if (isRetryable && retryCount < 3) {
        const delays = [1000, 2000, 5000];
        const delay = delays[retryCount];
        logger.warn(`[PESAPAL] Retryable error - retry ${retryCount + 1}/3 in ${delay}ms`);
        this.recordFailure();
        await this.sleep(delay);
        return this.makeRequest<T>(method, endpoint, data, token, retryCount + 1);
      }

      this.recordFailure();
      logger.error(`[PESAPAL] ${method} ${endpoint} failed: ${errorCode || status} - ${axiosError.message}`);
      throw new Error(
        `Pesapal request failed: ${axiosError.message}${status ? ` (HTTP ${status})` : ''}`
      );
    }
  }

  private isRetryableError(error: AxiosError): boolean {
    const status = error.response?.status;
    const code = error.code;
    if (status && RETRYABLE_STATUSES.has(status)) return true;
    if (code && RETRYABLE_ERRORS.has(code)) return true;
    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) return true;
    return false;
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.circuitState = CircuitState.OPEN;
      logger.error(`[PESAPAL] Circuit breaker: OPEN - ${this.FAILURE_THRESHOLD} consecutive failures`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private validateRequest(request: PaymentInitiationRequest): void {
    const ref = request.externalReference;
    if (!ref) throw new Error('Merchant reference is required');
    if (ref.length > 50) throw new Error('Merchant reference exceeds 50 characters');
    if (!/^[a-zA-Z0-9\-_\.:]+$/.test(ref)) {
      throw new Error('Merchant reference contains invalid characters');
    }

    const description = (request as any).description || `Payment - ${ref}`;
    if (description.length > 100) throw new Error('Description exceeds 100 characters');

    if (request.phoneNumber) {
      const phone = request.phoneNumber.replace(/\D/g, '');
      if (!phone.startsWith('254') || phone.length !== 12) {
        throw new Error('Invalid phone number format. Must be 254XXXXXXXXX');
      }
    }

    if (!request.amount || request.amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Pesapal provider not configured',
        };
      }

      this.validateRequest(request);
      await this.ensureIPNRegistered();

      if (!this.ipnId) {
        return {
          success: false,
          error: 'IPN not registered - please check configuration',
        };
      }

      const token = await this.getAccessToken();
      const merchantRef = this.sanitizeMerchantReference(request.externalReference || '');
      const residentName = (request as any).residentName || 'Resident';
      const nameParts = residentName.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Resident';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Legacy Homes';

      const billingAddress: any = {
        first_name: firstName,
        last_name: lastName,
        country_code: 'KE',
      };

      if (request.phoneNumber) {
        billingAddress.phone_number = this.sanitizePhoneNumber(request.phoneNumber);
      }
      
      if ((request as any).residentEmail) {
        billingAddress.email_address = (request as any).residentEmail;
      }

      const payload = {
        id: merchantRef,
        currency: 'KES',
        amount: Number(request.amount).toFixed(2),
        description: this.truncateDescription(
          (request as any).description || `Legacy Homes Payment - ${merchantRef}`,
          100
        ),
        callback_url: this.callbackUrl,
        redirect_mode: 'TOP_WINDOW',
        notification_id: this.ipnId,
        branch: process.env.PESAPAL_BRANCH || 'Legacy Homes HQ',
        billing_address: billingAddress,
        ...(this.cancellationUrl && { cancellation_url: this.cancellationUrl }),
      };

      logger.info(`[PESAPAL] Submitting order. Reference: ${merchantRef}, Amount: ${request.amount}`);

      const response = await this.makeRequest<{
        order_tracking_id: string;
        merchant_reference: string;
        redirect_url: string;
        status: string;
        message?: string;
      }>(
        'POST',
        '/api/Transactions/SubmitOrderRequest',
        payload,
        token
      );

      if (response?.order_tracking_id && response?.status === '200') {
        logger.info(`[PESAPAL] Order created. Tracking ID: ${response.order_tracking_id}`);
        return {
          success: true,
          orderId: response.order_tracking_id,
          checkoutUrl: response.redirect_url,
          message: 'Order created successfully',
          providerData: {
            merchantReference: response.merchant_reference,
          },
        };
      }

      const errorMsg = response?.message || 'Failed to initiate payment';
      logger.error(`[PESAPAL] Order creation failed: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    } catch (error) {
      logger.error('[PESAPAL] Payment initiation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyPaymentStatus(request: PaymentStatusRequest): Promise<PaymentStatusResponse> {
    try {
      const orderTrackingId = request.orderId;
      if (!orderTrackingId) {
        return {
          status: 'FAILED',
          message: 'Order Tracking ID required',
        };
      }

      const token = await this.getAccessToken();

      logger.info(`[PESAPAL] Verifying transaction: ${orderTrackingId}`);
      const response = await this.makeRequest<{
        payment_method?: string;
        amount?: number;
        created_date?: string;
        confirmation_code?: string;
        payment_status_description?: string;
        description?: string;
        message?: string;
        payment_account?: string;
        status_code?: number;
        merchant_reference?: string;
        currency?: string;
        status?: string;
      }>(
        'GET',
        `/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
        undefined,
        token
      );

      if (response?.status !== '200') {
        return {
          status: 'FAILED',
          message: response?.message || 'Failed to get transaction status',
        };
      }

      const statusDesc = response.payment_status_description || 'PENDING';
      const mappedStatus = this.mapPesapalStatus(statusDesc);

      logger.info(`[PESAPAL] Status for ${orderTrackingId}: ${statusDesc} -> ${mappedStatus}`);

      return {
        status: mappedStatus as any,
        transactionId: response.confirmation_code || orderTrackingId,
        orderId: orderTrackingId,
        amount: response.amount,
        message: response.message || statusDesc,
        timestamp: response.created_date ? new Date(response.created_date) : new Date(),
        providerData: {
          payment_method: response.payment_method,
          payment_account: response.payment_account,
          status_code: response.status_code,
          merchant_reference: response.merchant_reference,
          currency: response.currency,
          payment_status_description: statusDesc,
        },
      };
    } catch (error) {
      logger.error('[PESAPAL] Payment verification error:', error);
      return {
        status: 'FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyCallback(request: CallbackVerificationRequest): Promise<CallbackVerificationResponse> {
    try {
      const payload = request.payload || {};
      const orderTrackingId = payload.OrderTrackingId || payload.order_tracking_id;
      const merchantRef = payload.OrderMerchantReference || payload.order_merchant_reference;

      logger.info(`[PESAPAL] Callback received. Tracking: ${orderTrackingId}, Ref: ${merchantRef}`);

      if (!orderTrackingId) {
        logger.warn('[PESAPAL] Callback received without OrderTrackingId');
        return { valid: false, message: 'Missing OrderTrackingId' };
      }

      const verification = await this.verifyPaymentStatus({
        orderId: orderTrackingId,
      });

      return {
        valid: true,
        transactionId: orderTrackingId,
        status: verification.status,
        amount: verification.amount,
        message: verification.message,
        timestamp: verification.timestamp,
        providerData: verification.providerData,
      };
    } catch (error) {
      logger.error('[PESAPAL] Callback verification error:', error);
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async handleIPN(payload: any): Promise<{ response: any; statusCode: number }> {
    try {
      const orderTrackingId = payload.OrderTrackingId || payload.order_tracking_id;
      const merchantRef = payload.OrderMerchantReference || payload.order_merchant_reference;

      logger.info(`[PESAPAL] IPN received. Tracking: ${orderTrackingId}, Ref: ${merchantRef}`);

      if (!orderTrackingId) {
        logger.warn('[PESAPAL] IPN received without OrderTrackingId');
        return {
          response: {
            orderNotificationType: 'IPNCHANGE',
            orderTrackingId: '',
            orderMerchantReference: merchantRef || '',
            status: 200,
          },
          statusCode: 200,
        };
      }

      await this.verifyPaymentStatus({
        orderId: orderTrackingId,
      });

      return {
        response: {
          orderNotificationType: 'IPNCHANGE',
          orderTrackingId: orderTrackingId,
          orderMerchantReference: merchantRef || '',
          status: 200,
        },
        statusCode: 200,
      };
    } catch (error) {
      logger.error('[PESAPAL] IPN handling error:', error);
      return {
        response: {
          orderNotificationType: 'IPNCHANGE',
          orderTrackingId: payload?.OrderTrackingId || '',
          orderMerchantReference: payload?.OrderMerchantReference || '',
          status: 500,
        },
        statusCode: 500,
      };
    }
  }

  async registerIPN(url: string): Promise<string | null> {
    try {
      const token = await this.getAccessToken();
      const existing = await this.getExistingIPN(url);
      if (existing) {
        logger.info(`[PESAPAL] IPN already exists: ${existing}`);
        return existing;
      }

      const response = await this.makeRequest<{
        ipn_id: string;
        status: string;
        message?: string;
      }>(
        'POST',
        '/api/URLSetup/RegisterIPN',
        {
          url: url,
          ipn_notification_type: 'POST'
        },
        token
      );

      if (response?.ipn_id && response?.status === '200') {
        logger.info(`[PESAPAL] IPN registered: ${response.ipn_id}`);
        return response.ipn_id;
      }

      logger.error(`[PESAPAL] IPN registration failed: ${response?.message}`);
      return null;
    } catch (error) {
      logger.error('[PESAPAL] IPN registration error:', error);
      return null;
    }
  }

  async cancelOrder(orderTrackingId: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = await this.getAccessToken();
      
      logger.info(`[PESAPAL] Cancelling order: ${orderTrackingId}`);
      const response = await this.makeRequest<{
        status: string;
        message: string;
      }>(
        'POST',
        '/api/Transactions/CancelOrder',
        {
          order_tracking_id: orderTrackingId,
        },
        token
      );

      if (response?.status === '200') {
        logger.info(`[PESAPAL] Order cancelled: ${orderTrackingId}`);
        return {
          success: true,
          message: response.message || 'Order successfully cancelled.',
        };
      }

      return {
        success: false,
        message: response?.message || 'Failed to cancel order',
      };
    } catch (error) {
      logger.error('[PESAPAL] Cancel order error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private mapPesapalStatus(statusDesc: string): PaymentStatus {
    return PESAPAL_STATUS_MAP[statusDesc] || PaymentStatus.PENDING;
  }

  private sanitizeMerchantReference(ref: string): string {
    return ref.replace(/[^a-zA-Z0-9\-_\.:]/g, '');
  }

  private truncateDescription(desc: string, maxLength: number = 100): string {
    return desc.length > maxLength ? desc.substring(0, maxLength) : desc;
  }

  private sanitizePhoneNumber(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  getProviderName(): string {
    return 'PESAPAL';
  }

  isConfigured(): boolean {
    return !!(this.consumerKey && this.consumerSecret && this.callbackUrl);
  }

  getIPNId(): string | null {
    return this.ipnId;
  }

  getCircuitState(): string {
    return this.circuitState;
  }
        }
