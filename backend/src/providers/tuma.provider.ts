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
    this.email = process.env.TUMA_BUSINESS_EMAIL || process.env.TUMA_EMAIL || '';
    this.apiKey = process.env.TUMA_API_KEY || '';
    this.baseUrl = process.env.TUMA_API_URL || 'https://api.tuma.co.ke';
    this.callbackUrl = process.env.PAYMENT_CALLBACK_URL || process.env.TUMA_CALLBACK_URL || '';

    const isConfigured = this.isConfigured();
    logger.info(`[TUMA] Provider initialized. Configured: ${isConfigured}`);
    
    if (!isConfigured) {
      const missing = [];
      if (!this.email) missing.push('TUMA_BUSINESS_EMAIL');
      if (!this.apiKey) missing.push('TUMA_API_KEY');
      if (!this.callbackUrl) missing.push('PAYMENT_CALLBACK_URL');
      logger.warn(`[TUMA] Missing: ${missing.join(', ')}`);
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && this.tokenExpiry > Date.now() + 30000) {
      return this.token;
    }

    try {
      logger.info('[TUMA] Requesting new access token');
      
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

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
    retryCount: number = 0
  ): Promise<T> {
    const startTime = Date.now();
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const token = await this.getAccessToken();

      const response = await axios({
        method: method as any,
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

      const isRetryable = this.isRetryableError(axiosError);

      if (status === 401 && retryCount === 0) {
        logger.warn('[TUMA] Received 401 - refreshing token and retrying');
        this.token = null;
        return this.makeRequest<T>(method, endpoint, data, retryCount + 1);
      }

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

  private isRetryableError(error: AxiosError): boolean {
    const status = error.response?.status;
    const code = error.code;
    if (status && RETRYABLE_STATUSES.has(status)) return true;
    if (code && RETRYABLE_ERRORS.has(code)) return true;
    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) return true;
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format phone number to Kenyan format (254XXXXXXXXX)
   * Handles various input formats:
   * - 0712345678 -> 254712345678
   * - +254712345678 -> 254712345678
   * - 254712345678 -> 254712345678
   * - 0712345678 -> 254712345678
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 0, remove the 0 and add 254
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    // If it starts with 254, keep as is
    else if (cleaned.startsWith('254')) {
      // Already in correct format
    }
    // If it doesn't start with 254 or 0, assume it's a local number without prefix
    else if (cleaned.length === 9) {
      cleaned = '254' + cleaned;
    }
    // If it's 10 digits and doesn't start with 254, it might be 07XXXXXXXX
    else if (cleaned.length === 10 && !cleaned.startsWith('254')) {
      cleaned = '254' + cleaned.substring(1);
    }
    
    return cleaned;
  }

  private validateRequest(request: PaymentInitiationRequest): void {
    if (!request.phoneNumber) {
      throw new Error('Phone number is required for STK push');
    }

    // Format the phone number first
    const formattedPhone = this.formatPhoneNumber(request.phoneNumber);
    
    // Validate the formatted phone number
    if (!formattedPhone.startsWith('254') || formattedPhone.length !== 12) {
      throw new Error(`Invalid phone number format. Expected 254XXXXXXXXX (12 digits), got: ${formattedPhone} (${formattedPhone.length} digits)`);
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
          error: 'TUMA provider not configured',
        };
      }

      // Validate and format phone number
      this.validateRequest(request);
      const formattedPhone = this.formatPhoneNumber(request.phoneNumber!);

      const payload = {
        amount: Number(request.amount),
        phone: formattedPhone,
        callback_url: this.callbackUrl,
        description: request.description || `Payment - ${request.externalReference || request.billId}`,
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
      }>('POST', '/payment/stk-push', payload);

      if (response.success && response.data) {
        const orderId = response.data.merchant_request_id || response.data.checkout_request_id;
        logger.info(`[TUMA] STK Push initiated. Order ID: ${orderId}`);

        return {
          success: true,
          orderId: orderId,
          checkoutUrl: null,
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

  async verifyPaymentStatus(request: PaymentStatusRequest): Promise<PaymentStatusResponse> {
    logger.info(`[TUMA] Status check requested for ${request.orderId} - using callback data only`);
    
    return {
      status: 'PENDING',
      message: 'TUMA status is delivered via callback only',
      orderId: request.orderId,
    };
  }

  async verifyCallback(request: CallbackVerificationRequest): Promise<CallbackVerificationResponse> {
    const payload = request.payload;

    const merchantRequestId = payload.merchant_request_id;
    const checkoutRequestId = payload.checkout_request_id;
    const resultCode = payload.result_code;
    const resultDesc = payload.result_desc;
    const mpesaReceiptNumber = payload.mpesa_receipt_number;
    const amount = payload.amount;
    const timestamp = payload.timestamp;
    const status = payload.status;

    logger.info(`[TUMA] Callback received. Merchant: ${merchantRequestId}, Checkout: ${checkoutRequestId}`);

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

  getProviderName(): string {
    return 'TUMA';
  }

  isConfigured(): boolean {
    return !!(this.email && this.apiKey && this.callbackUrl);
  }

  getConfigStatus(): { email: boolean; apiKey: boolean; callbackUrl: boolean } {
    return {
      email: !!this.email,
      apiKey: !!this.apiKey,
      callbackUrl: !!this.callbackUrl,
    };
  }
}
