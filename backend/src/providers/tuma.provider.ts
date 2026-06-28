// src/providers/tuma.provider.ts
import axios, { AxiosError } from 'axios';
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

// Retryable HTTP status codes
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const RETRYABLE_ERRORS = new Set(['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT']);

export class TumaProvider implements PaymentProvider {
  private email: string;
  private apiKey: string;
  private callbackUrl: string;
  private baseUrl: string;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    // Match your exact environment variable names
    this.email = process.env.TUMA_BUSINESS_EMAIL || process.env.TUMA_EMAIL || '';
    this.apiKey = process.env.TUMA_API_KEY || '';
    this.baseUrl = process.env.TUMA_API_URL || 'https://api.tuma.co.ke';
    this.callbackUrl = process.env.PAYMENT_CALLBACK_URL || process.env.TUMA_CALLBACK_URL || '';

    // Log configuration status
    const isConfigured = this.isConfigured();
    logger.info(`[TUMA] Provider initialized. Configured: ${isConfigured}`);
    
    if (!isConfigured) {
      const config = this.getConfigStatus();
      const missing = [];
      if (!config.email) missing.push('TUMA_BUSINESS_EMAIL or TUMA_EMAIL');
      if (!config.apiKey) missing.push('TUMA_API_KEY');
      if (!config.callbackUrl) missing.push('PAYMENT_CALLBACK_URL or TUMA_CALLBACK_URL');
      logger.warn(`[TUMA] Missing configuration: ${missing.join(', ')}`);
    } else {
      logger.info(`[TUMA] Using API URL: ${this.baseUrl}`);
      logger.info(`[TUMA] Callback URL: ${this.callbackUrl}`);
    }
  }

  /**
   * Get access token with caching and auto-refresh
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (86400 seconds per docs)
    if (this.token && this.tokenExpiry > Date.now() + 30000) {
      return this.token;
    }

    try {
      logger.info('[TUMA] Requesting new access token');
      
      // Use the auth URL from env or construct from base URL
      const authUrl = process.env.TUMA_AUTH_URL || `${this.baseUrl}/auth/token`;
      
      const response = await axios.post(
        authUrl,
        {
          email: this.email,
          api_key: this.apiKey,
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.success && response.data?.token) {
        this.token = response.data.token;
        this.tokenExpiry = Date.now() + (response.data.expires_in || 86400) * 1000;
        logger.info(`[TUMA] Access token received. Expires in: ${response.data.expires_in || 86400}s`);
        return this.token;
      }

      throw new Error(response.data?.message || 'Invalid token response from Tuma');
    } catch (error) {
      logger.error('[TUMA] Token request error:', error);
      throw error;
    }
  }

  /**
   * Make HTTP request with retry and timeout
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any,
    retryCount: number = 0
  ): Promise<T> {
    const startTime = Date.now();
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const token = await this.getAccessToken();

      const response = await axios({
        method,
        url,
        data,
        timeout: 30000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const duration = Date.now() - startTime;
      logger.info(`[TUMA] ${method} ${endpoint} - ${response.status} (${duration}ms)`);

      return response.data as T;
    } catch (error) {
      const duration = Date.now() - startTime;
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const errorCode = axiosError.code;

      // Check if retryable
      const isRetryable = this.isRetryableError(axiosError);

      // Handle 401 - auto-refresh token
      if (status === 401 && retryCount === 0) {
        logger.warn('[TUMA] Received 401 - refreshing token and retrying');
        this.token = null; // Invalidate cache
        return this.makeRequest<T>(method, endpoint, data, retryCount + 1);
      }

      // Retry logic for retryable errors
      if (isRetryable && retryCount < 3) {
        const delays = [1000, 2000, 5000];
        const delay = delays[retryCount];
        logger.warn(`[TUMA] Retryable error - retry ${retryCount + 1}/3 in ${delay}ms`);
        await this.sleep(delay);
        return this.makeRequest<T>(method, endpoint, data, retryCount + 1);
      }

      logger.error(`[TUMA] ${method} ${endpoint} failed: ${errorCode || status} - ${axiosError.message}`);
      throw new Error(
        `Tuma request failed: ${axiosError.message}${status ? ` (HTTP ${status})` : ''}`
      );
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: AxiosError): boolean {
    const status = error.response?.status;
    const code = error.code;

    if (status && RETRYABLE_STATUSES.has(status)) return true;
    if (code && RETRYABLE_ERRORS.has(code)) return true;
    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) return true;

    return false;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate request before sending
   */
  private validateRequest(request: PaymentInitiationRequest): void {
    if (!request.phoneNumber) {
      throw new Error('Phone number is required for STK push');
    }

    const phone = request.phoneNumber.replace(/\D/g, '');
    if (!phone.startsWith('254') || phone.length !== 12) {
      throw new Error('Invalid phone number format. Must be 254XXXXXXXXX');
    }

    if (!request.amount || request.amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }
  }

  /**
   * Initiate STK Push payment
   */
  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'TUMA provider not configured. Missing: TUMA_BUSINESS_EMAIL, TUMA_API_KEY, or PAYMENT_CALLBACK_URL',
        };
      }

      // Production validation
      this.validateRequest(request);

      const payload = {
        amount: Number(request.amount),
        phone: request.phoneNumber.replace(/\D/g, ''),
        callback_url: this.callbackUrl,
        description: (request as any).description || `Payment - ${request.externalReference || request.billId}`,
      };

      logger.info(`[TUMA] Initiating STK push. Phone: ${payload.phone}, Amount: ${payload.amount}`);

      const response = await this.makeRequest<{
        success: boolean;
        message: string;
        data: {
          merchant_request_id: string;
          checkout_request_id: string;
          customer_message: string;
        };
      }>('/payment/stk-push', payload);

      if (response.success && response.data) {
        const orderId = response.data.merchant_request_id || response.data.checkout_request_id;
        logger.info(`[TUMA] STK Push initiated. Order ID: ${orderId}`);

        return {
          success: true,
          orderId: orderId,
          checkoutUrl: null, // STK Push doesn't have a redirect URL
          message: response.message || 'STK Push sent successfully',
          providerData: {
            merchant_request_id: response.data.merchant_request_id,
            checkout_request_id: response.data.checkout_request_id,
            customer_message: response.data.customer_message,
          },
        };
      }

      const errorMsg = response.message || 'Failed to initiate STK push';
      logger.error(`[TUMA] STK Push failed: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    } catch (error) {
      logger.error('[TUMA] Initiation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify payment status - TUMA doesn't have a direct status check API
   * Status comes via callbacks only
   */
  async verifyPaymentStatus(request: PaymentStatusRequest): Promise<PaymentStatusResponse> {
    logger.info(`[TUMA] Status check requested for ${request.orderId} - using callback data only`);
    
    return {
      status: 'PENDING',
      message: 'TUMA status is delivered via callback only. Check callback payload.',
      orderId: request.orderId,
    };
  }

  /**
   * Verify callback - process TUMA callback payload
   */
  async verifyCallback(request: CallbackVerificationRequest): Promise<CallbackVerificationResponse> {
    const payload = request.payload;

    // Extract fields per Tuma docs
    const merchantRequestId = payload.merchant_request_id;
    const checkoutRequestId = payload.checkout_request_id;
    const resultCode = payload.result_code;
    const resultDesc = payload.result_desc;
    const mpesaReceiptNumber = payload.mpesa_receipt_number;
    const amount = payload.amount;
    const timestamp = payload.timestamp;
    const status = payload.status; // 'completed' or 'failed'

    logger.info(`[TUMA] Callback received. Merchant: ${merchantRequestId}, Checkout: ${checkoutRequestId}`);

    // Per Tuma docs: result_code = 0 means success
    const isSuccess = resultCode === 0 && status === 'completed';

    return {
      valid: true,
      transactionId: mpesaReceiptNumber || checkoutRequestId,
      status: isSuccess ? 'SUCCESSFUL' : 'FAILED',
      amount: amount || 0,
      message: resultDesc || (isSuccess ? 'Payment successful' : 'Payment failed'),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      providerData: {
        merchant_request_id: merchantRequestId,
        checkout_request_id: checkoutRequestId,
        result_code: resultCode,
        result_desc: resultDesc,
        mpesa_receipt_number: mpesaReceiptNumber,
        failure_reason: payload.failure_reason,
        status: status,
      },
    };
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'TUMA';
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return !!(this.email && this.apiKey && this.callbackUrl);
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): { email: boolean; apiKey: boolean; callbackUrl: boolean } {
    return {
      email: !!this.email,
      apiKey: !!this.apiKey,
      callbackUrl: !!this.callbackUrl,
    };
  }
}
