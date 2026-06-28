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

      logger.debug('[TUMA] Auth response status:', response.status);
      logger.debug('[TUMA] Auth response data keys:', Object.keys(response.data || {}));

      // Check for token in response
      if (response.data?.token) {
        this.token = response.data.token;
        this.tokenExpiry = Date.now() + (response.data.expires_in || 86400) * 1000;
        logger.info(`[TUMA] Access token received. Expires in: ${response.data.expires_in || 86400}s`);
        return this.token;
      }

      // Some APIs might return token in a nested structure
      if (response.data?.data?.token) {
        this.token = response.data.data.token;
        this.tokenExpiry = Date.now() + (response.data.data.expires_in || 86400) * 1000;
        logger.info(`[TUMA] Access token received from nested data.`);
        return this.token;
      }

      throw new Error(response.data?.message || 'No token in response from Tuma');
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

      // For successful HTTP status codes, return the data
      if (response.status === 200 || response.status === 201) {
        logger.debug(`[TUMA] Response data keys:`, Object.keys(response.data || {}));
        return response.data as T;
      }

      throw new Error(response.data?.message || `HTTP ${response.status}: Request failed`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const errorCode = axiosError.code;

      // Log error details for debugging
      if (axiosError.response?.data) {
        logger.error('[TUMA] Error response data:', JSON.stringify(axiosError.response.data));
      }

      const isRetryable = this.isRetryableError(axiosError);

      // Handle 401 - auto-refresh token
      if (status === 401 && retryCount === 0) {
        logger.warn('[TUMA] Received 401 - refreshing token and retrying');
        this.token = null;
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

      let errorMessage = axiosError.message;
      if (axiosError.response?.data) {
        const responseData = axiosError.response.data as any;
        errorMessage = responseData.message || responseData.error || responseData.result_desc || errorMessage;
      }

      logger.error(`[TUMA] ${method} ${endpoint} failed: ${errorCode || status} - ${errorMessage}`);
      throw new Error(errorMessage);
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

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (!cleaned.startsWith('254')) {
      if (cleaned.length === 9) {
        cleaned = '254' + cleaned;
      } else if (cleaned.length === 10) {
        cleaned = '254' + cleaned.substring(1);
      }
    }
    
    return cleaned;
  }

  private validateRequest(request: PaymentInitiationRequest): void {
    if (!request.phoneNumber) {
      throw new Error('Phone number is required for STK push');
    }

    const formattedPhone = this.formatPhoneNumber(request.phoneNumber);
    
    if (!formattedPhone.startsWith('254') || formattedPhone.length !== 12) {
      throw new Error(`Invalid phone number format. Expected 254XXXXXXXXX (12 digits), got: ${formattedPhone}`);
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

      this.validateRequest(request);
      const formattedPhone = this.formatPhoneNumber(request.phoneNumber!);

      const payload = {
        amount: Number(request.amount),
        phone: formattedPhone,
        callback_url: this.callbackUrl,
        description: request.description || `Payment - ${request.externalReference || request.billId}`,
      };

      logger.info(`[TUMA] Initiating STK push. Phone: ${payload.phone}, Amount: ${payload.amount}`);

      const response = await this.makeRequest<any>('POST', '/payment/stk-push', payload);

      logger.info(`[TUMA] STK Push response received:`, { 
        success: response.success,
        message: response.message,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });

      // Check for success indicators in the response
      const isSuccess = response.success === true || 
                        response.status === 'success' ||
                        response.data?.merchant_request_id ||
                        response.data?.checkout_request_id;

      if (isSuccess && (response.data?.merchant_request_id || response.data?.checkout_request_id)) {
        const orderId = response.data.merchant_request_id || response.data.checkout_request_id;
        logger.info(`[TUMA] STK Push initiated successfully. Order ID: ${orderId}`);

        return {
          success: true,
          orderId: orderId,
          checkoutUrl: null,
          message: response.message || 'STK Push sent successfully',
          providerData: {
            merchant_request_id: response.data.merchant_request_id,
            checkout_request_id: response.data.checkout_request_id,
            customer_message: response.data.customer_message || response.message,
          },
        };
      }

      // If we got a success flag but no order ID
      if (response.success === true) {
        logger.warn(`[TUMA] Response indicates success but no order ID found`);
        return {
          success: true,
          orderId: `tuma-${Date.now()}`,
          checkoutUrl: null,
          message: response.message || 'STK Push initiated',
          providerData: response.data || response,
        };
      }

      const errorMsg = response.message || response.error || 'Failed to initiate STK push';
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
