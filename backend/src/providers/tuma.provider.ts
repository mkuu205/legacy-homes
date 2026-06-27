import axios from 'axios';
import crypto from 'crypto';
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

export class TumaProvider implements PaymentProvider {
  private apiUrl: string;
  private authUrl: string;
  private businessEmail: string;
  private apiKey: string;
  private callbackUrl: string;
  private cachedToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    this.apiUrl = process.env.TUMA_API_URL || 'https://api.tuma.co.ke';
    this.authUrl = process.env.TUMA_AUTH_URL || 'https://api.tuma.co.ke/auth/token';
    this.businessEmail = process.env.TUMA_BUSINESS_EMAIL || '';
    this.apiKey = process.env.TUMA_API_KEY || '';
    this.callbackUrl = process.env.TUMA_CALLBACK_URL || '';
  }

  /**
   * Get authentication token from Tuma
   */
  private async getAuthToken(): Promise<string> {
    if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    try {
      logger.info('[TUMA] Requesting authentication token');
      const response = await axios.post(
        this.authUrl,
        {
          email: this.businessEmail,
          api_key: this.apiKey,
        },
        { timeout: 10000 }
      );

      if (response.data.success && response.data.data?.token) {
        this.cachedToken = response.data.data.token;
        // Cache token for 50 minutes (expires in 1 hour)
        this.tokenExpiry = Date.now() + 50 * 60 * 1000;
        logger.info('[TUMA] Authentication token obtained successfully');
        return this.cachedToken;
      }

      throw new Error(response.data.message || 'Authentication failed');
    } catch (error: any) {
      logger.error('[TUMA] Authentication error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Normalize phone number to 254XXXXXXXXX format
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new Error('Phone number is required');
    }

    let phone = phoneNumber.trim().replace(/\s+/g, '');

    if (phone.startsWith('+')) {
      phone = phone.slice(1);
    }

    if (phone.startsWith('0')) {
      phone = `254${phone.slice(1)}`;
    }

    if (phone.startsWith('7') && phone.length === 9) {
      phone = `254${phone}`;
    }

    if (!/^254\d{9}$/.test(phone)) {
      throw new Error('Invalid phone number format. Expected 254XXXXXXXXX or 07XXXXXXXX');
    }

    return phone;
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      if (!this.isConfigured()) {
        const error = 'Tuma provider not configured. Check environment variables: TUMA_API_URL, TUMA_AUTH_URL, TUMA_BUSINESS_EMAIL, TUMA_API_KEY, TUMA_CALLBACK_URL';
        logger.error('[TUMA] Configuration error:', error);
        return {
          success: false,
          error,
        };
      }

      // Validate request
      if (!request.phoneNumber) {
        return {
          success: false,
          error: 'Phone number is required',
        };
      }

      if (!request.amount || request.amount <= 0) {
        return {
          success: false,
          error: 'Valid payment amount is required',
        };
      }

      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(request.phoneNumber);

      // Get authentication token
      const token = await this.getAuthToken();

      // Prepare STK Push payload
      const payload = {
        amount: request.amount,
        phone: normalizedPhone,
        description: `Water Bill Payment - ${request.billId}`,
        callback_url: this.callbackUrl,
      };

      logger.info('[TUMA] Initiating STK Push:', {
        amount: request.amount,
        phone: normalizedPhone,
        billId: request.billId,
        callbackUrl: this.callbackUrl,
      });

      // Send STK Push request
      const response = await axios.post(
        `${this.apiUrl}/payment/stk-push`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      logger.info('[TUMA] STK Push response:', {
        success: response.data.success,
        message: response.data.message,
      });

      if (response.data.success && response.data.data) {
        const { merchant_request_id, checkout_request_id } = response.data.data;

        return {
          success: true,
          transactionId: checkout_request_id,
          orderId: merchant_request_id,
          message: response.data.message || 'STK Push initiated successfully',
        };
      }

      const errorMessage = response.data.message || 'STK Push initiation failed';
      logger.error('[TUMA] STK Push failed:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      logger.error('[TUMA] Payment initiation error:', {
        status: error.response?.status,
        message: errorMessage,
        data: error.response?.data,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // The Tuma API does not provide a verification endpoint. The callback is the source of truth.
  // Therefore, these methods are removed as per the updated requirements.

  // async verifyPaymentStatus(request: PaymentStatusRequest): Promise<PaymentStatusResponse> {
  //   // Implementation removed
  // }

  // async verifyCallback(request: CallbackVerificationRequest): Promise<CallbackVerificationResponse> {
  //   // Implementation removed
  // }

  getProviderName(): string {
    return 'TUMA';
  }

  isConfigured(): boolean {
    const configured = !!(this.apiUrl && this.authUrl && this.businessEmail && this.apiKey && this.callbackUrl);
    if (!configured) {
      logger.warn('[TUMA] Provider not fully configured:', {
        hasApiUrl: !!this.apiUrl,
        hasAuthUrl: !!this.authUrl,
        hasBusinessEmail: !!this.businessEmail,
        hasApiKey: !!this.apiKey,
        hasCallbackUrl: !!this.callbackUrl,
      });
    }
    return configured;
  }

  async validateCredentials(): Promise<boolean> {
    try {
      logger.info('[TUMA] Validating credentials');
      const token = await this.getAuthToken();
      logger.info('[TUMA] Credentials validated successfully');
      return true;
    } catch (error: any) {
      logger.error('[TUMA] Credential validation failed:', error.message);
      return false;
    }
  }
}
