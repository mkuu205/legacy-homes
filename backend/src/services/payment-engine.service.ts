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

      // 2. Verify callback authenticity
      const verification = await paymentProvider.verifyCallback({
        payload,
        signature,
        headers,
      });

      if (!verification.valid) {
        logger.warn(`[CALLBACK] Invalid callback signature from ${provider}`, { auditId, payload });

        await prisma.callbackAudit.update({
          where: { id: auditId },
          data: {
            processed: true,
            processingResult: JSON.stringify({ valid: false, reason: 'Invalid signature' }),
          },
        });

        return {
          success: false,
          message: 'Invalid callback',
        };
      }

      logger.info(`[CALLBACK] Callback verified from ${provider}`, { auditId, transactionId: verification.transactionId });

      // 3. Find payment by transaction ID or order ID
      const payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { providerTransactionId: verification.transactionId },
            { providerOrderId: verification.transactionId },
            { id: verification.transactionId }, // Support payment ID as transaction ID
          ].filter(Boolean),
        },
        include: { bill: true, resident: true },
      });

      if (!payment) {
        logger.warn(`[CALLBACK] Payment not found for transaction ${verification.transactionId}`, { auditId });

        await prisma.callbackAudit.update({
          where: { id: auditId },
          data: {
            processed: true,
            processingResult: JSON.stringify({ found: false, transactionId: verification.transactionId }),
          },
        });

        return {
          success: false,
          message: 'Payment not found',
        };
      }

      logger.info(`[CALLBACK] Found payment ${payment.id} for transaction ${verification.transactionId}`, { auditId });

      // 4. Check for duplicate callback (idempotency)
      if (payment.status === PaymentStatus.SUCCESSFUL) {
        logger.info(`[CALLBACK] Payment already processed (idempotent)`, { paymentId: payment.id, auditId });

        await prisma.callbackAudit.update({
          where: { id: auditId },
          data: {
            processed: true,
            paymentId: payment.id,
            processingResult: JSON.stringify({ duplicate: true, status: 'SUCCESSFUL' }),
          },
        });

        return {
          success: true,
          message: 'Payment already processed',
          paymentId: payment.id,
          status: PaymentStatus.SUCCESSFUL,
        };
      }

      // 5. Verify payment status with provider (never trust callback alone)
      const statusVerification = await this.verifyPaymentStatus(payment.id);

      logger.info(`[CALLBACK] Payment status verified: ${statusVerification.status}`, { paymentId: payment.id, auditId });

      // 6. If payment is successful, update bill and create receipt
      if (statusVerification.verified) {
        // Update payment with confirmation code and account if available from providerData
        const providerData = statusVerification.status === 'SUCCESSFUL' ? (statusVerification as any).providerData : null;
        if (providerData) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              confirmationCode: providerData.confirmation_code || payment.confirmationCode,
              maskedAccount: providerData.payment_account || payment.maskedAccount,
              paymentMethod: providerData.payment_method === 'MPESA' ? 'MPESA_STK_PUSH' : (providerData.payment_method === 'VISA' ? 'VISA' : (providerData.payment_method === 'MASTERCARD' ? 'MASTERCARD' : payment.paymentMethod)),
            },
          });
        }

        // Update bill status
        const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
        const newBillStatus = (updatedPayment?.amount || payment.amount) >= payment.bill.balance ? 'PAID' : 'PARTIAL';
        await prisma.bill.update({
          where: { id: payment.billId },
          data: {
            status: newBillStatus,
            amountPaid: { increment: payment.amount },
            balance: { decrement: payment.amount },
            paidAt: new Date(),
          },
        });

        logger.info(`[CALLBACK] Bill updated: ${payment.billId} status=${newBillStatus}`, { auditId });

        // Generate receipt
        try {
          const receipt = await receiptService.generateReceipt(payment.id);
          logger.info(`[CALLBACK] Receipt generated: ${receipt.id}`, { paymentId: payment.id, auditId });
        } catch (receiptError) {
          logger.error(`[CALLBACK] Failed to generate receipt: ${receiptError}`, { paymentId: payment.id, auditId });
        }

        // Send notification
        try {
          await notificationService.sendPaymentSuccessNotification(
            payment.residentId,
            payment.amount,
            updatedPayment?.confirmationCode || payment.confirmationCode || undefined
          );
          logger.info(`[CALLBACK] Notification sent to resident`, { residentId: payment.residentId, auditId });
        } catch (notificationError) {
          logger.error(`[CALLBACK] Failed to send notification: ${notificationError}`, { residentId: payment.residentId, auditId });
        }
      }

      // 7. Update callback audit
      await prisma.callbackAudit.update({
        where: { id: auditId },
        data: {
          processed: true,
          paymentId: payment.id,
          processingResult: JSON.stringify(statusVerification),
        },
      });

      logger.info(`[CALLBACK] Callback processed successfully`, { paymentId: payment.id, auditId });

      return {
        success: true,
        paymentId: payment.id,
        status: statusVerification.status,
        message: statusVerification.message,
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
