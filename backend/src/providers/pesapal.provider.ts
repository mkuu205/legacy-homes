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
      ? 'https://pay.pesapal.com/v3'
      : 'https://cybqa.pesapal.com/pesapalv3';
  }

  private async getAccessToken(): Promise<string> {
    try {
      // Return cached token if still valid (with 5 min buffer)
      if (this.accessToken && this.tokenExpiry > (Date.now() + 300000)) {
        return this.accessToken;
      }

      const response = await axios.post(`${this.baseUrl}/api/Auth/RequestToken`, {
        consumer_key: this.consumerKey,
        consumer_secret: this.consumerSecret,
      });

      if (response.data && response.data.token) {
        this.accessToken = response.data.token;
        // Parse expiryDate from response (e.g., "2023-08-15T10:00:00Z")
        this.tokenExpiry = new Date(response.data.expiryDate).getTime();
        return this.accessToken;
      }

      throw new Error('Invalid token response from Pesapal');
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
        description: 'Legacy Homes Water Bill',
        callback_url: this.callbackUrl,
        notification_id: this.ipnId,
        billing_address: {
          phone_number: request.phoneNumber,
          email_address: 'resident@legacyhomes.local', // Placeholder as required by API
          first_name: 'Resident', // Placeholder
        },
      };

      const response = await axios.post(`${this.baseUrl}/api/Transactions/SubmitOrderRequest`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data && response.data.order_tracking_id) {
        return {
          success: true,
          orderId: response.data.order_tracking_id,
          checkoutUrl: response.data.redirect_url,
          message: 'Order created successfully',
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
      const orderTrackingId = request.orderId;
      if (!orderTrackingId) {
        return {
          status: 'FAILED',
          message: 'Order Tracking ID required',
        };
      }

      const token = await this.getAccessToken();

      const response = await axios.get(`${this.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data;
      if (data) {
        // Only if payment_status_description == COMPLETED should the backend mark Payment SUCCESSFUL
        const isCompleted = data.payment_status_description === 'COMPLETED';
        
        return {
          status: isCompleted ? 'SUCCESSFUL' : (data.payment_status_description === 'FAILED' ? 'FAILED' : 'PENDING'),
          transactionId: data.confirmation_code,
          orderId: orderTrackingId,
          amount: data.amount,
          message: data.payment_status_description,
          timestamp: new Date(),
          providerData: data,
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
      const orderTrackingId = payload.OrderTrackingId || payload.order_tracking_id;

      if (!orderTrackingId) {
        return { valid: false, message: 'Missing OrderTrackingId' };
      }

      // Never trust callback. Immediately call GetTransactionStatus.
      const verification = await this.verifyPaymentStatus({
        orderId: orderTrackingId,
      });

      return {
        valid: true, // We trust the result of GetTransactionStatus
        transactionId: orderTrackingId,
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

  async cancelOrder(orderTrackingId: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const response = await axios.post(`${this.baseUrl}/api/Transactions/CancelOrder`, {
        order_tracking_id: orderTrackingId
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response.status === 200;
    } catch (error) {
      logger.error('Pesapal cancel order error:', error);
      return false;
    }
  }

  async registerIPN(url: string): Promise<string | null> {
    try {
      const token = await this.getAccessToken();
      const response = await axios.post(`${this.baseUrl}/api/URLSetup/RegisterIPN`, {
        url: url,
        ipn_notification_type: 'POST'
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data && response.data.ipn_id) {
        return response.data.ipn_id;
      }
      return null;
    } catch (error) {
      logger.error('Pesapal IPN registration error:', error);
      return null;
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
