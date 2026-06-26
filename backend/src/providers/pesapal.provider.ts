import axios from 'axios';
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

export class PesapalProvider implements PaymentProvider {
  private consumerKey: string;
  private consumerSecret: string;
  private ipnId: string;
  private callbackUrl: string;
  private environment: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.consumerKey = process.env.PESAPAL_CONSUMER_KEY || '';
    this.consumerSecret = process.env.PESAPAL_CONSUMER_SECRET || '';
    this.ipnId = process.env.PESAPAL_IPN_ID || '';
    this.callbackUrl = process.env.PESAPAL_CALLBACK_URL || '';
    this.environment = process.env.PESAPAL_ENVIRONMENT || 'sandbox';
    this.baseUrl = this.environment === 'production'
      ? 'https://api.pesapal.com/api/v3'
      : 'https://cybqa.pesapal.com/api/v3';
  }

  private async getAccessToken(): Promise<string> {
    try {
      // Return cached token if still valid
      if (this.accessToken && this.tokenExpiry > Date.now()) {
        return this.accessToken;
      }

      const response = await axios.post(`${this.baseUrl}/api/auth/request/token`, {
        consumer_key: this.consumerKey,
        consumer_secret: this.consumerSecret,
      });

      this.accessToken = response.data.token;
      this.tokenExpiry = Date.now() + (response.data.expiresIn * 1000);

      return this.accessToken;
    } catch (error) {
      logger.error('Pesapal token request error:', error);
      throw error;
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

      const token = await this.getAccessToken();

      const payload = {
        id: request.externalReference,
        currency: 'KES',
        amount: request.amount,
        description: `Bill Payment - ${request.billId}`,
        callback_url: this.callbackUrl,
        notification_id: this.ipnId,
        billing_address: {
          phone_number: request.phoneNumber,
          email_address: 'resident@legacyhomes.local',
        },
      };

      const response = await axios.post(`${this.baseUrl}/orders`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.success) {
        return {
          success: true,
          orderId: response.data.order_tracking_id,
          checkoutUrl: response.data.redirect_url,
          message: response.data.message,
        };
      }

      return {
        success: false,
        error: response.data.message || 'Failed to initiate payment',
      };
    } catch (error) {
      logger.error('Pesapal payment initiation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyPaymentStatus(request: PaymentStatusRequest): Promise<PaymentStatusResponse> {
    try {
      if (!request.orderId) {
        return {
          status: 'FAILED',
          message: 'Order ID required',
        };
      }

      const token = await this.getAccessToken();

      const response = await axios.get(`${this.baseUrl}/orders/${request.orderId}/transactions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const transaction = response.data.data[0];
        return {
          status: transaction.payment_status_description === 'Completed' ? 'SUCCESSFUL' : 'FAILED',
          transactionId: transaction.transaction_id,
          orderId: transaction.order_tracking_id,
          amount: transaction.amount,
          timestamp: new Date(transaction.created_date),
          providerData: transaction,
        };
      }

      return {
        status: 'FAILED',
        message: 'No transaction found',
      };
    } catch (error) {
      logger.error('Pesapal payment verification error:', error);
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
        orderId: payload.order_tracking_id,
      });

      return {
        valid: verification.status === 'SUCCESSFUL',
        transactionId: payload.transaction_id,
        status: verification.status,
        amount: verification.amount,
        message: verification.message,
      };
    } catch (error) {
      logger.error('Pesapal callback verification error:', error);
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getProviderName(): string {
    return 'PESAPAL';
  }

  isConfigured(): boolean {
    return !!(this.consumerKey && this.consumerSecret && this.ipnId && this.callbackUrl);
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch (error) {
      logger.error('Pesapal credential validation error:', error);
      return false;
    }
  }
}
