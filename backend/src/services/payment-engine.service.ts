import { prisma } from '../config/prisma';
import { PaymentProvider } from '../providers/payment-provider.interface';
import { TumaProvider } from '../providers/tuma.provider';
import { PesapalProvider } from '../providers/pesapal.provider';
import { logger } from '../utils/logger';
import { PaymentProviderType, PaymentStatus, PaymentMethodType } from '@prisma/client';

export class PaymentEngineService {
  private providers: Map<string, PaymentProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    this.providers.set('TUMA', new TumaProvider());
    this.providers.set('PESAPAL', new PesapalProvider());
  }

  /**
   * Get a payment provider by type
   */
  getProvider(providerType: PaymentProviderType): PaymentProvider | null {
    const provider = this.providers.get(providerType);
    if (!provider) {
      logger.error(`Provider ${providerType} not found`);
      return null;
    }
    return provider;
  }

  /**
   * Get all configured providers
   */
  getConfiguredProviders(): PaymentProviderType[] {
    const configured: PaymentProviderType[] = [];
    for (const [name, provider] of this.providers) {
      if (provider.isConfigured()) {
        configured.push(name as PaymentProviderType);
      }
    }
    return configured;
  }

  /**
   * Initiate a payment through a specific provider
   */
  async initiatePayment(
    billId: string,
    residentId: string,
    provider: PaymentProviderType,
    paymentMethod: PaymentMethodType,
    phoneNumber: string,
    amount: number
  ) {
    try {
      // Get bill
      const bill = await prisma.bill.findUnique({
        where: { id: billId },
        include: { resident: true },
      });

      if (!bill) {
        throw new Error('Bill not found');
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          provider,
          paymentMethod,
          residentId,
          billId,
          phoneNumber,
          amount,
          status: PaymentStatus.PENDING,
          merchantReference: `${bill.billNumber}-${Date.now()}`,
        },
      });

      // Get provider
      const paymentProvider = this.getProvider(provider);
      if (!paymentProvider) {
        throw new Error(`Provider ${provider} not configured`);
      }

      // Initiate payment through provider
      const result = await paymentProvider.initiatePayment({
        amount,
        phoneNumber,
        billId,
        residentId,
        externalReference: payment.id,
      });

      if (!result.success) {
        // Update payment status to failed
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: result.error,
          },
        });

        throw new Error(result.error || 'Payment initiation failed');
      }

      // Update payment with provider data
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerTransactionId: result.transactionId,
          providerOrderId: result.orderId,
          providerPayload: result as any,
        },
      });

      return {
        success: true,
        paymentId: payment.id,
        transactionId: result.transactionId,
        orderId: result.orderId,
        checkoutUrl: result.checkoutUrl,
        message: result.message,
      };
    } catch (error) {
      logger.error('Payment initiation error:', error);
      throw error;
    }
  }

  /**
   * Verify payment status
   */
  async verifyPaymentStatus(paymentId: string): Promise<{
    status: PaymentStatus;
    message: string;
    verified: boolean;
  }> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      const provider = this.getProvider(payment.provider);
      if (!provider) {
        throw new Error(`Provider ${payment.provider} not configured`);
      }

      const result = await provider.verifyPaymentStatus({
        transactionId: payment.providerTransactionId || undefined,
        orderId: payment.providerOrderId || undefined,
      });

      // Map provider status to our status
      let status: PaymentStatus;
      switch (result.status) {
        case 'SUCCESSFUL':
          status = PaymentStatus.SUCCESSFUL;
          break;
        case 'FAILED':
          status = PaymentStatus.FAILED;
          break;
        case 'CANCELLED':
          status = PaymentStatus.CANCELLED;
          break;
        default:
          status = PaymentStatus.PENDING;
      }

      // Update payment
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status,
          providerStatus: result.status,
          providerMessage: result.message,
          verificationTimestamp: result.timestamp,
          verifiedBy: 'SYSTEM',
          providerPayload: result.providerData as any,
        },
      });

      return {
        status,
        message: result.message || 'Payment verified',
        verified: status === PaymentStatus.SUCCESSFUL,
      };
    } catch (error) {
      logger.error('Payment verification error:', error);
      throw error;
    }
  }

  /**
   * Handle provider callback
   */
  async handleCallback(
    provider: PaymentProviderType,
    payload: Record<string, any>,
    signature?: string,
    headers?: Record<string, any>
  ) {
    try {
      // Log callback for audit
      await prisma.callbackAudit.create({
        data: {
          provider,
          payload,
          headers,
          processed: false,
        },
      });

      const paymentProvider = this.getProvider(provider);
      if (!paymentProvider) {
        throw new Error(`Provider ${provider} not configured`);
      }

      // Verify callback authenticity
      const verification = await paymentProvider.verifyCallback({
        payload,
        signature,
        headers,
      });

      if (!verification.valid) {
        logger.warn('Invalid callback signature', { provider, payload });
        return {
          success: false,
          message: 'Invalid callback',
        };
      }

      // Find payment by transaction ID or order ID
      const payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { providerTransactionId: verification.transactionId },
            { providerOrderId: verification.transactionId },
          ],
        },
      });

      if (!payment) {
        logger.warn('Payment not found for callback', { provider, verification });
        return {
          success: false,
          message: 'Payment not found',
        };
      }

      // Verify payment status with provider (never trust callback alone)
      const statusVerification = await this.verifyPaymentStatus(payment.id);

      // Update callback audit
      await prisma.callbackAudit.update({
        where: { id: (await prisma.callbackAudit.findFirst({ where: { payload } }))?.id || '' },
        data: {
          processed: true,
          paymentId: payment.id,
          processingResult: JSON.stringify(statusVerification),
        },
      });

      return {
        success: true,
        paymentId: payment.id,
        status: statusVerification.status,
        message: statusVerification.message,
      };
    } catch (error) {
      logger.error('Callback handling error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get payment history for a resident
   */
  async getPaymentHistory(residentId: string, limit: number = 10) {
    try {
      const payments = await prisma.payment.findMany({
        where: { residentId },
        include: { bill: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return payments;
    } catch (error) {
      logger.error('Error fetching payment history:', error);
      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { bill: true, resident: true },
      });

      return payment;
    } catch (error) {
      logger.error('Error fetching payment:', error);
      throw error;
    }
  }
}
