// src/services/payment-engine.service.ts
import prisma from '../config/prisma';
import { PaymentProvider } from '../providers/payment-provider.interface';
import { PesapalProvider } from '../providers/pesapal.provider';
import { TumaProvider } from '../providers/tuma.provider';
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
    // Initialize Pesapal
    try {
      const pesapal = new PesapalProvider();
      if (pesapal.isConfigured()) {
        this.providers.set('PESAPAL', pesapal);
        logger.info('[PAYMENT ENGINE] Pesapal provider initialized');
      } else {
        logger.warn('[PAYMENT ENGINE] Pesapal not configured - missing credentials');
      }
    } catch (error) {
      logger.error('[PAYMENT ENGINE] Failed to initialize Pesapal:', error);
    }

    // Initialize TUMA
    try {
      const tuma = new TumaProvider();
      if (tuma.isConfigured()) {
        this.providers.set('TUMA', tuma);
        logger.info('[PAYMENT ENGINE] TUMA provider initialized');
      } else {
        const config = tuma.getConfigStatus();
        logger.warn('[PAYMENT ENGINE] TUMA not configured - missing:', {
          email: !config.email ? 'TUMA_EMAIL' : null,
          apiKey: !config.apiKey ? 'TUMA_API_KEY' : null,
          callbackUrl: !config.callbackUrl ? 'TUMA_CALLBACK_URL' : null,
        });
      }
    } catch (error) {
      logger.error('[PAYMENT ENGINE] Failed to initialize TUMA:', error);
    }

    const configured = this.getConfiguredProviders();
    logger.info(`[PAYMENT ENGINE] Configured providers: ${configured.join(', ') || 'NONE'}`);
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
        billNumber: bill.billNumber,
        residentName: bill.resident.fullName,
        residentEmail: bill.resident.email,
        description: `Payment for bill ${bill.billNumber}`,
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
          merchantRequestId: result.orderId,
          // For TUMA, store both IDs
          ...(result.providerData && {
            providerPayload: {
              ...result.providerData,
              checkoutUrl: result.checkoutUrl,
            },
          }),
        },
      });

      logger.info(`[PAYMENT ENGINE] Payment initiated successfully: ${payment.id}. Provider: ${provider}`);

      return {
        success: true,
        paymentId: payment.id,
        orderId: result.orderId,
        checkoutUrl: result.checkoutUrl,
        redirectUrl: result.checkoutUrl,
        message: result.message,
        providerData: result.providerData,
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

      // Handle different providers
      if (provider === 'PESAPAL') {
        return await this.handlePesapalCallback(payload, auditId);
      } else if (provider === 'TUMA') {
        return await this.handleTumaCallback(payload, auditId);
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

  /**
   * Handle Pesapal callback
   */
  private async handlePesapalCallback(payload: Record<string, any>, auditId: string) {
    const orderTrackingId = payload.OrderTrackingId || payload.order_tracking_id;

    if (!orderTrackingId) {
      logger.warn('[PESAPAL CALLBACK] Missing OrderTrackingId');
      return { success: false, message: 'Missing OrderTrackingId' };
    }

    // Idempotency Check
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

    // Always verify with official API
    logger.info(`[PESAPAL CALLBACK] Verifying status for payment ${payment.id}`);
    const verification = await this.verifyPaymentStatus(payment.id);

    // Update Audit
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

  /**
   * Handle TUMA callback
   */
  private async handleTumaCallback(payload: Record<string, any>, auditId: string) {
    const merchantRequestId = payload.merchant_request_id;
    const checkoutRequestId = payload.checkout_request_id;
    const resultCode = payload.result_code;
    const mpesaReceiptNumber = payload.mpesa_receipt_number;

    logger.info(`[TUMA CALLBACK] Merchant: ${merchantRequestId}, Checkout: ${checkoutRequestId}, Result: ${resultCode}`);

    // Find payment by merchant_request_id or checkout_request_id
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { providerOrderId: merchantRequestId },
          { merchantRequestId: merchantRequestId },
          { providerPayload: { path: ['merchant_request_id'], equals: merchantRequestId } },
        ],
      },
    });

    if (!payment) {
      logger.warn(`[TUMA CALLBACK] Payment not found for MerchantRequestId: ${merchantRequestId}`);
      return { success: false, message: 'Payment not found' };
    }

    if (payment.status === PaymentStatus.SUCCESSFUL) {
      logger.info(`[TUMA CALLBACK] Payment ${payment.id} already processed successfully`);
      return { success: true, message: 'Already processed', paymentId: payment.id };
    }

    // Process based on result_code
    // Per Tuma docs: result_code = 0 means success
    const isSuccess = resultCode === 0;

    if (isSuccess) {
      // Process successful payment
      await this.processSuccessfulPayment(payment.id, {
        confirmation_code: mpesaReceiptNumber,
        amount: payload.amount,
        merchant_request_id: merchantRequestId,
        checkout_request_id: checkoutRequestId,
        result_desc: payload.result_desc,
        timestamp: payload.timestamp,
        ...payload,
      });

      logger.info(`[TUMA CALLBACK] Payment ${payment.id} processed successfully. Receipt: ${mpesaReceiptNumber}`);
    } else {
      // Update as failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          providerStatus: 'FAILED',
          providerMessage: payload.result_desc || 'Payment failed',
          failureReason: payload.failure_reason || payload.result_desc,
          providerPayload: payload as any,
          verificationTimestamp: new Date(),
        },
      });

      logger.warn(`[TUMA CALLBACK] Payment ${payment.id} failed. Reason: ${payload.result_desc}`);
    }

    // Update Audit
    await prisma.callbackAudit.update({
      where: { id: auditId },
      data: {
        processed: true,
        paymentId: payment.id,
        processingResult: JSON.stringify({
          success: isSuccess,
          status: isSuccess ? PaymentStatus.SUCCESSFUL : PaymentStatus.FAILED,
          receiptNumber: mpesaReceiptNumber,
        }),
      },
    });

    return {
      success: isSuccess,
      paymentId: payment.id,
      status: isSuccess ? PaymentStatus.SUCCESSFUL : PaymentStatus.FAILED,
      receiptNumber: mpesaReceiptNumber,
      message: payload.result_desc || (isSuccess ? 'Payment successful' : 'Payment failed'),
    };
  }

  /**
   * Process successful payment
   */
  private async processSuccessfulPayment(paymentId: string, providerPayload: any) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { bill: true, resident: true },
    });

    if (!payment || payment.status === PaymentStatus.SUCCESSFUL) return;

    const confirmationCode = providerPayload.confirmation_code || 
                           providerPayload.mpesa_receipt_number || 
                           providerPayload.confirmationCode || 
                           payment.confirmationCode;

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
        verifiedBy: 'PROVIDER_API',
        receiptNumber: confirmationCode,
        paidAt: new Date(),
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

  /**
   * Broadcast updates via Socket.IO
   */
  private broadcastUpdates(residentId: string, billId: string, paymentId: string) {
    const room = `user_${residentId}`;
    io.to(room).emit('payment_completed', { paymentId, billId });
    io.to(room).emit('bill_updated', { billId });
    io.to(room).emit('dashboard_updated');
    io.to('admin_room').emit('payment_received', { paymentId, residentId });
    io.to('admin_room').emit('dashboard_updated');
  }

  /**
   * Check system health
   */
  async checkSystemHealth() {
    const services: Record<string, any> = {};
    const startTime = Date.now();

    // 1. Backend API
    services.backendApi = {
      status: 'ONLINE',
      message: 'API is responding correctly',
      responseTime: `${Date.now() - startTime}ms`,
      version: process.env.npm_package_version || '1.0.0'
    };

    // 2. Database
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

    // 3. Payment Providers
    for (const [name, provider] of this.providers) {
      const isConfigured = provider.isConfigured();
      services[`${name.toLowerCase()}Api`] = {
        status: isConfigured ? 'ONLINE' : 'OFFLINE',
        message: isConfigured ? `${name} provider is configured` : `${name} provider is not configured`,
        configured: isConfigured,
      };
    }

    // 4. Environment Variables
    const requiredVars = [
      'DATABASE_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'PESAPAL_CONSUMER_KEY',
      'PESAPAL_CONSUMER_SECRET',
      'BREVO_API_KEY'
    ];
    const missingVars = requiredVars.filter(v => !process.env[v]);
    
    services.environmentVariables = {
      status: missingVars.length === 0 ? 'ONLINE' : 'WARNING',
      message: missingVars.length === 0 ? 'All critical environment variables are set' : `Missing: ${missingVars.join(', ')}`,
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
