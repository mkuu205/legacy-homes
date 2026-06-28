import prisma from '../config/prisma';
import { PaymentProvider } from '../providers/payment-provider.interface';
import { PesapalProvider } from '../providers/pesapal.provider';
import { logger } from '../utils/logger';
import { PaymentProviderType, PaymentStatus, PaymentMethodType, BillStatus } from '@prisma/client';
import { notificationService } from './notification.service';
import { receiptService } from './receipt.service';
import { io } from '../server';

export class PaymentEngineService {
  private providers: Map<string, PaymentProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    this.providers.set('PESAPAL', new PesapalProvider());
  }

  /**
   * Get a payment provider by type
   */
  getProvider(providerType: PaymentProviderType): PaymentProvider | null {
    const provider = this.providers.get(providerType);
    if (!provider) {
      logger.error(`[PAYMENT ENGINE] Provider ${providerType} not found`);
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
    phoneNumber: string | undefined,
    amount: number
  ) {
    try {
      // 1. Get bill and resident details
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

      // 2. Resolve phone number
      let finalPhoneNumber = phoneNumber || bill.resident.phone;
      if (!finalPhoneNumber) {
        throw new Error('Phone number not found for resident.');
      }

      // 3. Create payment record
      // Map frontend 'CARD' to Prisma 'VISA' if necessary, or ensure it matches schema
      const normalizedMethod = paymentMethod === 'CARD' ? PaymentMethodType.VISA : paymentMethod;

      const payment = await prisma.payment.create({
        data: {
          provider,
          paymentMethod: normalizedMethod,
          residentId,
          billId,
          phoneNumber: finalPhoneNumber,
          amount,
          status: PaymentStatus.PENDING,
          merchantReference: `${bill.billNumber}-${Date.now()}`,
        },
      });

      logger.info(`[PAYMENT ENGINE] Created payment record: ${payment.id} for bill ${bill.billNumber}`);

      // 4. Get provider
      const paymentProvider = this.getProvider(provider);
      if (!paymentProvider) {
        throw new Error(`Provider ${provider} not configured`);
      }

      // 5. Initiate payment through provider
      const result = await paymentProvider.initiatePayment({
        amount,
        phoneNumber: finalPhoneNumber,
        billId,
        residentId,
        externalReference: payment.id,
        // @ts-ignore - Pass extra fields for Pesapal v3
        billNumber: bill.billNumber,
        residentName: bill.resident.fullName,
        residentEmail: bill.resident.email,
      });

      if (!result.success) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: result.error,
            providerMessage: result.error,
          },
        });

        logger.error(`[PAYMENT ENGINE] Payment initiation failed for ${payment.id}: ${result.error}`);
        throw new Error(result.error || 'Payment initiation failed');
      }

      // 6. Update payment with provider references
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerOrderId: result.orderId,
          providerPayload: result as any,
          // Legacy field support
          merchantRequestId: result.orderId,
        },
      });

      logger.info(`[PAYMENT ENGINE] Payment initiated successfully: ${payment.id}. Redirect URL: ${result.checkoutUrl}`);

      return {
        success: true,
        paymentId: payment.id,
        orderId: result.orderId,
        checkoutUrl: result.checkoutUrl,
        redirectUrl: result.checkoutUrl,
        message: result.message,
      };
    } catch (error) {
      logger.error('[PAYMENT ENGINE] Payment initiation error:', error);
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

      // If already successful, just return
      if (payment.status === PaymentStatus.SUCCESSFUL) {
        return {
          status: PaymentStatus.SUCCESSFUL,
          message: 'Payment already processed successfully',
          verified: true,
        };
      }

      const provider = this.getProvider(payment.provider);
      if (!provider) {
        throw new Error(`Provider ${payment.provider} not configured`);
      }

      // Verify with provider
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
        default:
          status = PaymentStatus.PENDING;
      }

      // If status is SUCCESSFUL, process it
      if (status === PaymentStatus.SUCCESSFUL) {
        await this.processSuccessfulPayment(payment.id, result.providerData);
      } else if (status === PaymentStatus.FAILED) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.FAILED,
            providerStatus: result.message,
            providerMessage: result.message,
            failureReason: result.message,
            providerPayload: result.providerData as any,
            verificationTimestamp: new Date(),
          },
        });
      }

      return {
        status,
        message: result.message || 'Payment status verified',
        verified: status === PaymentStatus.SUCCESSFUL,
      };
    } catch (error) {
      logger.error('[PAYMENT ENGINE] Payment verification error:', error);
      throw error;
    }
  }

  /**
   * Handle provider callback (IPN)
   */
  async handleCallback(
    provider: PaymentProviderType,
    payload: Record<string, any>,
    signature?: string,
    headers?: Record<string, any>
  ) {
    let auditId: string | null = null;

    try {
      // 1. Audit every callback request
      const audit = await prisma.callbackAudit.create({
        data: {
          provider,
          payload: payload as any,
          headers: headers as any,
          processed: false,
        },
      });
      auditId = audit.id;

      logger.info(`[CALLBACK] Received ${provider} callback`, { auditId });

      const paymentProvider = this.getProvider(provider);
      if (!paymentProvider) {
        throw new Error(`Provider ${provider} not configured`);
      }

      if (provider === 'PESAPAL') {
        return await this.handlePesapalCallback(payload, auditId);
      }

      throw new Error(`Unsupported provider for callback: ${provider}`);
    } catch (error) {
      logger.error('[CALLBACK] Handling error:', error);

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

  private async handlePesapalCallback(payload: Record<string, any>, auditId: string) {
    const orderTrackingId = payload.OrderTrackingId || payload.order_tracking_id;

    if (!orderTrackingId) {
      logger.warn('[PESAPAL CALLBACK] Missing OrderTrackingId');
      return { success: false, message: 'Missing OrderTrackingId' };
    }

    // 1. Idempotency Check
    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: orderTrackingId },
    });

    if (!payment) {
      logger.warn(`[PESAPAL CALLBACK] Payment not found for OrderTrackingId: ${orderTrackingId}`);
      return { success: false, message: 'Payment not found' };
    }

    if (payment.status === PaymentStatus.SUCCESSFUL) {
      logger.info(`[PESAPAL CALLBACK] Payment ${payment.id} already processed successfully`);
      return { success: true, message: 'Already processed', paymentId: payment.id };
    }

    // 2. Always verify with official API
    logger.info(`[PESAPAL CALLBACK] Verifying status for payment ${payment.id}`);
    const verification = await this.verifyPaymentStatus(payment.id);

    // 3. Update Audit
    await prisma.callbackAudit.update({
      where: { id: auditId },
      data: {
        processed: true,
        paymentId: payment.id,
        processingResult: JSON.stringify(verification),
      },
    });

    return {
      success: verification.verified,
      paymentId: payment.id,
      status: verification.status,
      message: verification.message,
    };
  }


  private async processSuccessfulPayment(paymentId: string, providerPayload: any) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { bill: true, resident: true },
    });

    if (!payment || payment.status === PaymentStatus.SUCCESSFUL) return;

    const confirmationCode = providerPayload.confirmation_code || providerPayload.mpesa_receipt_number || payment.confirmationCode;
    const finalAmount = providerPayload.amount || payment.amount;

    // 1. Update Payment record
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.SUCCESSFUL,
        providerStatus: providerPayload.payment_status_description || 'COMPLETED',
        providerMessage: 'Payment successful',
        providerTransactionId: confirmationCode || payment.providerTransactionId,
        confirmationCode: confirmationCode,
        providerPayload: providerPayload as any,
        verificationTimestamp: new Date(),
        verifiedBy: 'PESAPAL_API',
        receiptNumber: confirmationCode,
      },
    });

    // 2. Update Bill record
    const updatedAmountPaid = payment.bill.amountPaid + finalAmount;
    const newBalance = Math.max(0, payment.bill.totalAmount - updatedAmountPaid);
    const newBillStatus = newBalance <= 0 ? BillStatus.PAID : BillStatus.PARTIAL;

    await prisma.bill.update({
      where: { id: payment.billId },
      data: {
        status: newBillStatus,
        amountPaid: updatedAmountPaid,
        balance: newBalance,
        paidAt: newBillStatus === BillStatus.PAID ? new Date() : payment.bill.paidAt,
      },
    });

    logger.info(`[PAYMENT ENGINE] Bill ${payment.bill.billNumber} updated to ${newBillStatus}. New balance: ${newBalance}`);

    // 3. Generate Receipt
    try {
      await receiptService.generateReceipt(payment.id);
    } catch (error) {
      logger.error('[PAYMENT ENGINE] Receipt generation failed:', error);
    }

    // 4. Send Notification
    try {
      await notificationService.sendPaymentSuccessNotification(
        payment.residentId,
        finalAmount,
        confirmationCode || 'N/A'
      );
    } catch (error) {
      logger.error('[PAYMENT ENGINE] Notification failed:', error);
    }

    // 5. Socket.IO Broadcast
    this.broadcastUpdates(payment.residentId, payment.billId, payment.id);
  }

  private broadcastUpdates(residentId: string, billId: string, paymentId: string) {
    const room = `user_${residentId}`;
    io.to(room).emit('payment_completed', { paymentId, billId });
    io.to(room).emit('bill_updated', { billId });
    io.to(room).emit('dashboard_updated');
    io.to('admin_room').emit('payment_received', { paymentId, residentId });
    io.to('admin_room').emit('dashboard_updated');
  }

  async checkSystemHealth() {
    const services: Record<string, any> = {};
    const startTime = Date.now();

    // 1. Backend API (Self)
    services.backendApi = {
      status: 'ONLINE',
      message: 'API is responding correctly',
      responseTime: `${Date.now() - startTime}ms`,
      version: process.env.npm_package_version || '1.0.0'
    };

    // 2. Database (PostgreSQL)
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      services.database = {
        status: 'ONLINE',
        message: 'Database connection is healthy',
        responseTime: `${Date.now() - dbStart}ms`
      };
    } catch (error) {
      services.database = {
        status: 'OFFLINE',
        message: error instanceof Error ? error.message : 'Database connection failed'
      };
    }

    // 3. Pesapal API
    const pesapal = this.getProvider('PESAPAL');
    if (pesapal) {
      const isConfigured = pesapal.isConfigured();
      let apiStatus = 'OFFLINE';
      let apiMessage = 'Pesapal is not configured';
      let responseTime = undefined;

      if (isConfigured) {
        try {
          const pStart = Date.now();
          // @ts-ignore - calling private/internal method for health check
          await (pesapal as any).getAccessToken();
          apiStatus = 'ONLINE';
          apiMessage = 'Pesapal API is reachable and credentials are valid';
          responseTime = `${Date.now() - pStart}ms`;
        } catch (error) {
          apiStatus = 'WARNING';
          apiMessage = `Pesapal API error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }

      services.pesapalApi = {
        status: apiStatus,
        message: apiMessage,
        responseTime,
        configSummary: {
          consumerKey: !!process.env.PESAPAL_CONSUMER_KEY,
          consumerSecret: !!process.env.PESAPAL_CONSUMER_SECRET,
          ipnId: !!process.env.PESAPAL_IPN_ID,
          callbackUrl: !!process.env.PESAPAL_CALLBACK_URL
        }
      };
    }

    // 4. Payment Callback Endpoint
    const callbackUrl = process.env.PESAPAL_CALLBACK_URL;
    services.callbackEndpoint = {
      status: callbackUrl ? 'ONLINE' : 'OFFLINE',
      message: callbackUrl ? `Callback URL is set to ${callbackUrl}` : 'Callback URL is not configured',
      configSummary: {
        urlSet: !!callbackUrl,
        ipnIdSet: !!process.env.PESAPAL_IPN_ID
      }
    };

    // 5. Email Service (Brevo)
    const brevoKey = process.env.BREVO_API_KEY;
    services.emailService = {
      status: brevoKey ? 'ONLINE' : 'OFFLINE',
      message: brevoKey ? 'Brevo API key is configured' : 'Brevo API key is missing',
      configSummary: {
        apiKey: !!brevoKey,
        senderEmail: true // Hardcoded in email.ts
      }
    };

    // 6. Environment Variables
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'PESAPAL_CONSUMER_KEY',
      'PESAPAL_CONSUMER_SECRET',
      'BREVO_API_KEY'
    ];
    const missingVars = requiredVars.filter(v => !process.env[v]);
    
    services.environmentVariables = {
      status: missingVars.length === 0 ? 'ONLINE' : (missingVars.length === requiredVars.length ? 'OFFLINE' : 'WARNING'),
      message: missingVars.length === 0 ? 'All critical environment variables are set' : `Missing: ${missingVars.join(', ')}`,
      configSummary: requiredVars.reduce((acc, v) => ({ ...acc, [v]: !!process.env[v] }), {})
    };

    return {
      status: 'ONLINE',
      timestamp: new Date().toISOString(),
      serverTime: new Date().toISOString(),
      timezone: 'Africa/Nairobi',
      services
    };
  }
}
