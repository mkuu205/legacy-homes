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
import { logger } from '@/utils/logger';

export class TumaProvider implements PaymentProvider {
  private apiKey: string;
  private email: string;
  private callbackUrl: string;
  private baseUrl = 'https://api.tuma.co.ke';

  constructor() {
    this.apiKey = process.env.TUMA_API_KEY || '';
    this.email = process.env.TUMA_EMAIL || '';
    this.callbackUrl = process.env.TUMA_CALLBACK_URL || '';
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Tuma provider not configured',
        };
      }

      const payload = {
        email: this.email,
        api_key: this.apiKey,
        phone_number: request.phoneNumber,
        amount: request.amount,
        reference: request.externalReference,
        callback_url: this.callbackUrl,
      };

      const response = await axios.post(`${this.baseUrl}/api/v1/stk-push`, payload);

      if (response.data.success) {
        return {
          success: true,
          transactionId: response.data.data.transaction_id,
          message: response.data.message,
        };
      }

      return {
        success: false,
        error: response.data.message || 'Failed to initiate payment',
      };
    } catch (error) {
      logger.error('Tuma payment initiation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyPaymentStatus(request: PaymentStatusRequest): Promise<PaymentStatusResponse> {
    try {
      if (!request.transactionId) {
        return {
          status: 'FAILED',
          message: 'Transaction ID required',
        };
      }

      const payload = {
        email: this.email,
        api_key: this.apiKey,
        transaction_id: request.transactionId,
      };

      const response = await axios.post(`${this.baseUrl}/api/v1/verify-transaction`, payload);

      if (response.data.success) {
        const data = response.data.data;
        return {
          status: data.status === 'SUCCESS' ? 'SUCCESSFUL' : 'FAILED',
          transactionId: data.transaction_id,
          amount: data.amount,
          timestamp: new Date(data.created_at),
          providerData: data,
        };
      }

      return {
        status: 'FAILED',
        message: response.data.message || 'Verification failed',
      };
    } catch (error) {
      logger.error('Tuma payment verification error:', error);
      return {
        status: 'FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyCallback(request: CallbackVerificationRequest): Promise<CallbackVerificationResponse> {
    try {
      const payload = request.payload;

      // Verify signature if provided
      if (request.signature && payload.transaction_id) {
        const expectedSignature = crypto
          .createHash('sha256')
          .update(`${payload.transaction_id}${this.apiKey}`)
          .digest('hex');

        if (request.signature !== expectedSignature) {
          return {
            valid: false,
            message: 'Invalid signature',
          };
        }
      }

      // Verify with provider
      const verification = await this.verifyPaymentStatus({
        transactionId: payload.transaction_id,
      });

      return {
        valid: verification.status === 'SUCCESSFUL',
        transactionId: payload.transaction_id,
        status: verification.status,
        amount: verification.amount,
        message: verification.message,
      };
    } catch (error) {
      logger.error('Tuma callback verification error:', error);
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getProviderName(): string {
    return 'TUMA';
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.email && this.callbackUrl);
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const payload = {
        email: this.email,
        api_key: this.apiKey,
      };

      const response = await axios.post(`${this.baseUrl}/api/v1/validate-credentials`, payload);
      return response.data.success === true;
    } catch (error) {
      logger.error('Tuma credential validation error:', error);
      return false;
    }
  }
}
