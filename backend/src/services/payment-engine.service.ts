import prisma from '../config/prisma';
import { PaymentProvider } from '../providers/payment-provider.interface';
import { TumaProvider } from '../providers/tuma.provider';
import { PesapalProvider } from '../providers/pesapal.provider';
import { logger } from '../utils/logger';
import { PaymentProviderType, PaymentStatus, PaymentMethodType } from '@prisma/client';
import { notificationService } from './notification.service';
import { receiptService } from './receipt.service';

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

      if (bill.residentId !== residentId) {
        throw new Error('Unauthorized: Bill does not belong to this resident');
      }

      if (bill.status === 'PAID') {
        throw new Error('Bill is already paid');
      }

      if (amount > bill.balance) {
        throw new Error(`Amount exceeds outstanding balance of KES ${bill.balance}`);
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

      logger.info(`[PAYMENT] Created payment record: ${payment.id} for bill ${billId}`);

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
            providerMessage: result.error,
          },
        });

        logger.error(`[PAYMENT] Payment initiation failed: ${result.error}`);
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

      logger.info(`[PAYMENT] Payment initiated successfully: ${payment.id}`);

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

      // For Tuma, the callback is the source of truth, so we don't re-verify with the provider.
      // We return the current status of the payment from our database.
      if (payment.provider === 'TUMA') {
        return {
          status: payment.status,
          message: payment.providerMessage || 'Status from Tuma callback',
          verified: payment.status === PaymentStatus.SUCCESSFUL,
        };
      }

      // For other providers, proceed with verification (if applicable)
      const result = await provider.verifyPaymentStatus({
        transactionId: payment.providerTransactionId || undefined,
        orderId: payment.providerOrderId || undefined,
      });

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
    let auditId: string | null = null;

    try {
      // 1. Audit every callback request immediately
      const audit = await prisma.callbackAudit.create({
        data: {
          provider,
          payload: payload as any,
          headers: headers as any,
          processed: false,
        },
      });
      auditId = audit.id;

      logger.info(`[CALLBACK] Received callback from ${provider}`, { auditId });

      const paymentProvider = this.getProvider(provider);
      if (!paymentProvider) {
        throw new Error(`Provider ${provider} not configured`);
      }

      // 2. Process callback payload directly as the authoritative source
      // The Tuma API does not provide a verification endpoint, so the callback is the source of truth.

      const { status, result_code, merchant_request_id, checkout_request_id, mpesa_receipt_number, amount, result_desc, failure_reason } = payload;

      // 3. Check for idempotency first
      const existingPayment = await prisma.payment.findFirst({
        where: {
          OR: [
            { providerOrderId: checkout_request_id },
            { confirmationCode: mpesa_receipt_number },
          ],
        },
      });

      if (existingPayment && existingPayment.status === PaymentStatus.SUCCESSFUL) {
        logger.info(`[TUMA CALLBACK] Payment already processed (idempotent) for checkout_request_id: ${checkout_request_id} or mpesa_receipt_number: ${mpesa_receipt_number}`, { auditId });
        await prisma.callbackAudit.update({
          where: { id: auditId },
          data: {
            processed: true,
            paymentId: existingPayment.id,
            processingResult: JSON.stringify({ duplicate: true, status: 'SUCCESSFUL' }),
          },
        });
        return {
          success: true,
          message: 'Payment already processed',
          paymentId: existingPayment.id,
          status: PaymentStatus.SUCCESSFUL,
        };
      }

      // 4. Find the payment record using merchant_request_id (from initiatePayment)
      const payment = await prisma.payment.findFirst({
        where: {
          providerOrderId: merchant_request_id, // This is the merchant_request_id from initiatePayment
        },
        include: { bill: true, resident: true },
      });

      if (!payment) {
        logger.warn(`[TUMA CALLBACK] Payment not found for merchant_request_id: ${merchant_request_id}`, { auditId, payload });
        await prisma.callbackAudit.update({
          where: { id: auditId },
          data: {
            processed: true,
            processingResult: JSON.stringify({ found: false, merchant_request_id }),
          },
        });
        return {
          success: false,
          message: 'Payment not found for this request',
        };
      }

      let paymentStatus: PaymentStatus;
      let logMessage: string;

      if (status === 'completed' && result_code === 0) {
        paymentStatus = PaymentStatus.SUCCESSFUL;
        logMessage = '[TUMA CALLBACK] Payment completed successfully';

        // Update payment record
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: paymentStatus,
            providerStatus: status,
            providerMessage: result_desc || 'Payment successful',
            providerTransactionId: checkout_request_id, // Tuma's checkout_request_id is the transaction ID
            confirmationCode: mpesa_receipt_number,
            providerPayload: payload as any,
            verificationTimestamp: new Date(),
            verifiedBy: 'TUMA_CALLBACK',
          },
        });

        // Update bill
        const updatedAmountPaid = payment.bill.amountPaid + (amount || 0);
        const newBalance = payment.bill.totalAmount - updatedAmountPaid;
        const newBillStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

        await prisma.bill.update({
          where: { id: payment.billId },
          data: {
            status: newBillStatus,
            amountPaid: updatedAmountPaid,
            balance: newBalance,
            paidAt: new Date(),
          },
        });

        logger.info(`[TUMA CALLBACK] Bill ${payment.billId} updated to status: ${newBillStatus}`, { auditId, paymentId: payment.id });

        // Generate receipt
        try {
          const receipt = await receiptService.generateReceipt(payment.id);
          logger.info(`[TUMA CALLBACK] Receipt generated: ${receipt.id}`, { paymentId: payment.id, auditId });
        } catch (receiptError) {
          logger.error(`[TUMA CALLBACK] Failed to generate receipt: ${receiptError}`, { paymentId: payment.id, auditId });
        }

        // Send notification
        try {
          await notificationService.sendPaymentSuccessNotification(
            payment.residentId,
            amount || payment.amount,
            mpesa_receipt_number || undefined
          );
          logger.info(`[TUMA CALLBACK] Notification sent to resident ${payment.residentId}`, { auditId, paymentId: payment.id });
        } catch (notificationError) {
          logger.error(`[TUMA CALLBACK] Failed to send notification: ${notificationError}`, { residentId: payment.residentId, auditId });
        }

        // TODO: Broadcast payment update through Socket.IO (not implemented yet)
        // For now, just log that it needs to be done.
        logger.info(`[TUMA CALLBACK] Socket.IO broadcast for payment ${payment.id} is pending implementation.`, { auditId });

      } else {
        paymentStatus = PaymentStatus.FAILED;
        logMessage = '[TUMA CALLBACK] Payment failed';

        // Update payment record as failed
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: paymentStatus,
            providerStatus: status,
            providerMessage: result_desc || failure_reason || 'Payment failed',
            failureReason: result_desc || failure_reason || 'Provider reported failure',
            providerPayload: payload as any,
            verificationTimestamp: new Date(),
            verifiedBy: 'TUMA_CALLBACK',
          },
        });

        logger.warn(`[TUMA CALLBACK] Payment ${payment.id} marked as FAILED. Reason: ${result_desc || failure_reason}`, { auditId, paymentId: payment.id });
      }

      // 5. Update callback audit with final processing result
      await prisma.callbackAudit.update({
        where: { id: auditId },
        data: {
          processed: true,
          paymentId: payment.id,
          processingResult: JSON.stringify({ status: paymentStatus, message: logMessage, payload }),
        },
      });

      logger.info(`${logMessage} for payment ${payment.id}`, { auditId });

      return {
        success: paymentStatus === PaymentStatus.SUCCESSFUL,
        paymentId: payment.id,
        status: paymentStatus,
        message: logMessage,
      };
    } catch (error) {
      logger.error('Callback handling error:', error);

      if (auditId) {
        await prisma.callbackAudit.update({
          where: { id: auditId },
          data: {
            processed: true,
            processingResult: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        }).catch((e) => logger.error('Failed to update audit:', e));
      }

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

  /**
   * Check system health
   */
  async checkSystemHealth() {
    const start = Date.now();
    const health: Record<string, any> = {
      timestamp: new Date(),
      serverTime: new Date().toISOString(),
      timezone: process.env.TZ || 'Africa/Nairobi',
      services: {},
    };

    // 1. Backend API
    health.services.backendApi = {
      status: 'ONLINE',
      message: 'Backend API is running',
      responseTime: `${Date.now() - start}ms`
    };

    // 2. Database
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.services.database = { 
        status: 'ONLINE', 
        message: 'Database connection successful',
        responseTime: `${Date.now() - dbStart}ms`
      };
    } catch (error) {
      health.services.database = { 
        status: 'OFFLINE', 
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: `${Date.now() - dbStart}ms`
      };
    }

    // 3. Tuma API
    const tumaStart = Date.now();
    try {
      const tumaProvider = this.getProvider('TUMA');
      if (tumaProvider) {
        const isValid = await tumaProvider.validateCredentials();
        health.services.tumaApi = {
          status: isValid ? 'ONLINE' : 'OFFLINE',
          message: isValid ? 'Tuma API credentials valid' : 'Tuma API credentials invalid',
          responseTime: `${Date.now() - tumaStart}ms`
        };
      } else {
        health.services.tumaApi = { status: 'OFFLINE', message: 'Tuma provider not initialized' };
      }
    } catch (error) {
      health.services.tumaApi = { status: 'OFFLINE', message: error instanceof Error ? error.message : 'Unknown error' };
    }

    // 4. Pesapal API
    const pesapalStart = Date.now();
    try {
      const pesapalProvider = this.getProvider('PESAPAL');
      if (pesapalProvider) {
        const isValid = await pesapalProvider.validateCredentials();
        health.services.pesapalApi = {
          status: isValid ? 'ONLINE' : 'OFFLINE',
          message: isValid ? 'Pesapal API credentials valid' : 'Pesapal API credentials invalid',
          responseTime: `${Date.now() - pesapalStart}ms`
        };
      } else {
        health.services.pesapalApi = { status: 'OFFLINE', message: 'Pesapal provider not initialized' };
      }
    } catch (error) {
      health.services.pesapalApi = { status: 'OFFLINE', message: error instanceof Error ? error.message : 'Unknown error' };
    }

    // 5. Payment Callback Endpoint
    try {
      const lastCallback = await prisma.auditLog.findFirst({
        where: { action: { contains: 'CALLBACK' } },
        orderBy: { createdAt: 'desc' }
      });
      health.services.callbackEndpoint = {
        status: 'ONLINE',
        message: 'https://legacy-homes.onrender.com/api/payments/callback',
        lastCallbackReceived: lastCallback ? lastCallback.createdAt : 'Never'
      };
    } catch (error) {
      health.services.callbackEndpoint = { status: 'WARNING', message: 'Could not fetch last callback info' };
    }

    // 6. Email Service (SMTP)
    // Based on email.service.ts, it's currently a stub logging to console
    health.services.emailService = {
      status: 'WARNING',
      message: 'Email service is in LOG-ONLY mode (No SMTP configured)',
    };

    // 7. Environment Variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'TUMA_API_URL',
      'TUMA_AUTH_URL',
      'TUMA_BUSINESS_EMAIL',
      'TUMA_API_KEY',
      'TUMA_CALLBACK_URL',
      'PESAPAL_API_URL',
      'PESAPAL_CONSUMER_KEY',
      'PESAPAL_CONSUMER_SECRET',
    ];

    const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);
    health.services.environmentVariables = {
      status: missingEnvVars.length === 0 ? 'ONLINE' : 'WARNING',
      message: missingEnvVars.length === 0 ? 'All critical environment variables configured' : `Missing: ${missingEnvVars.join(', ')}`,
      missing: missingEnvVars,
      configSummary: {
        tumaConfigured: !!process.env.TUMA_API_KEY,
        pesapalConfigured: !!process.env.PESAPAL_CONSUMER_KEY,
        databaseConfigured: !!process.env.DATABASE_URL
      }
    };

    return health;
  }
}
