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

export class PayHeroProvider implements PaymentProvider {
  private username: string;
  private password: string;
  private channelId: string;
  private provider: string;
  private callbackUrl: string;
  private baseUrl = 'https://api.payhero.co.ke';

  constructor() {
    this.username = process.env.PAYHERO_USERNAME || '';
    this.password = process.env.PAYHERO_PASSWORD || '';
    this.channelId = process.env.PAYHERO_CHANNEL_ID || '';
    this.provider = process.env.PAYHERO_PROVIDER || '';
    this.callbackUrl = process.env.PAYHERO_CALLBACK_URL || '';
  }

  private getAuthHeader(): string {
    const credentials = `${this.username}:${this.password}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'PayHero provider not configured',
        };
      }

      const payload = {
        channel_id: this.channelId,
        provider: this.provider,
        callback_url: this.callbackUrl,
        external_reference: request.externalReference,
        customer_name: request.phoneNumber,
        phone_number: request.phoneNumber,
        amount: request.amount,
      };

      const response = await axios.post(`${this.baseUrl}/api/v2/payments`, payload, {
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (response.data.success) {
        return {
          success: true,
          transactionId: response.data.data.transaction_id,
          orderId: response.data.data.order_id,
          message: response.data.message,
        };
      }

      return {
        success: false,
        error: response.data.message || 'Failed to initiate payment',
      };
    } catch (error) {
      logger.error('PayHero payment initiation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyPaymentStatus(request: PaymentStatusRequest): Promise<PaymentStatusResponse> {
    try {
      if (!request.transactionId && !request.orderId) {
        return {
          status: 'FAILED',
          message: 'Transaction ID or Order ID required',
        };
      }

      const endpoint = request.transactionId
        ? `${this.baseUrl}/api/v2/transactions/${request.transactionId}`
        : `${this.baseUrl}/api/v2/orders/${request.orderId}`;

      const response = await axios.get(endpoint, {
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });

      if (response.data.success) {
        const data = response.data.data;
        return {
          status: data.status === 'COMPLETED' ? 'SUCCESSFUL' : 'FAILED',
          transactionId: data.transaction_id,
          orderId: data.order_id,
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
      logger.error('PayHero payment verification error:', error);
      return {
        status: 'FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyCallback(request: CallbackVerificationRequest): Promise<CallbackVerificationResponse> {
    try {
      const payload = request.payload;

      // Verify with provider
      const verification = await this.verifyPaymentStatus({
        transactionId: payload.transaction_id,
        orderId: payload.order_id,
      });

      return {
        valid: verification.status === 'SUCCESSFUL',
        transactionId: payload.transaction_id,
        status: verification.status,
        amount: verification.amount,
        message: verification.message,
      };
    } catch (error) {
      logger.error('PayHero callback verification error:', error);
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getProviderName(): string {
    return 'PAYHERO';
  }

  isConfigured(): boolean {
    return !!(this.username && this.password && this.channelId && this.provider && this.callbackUrl);
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/validate`, {
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });
      return response.data.success === true;
    } catch (error) {
      logger.error('PayHero credential validation error:', error);
      return false;
    }
  }
}
