// src/services/payment-engine.service.ts
import { createHash } from 'crypto';
import prisma from '../config/prisma';
import { PaymentProvider } from '../providers/payment-provider.interface';
import { PesapalProvider } from '../providers/pesapal.provider';
import { TumaProvider } from '../providers/tuma.provider';
import { logger } from '../utils/logger';
import { PaymentProviderType, PaymentStatus, PaymentMethodType, BillStatus } from '@prisma/client';
import { notificationService } from './notification.service';
import { receiptService } from './receipt.service';
import { io } from '../server';
import { toMoneyNumber, calculateBalance } from '../utils/money';

export class PaymentEngineService {
  private providers: Map<string, PaymentProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    try {
      const pesapal = new PesapalProvider();
      if (pesapal.isConfigured()) {
        this.providers.set('PESAPAL', pesapal);
        logger.info('[PAYMENT ENGINE] Pesapal provider initialized');
      } else {
        logger.warn('[PAYMENT ENGINE] Pesapal not configured');
      }
    } catch (error) {
      logger.error('[PAYMENT ENGINE] Failed to initialize Pesapal:', error);
    }

    try {
      const tuma = new TumaProvider();
      if (tuma.isConfigured()) {
        this.providers.set('TUMA', tuma);
        logger.info('[PAYMENT ENGINE] TUMA provider initialized successfully');
      } else {
        logger.warn('[PAYMENT ENGINE] TUMA not configured');
      }
    } catch (error) {
      logger.error('[PAYMENT ENGINE] Failed to initialize TUMA:', error);
    }

    const configured = this.getConfiguredProviders();
    logger.info(`[PAYMENT ENGINE] Configured providers: ${configured.join(', ') || 'NONE'}`);
  }

  getProvider(providerType: PaymentProviderType): PaymentProvider | null {
    const provider = this.providers.get(providerType);
    if (!provider) {
      logger.error(`[PAYMENT ENGINE] Provider ${providerType} not found`);
      return null;
    }
    return provider;
  }

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
   * Format phone number to Kenyan format (254XXXXXXXXX)
   * Returns undefined if invalid
   */
  private formatPhoneNumber(phone: string | undefined): string | undefined {
    if (!phone) return undefined;

    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = `254${cleaned.substring(1)}`;
    if (!cleaned.startsWith('254') && cleaned.length === 9) cleaned = `254${cleaned}`;

    if (/^254\d{9}$/.test(cleaned)) return cleaned;

    logger.warn('[PAYMENT ENGINE] Invalid phone number format');
    return undefined;
  }

  private isValidPaymentAmount(amount: unknown): amount is number {
    return typeof amount === 'number'
      && Number.isFinite(amount)
      && amount > 0
      && Math.round(amount * 100) === amount * 100;
  }

  async initiatePayment(
    billId: string,
    residentId: string,
    provider: PaymentProviderType,
    paymentMethod: PaymentMethodType | string,
    phoneNumber: string | undefined,
    amount: number
  ) {
    try {
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

      if (!this.isValidPaymentAmount(amount)) {
        throw new Error('Amount must be a finite positive number with no more than two decimal places');
      }

      if (!['UNPAID', 'PARTIAL', 'OVERDUE'].includes(bill.status)) {
        throw new Error(`Bill is not payable in its current state: ${bill.status}`);
      }

      const pendingPayments = await prisma.payment.aggregate({
        where: { billId, status: PaymentStatus.PENDING },
        _sum: { amount: true },
      });
      const reservedAmount = toMoneyNumber(pendingPayments._sum.amount);
      const availableBalance = Math.max(0, toMoneyNumber(bill.balance) - reservedAmount);

      if (amount > availableBalance) {
        throw new Error(`Amount exceeds available outstanding balance of KES ${availableBalance}`);
      }

      // Get phone number from request or resident
      let finalPhoneNumber = phoneNumber || bill.resident.phone;

      // Format and validate phone number
      const formattedPhone = this.formatPhoneNumber(finalPhoneNumber);

      // For Pesapal, if phone is invalid, don't pass it (phone is optional)
      let phoneForProvider = formattedPhone;
      if (provider === 'PESAPAL' && (!phoneForProvider || phoneForProvider.length !== 12)) {
        phoneForProvider = undefined;
        logger.info('[PAYMENT ENGINE] Pesapal: No valid phone number, proceeding with card payment');
      }

      // For TUMA, phone is required
      if (provider === 'TUMA' && !phoneForProvider) {
        throw new Error('Valid phone number is required for TUMA STK Push');
      }

      // Map payment method to valid enum values
      const methodMapping: Record<string, PaymentMethodType> = {
        'CARD': PaymentMethodType.VISA,
        'MPESA': PaymentMethodType.MPESA_STK_PUSH,
        'MPESA_STK_PUSH': PaymentMethodType.MPESA_STK_PUSH,
        'BUY_GOODS_STK_PUSH': PaymentMethodType.BUY_GOODS_STK_PUSH,
        'VISA': PaymentMethodType.VISA,
        'MASTERCARD': PaymentMethodType.MASTERCARD,
        'SAVED_CARD': PaymentMethodType.SAVED_CARD,
      };

      const finalMethod = methodMapping[paymentMethod as string] || PaymentMethodType.VISA;

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          provider,
          paymentMethod: finalMethod,
          residentId,
          billId,
          phoneNumber: formattedPhone || finalPhoneNumber || '',
          amount,
          status: PaymentStatus.PENDING,
          merchantReference: `${bill.billNumber}-${Date.now()}`,
          currency: 'KES',
        },
      });

      logger.info(`[PAYMENT ENGINE] Created payment record: ${payment.id}`);

      const paymentProvider = this.getProvider(provider);
      if (!paymentProvider) {
        const configured = this.getConfiguredProviders();
        throw new Error(
          `Provider ${provider} not configured. Available: ${configured.join(', ') || 'NONE'}`
        );
      }

      // Initiate payment through provider
      const result = await paymentProvider.initiatePayment({
        amount,
        phoneNumber: phoneForProvider, // May be undefined for Pesapal
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

        throw new Error(result.error || 'Payment initiation failed');
      }

      // Update payment with provider references
      const merchantRequestId = result.providerData?.merchant_request_id || result.orderId;
      const checkoutRequestId = result.providerData?.checkout_request_id;
      if (provider === 'TUMA' && (!merchantRequestId || !checkoutRequestId)) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED, failureReason: 'TUMA response missing transaction identifiers' },
        });
        throw new Error('TUMA response missing merchant_request_id or checkout_request_id');
      }

      const updateData: any = {
        providerOrderId: merchantRequestId,
        merchantRequestId,
        providerReference: checkoutRequestId || merchantRequestId,
        providerPayload: {
          success: result.success,
          orderId: result.orderId,
          checkoutUrl: result.checkoutUrl,
          message: result.message,
          providerData: result.providerData || {},
        },
      };

      if (checkoutRequestId) {
        updateData.checkoutRequestId = checkoutRequestId;
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: updateData,
      });

      logger.info(`[PAYMENT ENGINE] Payment initiated: ${payment.id}. Provider: ${provider}`);

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

      if (payment.status === PaymentStatus.SUCCESSFUL) {
        return {
          status: PaymentStatus.SUCCESSFUL,
          message: 'Payment already processed',
          verified: true,
        };
      }

      const provider = this.getProvider(payment.provider);
      if (!provider) {
        throw new Error(`Provider ${payment.provider} not configured`);
      }

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
            verifiedBy: 'SYSTEM_VERIFICATION',
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

  private canonicalize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.canonicalize(item));
    if (value && typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((result, key) => {
          result[key] = this.canonicalize((value as Record<string, unknown>)[key]);
          return result;
        }, {});
    }
    return value;
  }

  private callbackFingerprint(provider: PaymentProviderType, payload: Record<string, any>): string {
    return createHash('sha256')
      .update(JSON.stringify({ provider, payload: this.canonicalize(payload) }))
      .digest('hex');
  }

  private safeCallbackHeaders(headers?: Record<string, any>): Record<string, string> {
    const allowed = ['content-type', 'user-agent', 'x-request-id', 'x-correlation-id'];
    return allowed.reduce<Record<string, string>>((result, key) => {
      const value = headers?.[key];
      if (typeof value === 'string' && value.length <= 256) result[key] = value;
      return result;
    }, {});
  }

  async handleCallback(
    provider: PaymentProviderType,
    payload: Record<string, any>,
    signature?: string,
    headers?: Record<string, any>
  ) {
    let auditId: string | null = null;

    try {
      const fingerprint = this.callbackFingerprint(provider, payload);
      const existingAudit = await prisma.callbackAudit.findUnique({ where: { callbackFingerprint: fingerprint } });
      if (existingAudit?.processed) {
        logger.info('[CALLBACK] Duplicate callback ignored', { auditId: existingAudit.id, fingerprint });
        return { success: true, message: 'Callback already processed', paymentId: existingAudit.paymentId || undefined };
      }

      const audit = await prisma.callbackAudit.upsert({
        where: { callbackFingerprint: fingerprint },
        create: {
          provider,
          payload: payload as any,
          headers: this.safeCallbackHeaders(headers) as any,
          callbackFingerprint: fingerprint,
          processed: false,
        },
        update: {},
      });
      auditId = audit.id;

      logger.info(`[CALLBACK] Received ${provider} callback`, { auditId, fingerprint });

      const paymentProvider = this.getProvider(provider);
      if (!paymentProvider) {
        throw new Error(`Provider ${provider} not configured`);
      }

      if (provider === 'PESAPAL') {
        return await this.handlePesapalCallback(payload, auditId);
      } else if (provider === 'TUMA') {
        return await this.handleTumaCallback(payload, auditId);
      }

      throw new Error(`Unsupported provider: ${provider}`);
    } catch (error) {
      logger.error('[CALLBACK] Handling error:', error);

      if (auditId) {
        await prisma.callbackAudit.update({
          where: { id: auditId },
          data: {
            processed: true,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
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

    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: orderTrackingId },
    });

    if (!payment) {
      logger.warn(`[PESAPAL CALLBACK] Payment not found: ${orderTrackingId}`);
      return { success: false, message: 'Payment not found' };
    }

    if (payment.status === PaymentStatus.SUCCESSFUL) {
      logger.info(`[PESAPAL CALLBACK] Payment already processed: ${payment.id}`);
      return { success: true, message: 'Already processed', paymentId: payment.id };
    }

    const verification = await this.verifyPaymentStatus(payment.id);

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

  private async handleTumaCallback(payload: Record<string, any>, auditId: string) {
    const provider = this.getProvider(PaymentProviderType.TUMA);
    if (!provider) throw new Error('TUMA provider not configured');

    const verification = await provider.verifyCallback({ payload });
    if (!verification.valid) {
      await prisma.callbackAudit.update({
        where: { id: auditId },
        data: { processed: true, errorMessage: verification.message, processingResult: JSON.stringify({ accepted: false }) },
      });
      return { success: false, message: verification.message || 'Invalid TUMA callback' };
    }

    const normalized = verification.providerData as Record<string, any>;
    const merchantRequestId = normalized.merchant_request_id as string;
    const checkoutRequestId = normalized.checkout_request_id as string;
    const payment = await prisma.payment.findFirst({
      where: { provider: PaymentProviderType.TUMA, merchantRequestId, checkoutRequestId },
    });

    if (!payment) {
      await prisma.callbackAudit.update({
        where: { id: auditId },
        data: { processed: true, errorMessage: 'No payment matched both Tuma identifiers', processingResult: JSON.stringify({ accepted: false }) },
      });
      logger.warn('[TUMA CALLBACK] No payment matched both provider identifiers', { merchantRequestId, checkoutRequestId });
      return { success: false, message: 'Payment not found or transaction identifiers do not match' };
    }

    const externalReference = normalized.external_reference;
    if (externalReference && externalReference !== payment.id && externalReference !== payment.merchantReference) {
      return this.recordTumaRejection(auditId, payment.id, 'External payment reference mismatch');
    }

    const callbackPhone = normalized.phone ? this.formatPhoneNumber(normalized.phone) : undefined;
    if (callbackPhone && callbackPhone !== payment.phoneNumber) {
      return this.recordTumaRejection(auditId, payment.id, 'Phone number mismatch');
    }

    if (payment.status === PaymentStatus.SUCCESSFUL) {
      await prisma.callbackAudit.update({
        where: { id: auditId },
        data: { processed: true, paymentId: payment.id, processingResult: JSON.stringify({ duplicate: true, status: PaymentStatus.SUCCESSFUL }) },
      });
      return { success: true, message: 'Already processed', paymentId: payment.id, status: PaymentStatus.SUCCESSFUL };
    }

    if (payment.status !== PaymentStatus.PENDING) {
      await prisma.callbackAudit.update({
        where: { id: auditId },
        data: { processed: true, paymentId: payment.id, processingResult: JSON.stringify({ ignored: true, status: payment.status }) },
      });
      return { success: false, message: `Payment is already terminal: ${payment.status}`, paymentId: payment.id, status: payment.status };
    }

    if (verification.status === 'SUCCESSFUL') {
      // Legacy assertion equivalent: verification.amount !== payment.amount.
      // Compare through the exact monetary representation instead of a JS float.
      if (verification.amount === undefined || verification.amount !== toMoneyNumber(payment.amount)) {
        return this.recordTumaMismatch(auditId, payment.id, toMoneyNumber(payment.amount), verification.amount, normalized);
      }

      const settlement = await this.processSuccessfulPayment(payment.id, normalized);
      if (!settlement.settled) {
        await prisma.callbackAudit.update({
          where: { id: auditId },
          data: { processed: true, paymentId: payment.id, errorMessage: settlement.reason, processingResult: JSON.stringify({ success: false, reason: settlement.reason }) },
        });
        return { success: false, paymentId: payment.id, message: settlement.reason || 'Payment was not settled' };
      }

      await prisma.callbackAudit.update({
        where: { id: auditId },
        data: { processed: true, paymentId: payment.id, processingResult: JSON.stringify({ success: true, status: PaymentStatus.SUCCESSFUL }) },
      });
      return { success: true, paymentId: payment.id, status: PaymentStatus.SUCCESSFUL, receiptNumber: normalized.mpesa_receipt_number, message: normalized.result_desc || 'Payment successful' };
    }

    const failed = await prisma.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.FAILED,
        providerStatus: 'FAILED',
        providerMessage: normalized.result_desc || 'Payment failed',
        failureReason: normalized.failure_reason || normalized.result_desc || `Tuma result_code ${normalized.result_code}`,
        providerPayload: normalized as any,
        callbackPayload: payload as any,
        verificationTimestamp: new Date(),
        verifiedBy: 'TUMA_CALLBACK',
      },
    });

    await prisma.callbackAudit.update({
      where: { id: auditId },
      data: { processed: true, paymentId: payment.id, processingResult: JSON.stringify({ success: false, status: PaymentStatus.FAILED, updated: failed.count === 1 }) },
    });
    return { success: false, paymentId: payment.id, status: PaymentStatus.FAILED, message: normalized.result_desc || 'Payment failed' };
  }

  private async recordTumaRejection(auditId: string, paymentId: string, message: string) {
    await prisma.callbackAudit.update({
      where: { id: auditId },
      data: { processed: true, paymentId, errorMessage: message, processingResult: JSON.stringify({ accepted: false }) },
    });
    return { success: false, paymentId, message };
  }

  private async recordTumaMismatch(auditId: string, paymentId: string, expectedAmount: number, receivedAmount: number | undefined, normalized: Record<string, any>) {
    await prisma.payment.updateMany({
      where: { id: paymentId, status: PaymentStatus.PENDING },
      data: {
        reconciliationStatus: 'MISMATCH',
        providerStatus: 'AMOUNT_MISMATCH',
        providerMessage: 'Tuma callback amount does not match initiated amount',
        failureReason: `Expected KES ${expectedAmount}; received KES ${receivedAmount ?? 'missing'}`,
        providerPayload: normalized as any,
        callbackPayload: normalized as any,
        verificationTimestamp: new Date(),
        verifiedBy: 'TUMA_CALLBACK',
      },
    });
    await prisma.callbackAudit.update({
      where: { id: auditId },
      data: { processed: true, paymentId, errorMessage: 'Tuma callback amount mismatch', processingResult: JSON.stringify({ accepted: false, reconciliation: 'MISMATCH' }) },
    });
    return { success: false, paymentId, message: 'Payment amount mismatch; held for reconciliation' };
  }

  private async processSuccessfulPayment(paymentId: string, providerPayload: any): Promise<{ settled: boolean; payment?: any; reason?: string }> {
    const settlement = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM payments WHERE id = ${paymentId} FOR UPDATE`;
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { bill: { include: { resident: true } }, resident: true },
      });

      if (!payment) return { settled: false, reason: 'Payment not found' };
      if (payment.status === PaymentStatus.SUCCESSFUL) return { settled: false, reason: 'Already processed' };
      if (payment.status !== PaymentStatus.PENDING) return { settled: false, reason: `Payment is already terminal: ${payment.status}` };

      await tx.$queryRaw`SELECT id FROM bills WHERE id = ${payment.billId} FOR UPDATE`;
      const bill = await tx.bill.findUnique({ where: { id: payment.billId } });
      if (!bill) return { settled: false, reason: 'Bill not found' };
      // Legacy assertion equivalent: if (payment.amount > bill.balance).
      // Decimal comparison avoids binary floating-point rounding errors.
      if (toMoneyNumber(payment.amount) > toMoneyNumber(bill.balance)) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            reconciliationStatus: 'MISMATCH',
            providerStatus: 'BALANCE_MISMATCH',
            providerMessage: 'Payment exceeds the current bill balance',
            failureReason: `Payment KES ${payment.amount} exceeds balance KES ${bill.balance}`,
            providerPayload: providerPayload as any,
            verificationTimestamp: new Date(),
            verifiedBy: 'TUMA_CALLBACK',
          },
        });
        return { settled: false, reason: 'Payment exceeds current bill balance' };
      }

      const confirmationCode = providerPayload.mpesa_receipt_number || providerPayload.confirmation_code || payment.confirmationCode;
      // Decimal equivalent of: updatedAmountPaid = bill.amountPaid + payment.amount
      const updatedAmountPaid = bill.amountPaid.add(payment.amount);
      const newBalance = calculateBalance(bill.totalAmount, updatedAmountPaid);
      const newBillStatus = newBalance.isZero() ? BillStatus.PAID : BillStatus.PARTIAL;

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESSFUL,
          providerStatus: 'COMPLETED',
          providerMessage: 'Payment successful',
          providerTransactionId: confirmationCode || payment.providerTransactionId,
          confirmationCode,
          receiptNumber: confirmationCode,
          providerPayload: { ...(payment.providerPayload as any || {}), ...providerPayload } as any,
          callbackPayload: providerPayload as any,
          verificationTimestamp: new Date(),
          verifiedBy: 'TUMA_CALLBACK',
          reconciliationStatus: 'PENDING',
        },
        include: { bill: { include: { resident: true } }, resident: true },
      });

      await tx.bill.update({
        where: { id: payment.billId },
        data: {
          status: newBillStatus,
          amountPaid: updatedAmountPaid,
          balance: newBalance,
          paidAt: newBillStatus === BillStatus.PAID ? new Date() : bill.paidAt,
          paymentProvider: payment.provider,
          paymentMethod: payment.paymentMethod,
          paymentId: payment.id,
        },
      });

      return { settled: true, payment: updatedPayment, amount: payment.amount, confirmationCode };
    });

    if (!settlement.settled || !settlement.payment) return settlement;

    logger.info('[PAYMENT ENGINE] Tuma payment and bill settlement committed', {
      paymentId,
      billId: settlement.payment.billId,
    });

    try {
      await receiptService.generateReceipt(paymentId);
    } catch (error) {
      logger.error('[PAYMENT ENGINE] Receipt generation failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    try {
      await notificationService.sendPaymentSuccessNotification(
        settlement.payment.residentId,
        toMoneyNumber(settlement.amount),
        settlement.confirmationCode || 'N/A'
      );
    } catch (error) {
      logger.error('[PAYMENT ENGINE] Notification failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    this.broadcastUpdates(settlement.payment.residentId, settlement.payment.billId, paymentId);
    return settlement;
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

    services.backendApi = {
      status: 'ONLINE',
      message: 'API is responding correctly',
      responseTime: `${Date.now() - startTime}ms`,
      version: process.env.npm_package_version || '1.0.0'
    };

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

    // Check Pesapal
    const pesapalProvider = this.providers.get('PESAPAL');
    if (pesapalProvider) {
      const isConfigured = pesapalProvider.isConfigured();
      services.pesapalApi = {
        status: isConfigured ? 'ONLINE' : 'OFFLINE',
        message: isConfigured ? 'PESAPAL provider is configured' : 'PESAPAL provider is not configured',
        configured: isConfigured,
      };
    } else {
      services.pesapalApi = {
        status: 'OFFLINE',
        message: 'PESAPAL provider not initialized',
        configured: false,
      };
    }

    // Check TUMA
    const tumaProvider = this.providers.get('TUMA');
    if (tumaProvider) {
      const isConfigured = tumaProvider.isConfigured();
      services.tumaApi = {
        status: isConfigured ? 'ONLINE' : 'OFFLINE',
        message: isConfigured ? 'TUMA provider is configured' : 'TUMA provider is not configured',
        configured: isConfigured,
      };
      logger.info(`[PAYMENT ENGINE] TUMA health check: ${services.tumaApi.status} - ${services.tumaApi.message}`);
    } else {
      services.tumaApi = {
        status: 'OFFLINE',
        message: 'TUMA provider not initialized',
        configured: false,
      };
      logger.warn(`[PAYMENT ENGINE] TUMA health check: ${services.tumaApi.status} - ${services.tumaApi.message}`);
    }

    const callbackUrl = process.env.PAYMENT_CALLBACK_URL || process.env.PESAPAL_CALLBACK_URL;
    services.callbackEndpoint = {
      status: callbackUrl ? 'ONLINE' : 'OFFLINE',
      message: callbackUrl ? `Callback URL is configured` : 'Callback URL is not configured',
      configSummary: {
        urlSet: !!callbackUrl,
        ipnIdSet: !!process.env.PESAPAL_IPN_ID,
      }
    };

    const hasEmailConfig = !!(process.env.SMTP_USER && process.env.SMTP_PASS) || !!process.env.BREVO_API_KEY;
    services.emailService = {
      status: hasEmailConfig ? 'ONLINE' : 'OFFLINE',
      message: hasEmailConfig ? 'Email service is configured' : 'Email service is not configured',
      configSummary: {
        smtpUser: !!process.env.SMTP_USER,
        smtpPass: !!process.env.SMTP_PASS,
        brevoApiKey: !!process.env.BREVO_API_KEY,
      }
    };

    const talksasaConfigured = !!process.env.TALKSASA_API_TOKEN;
    services.talksasaSms = {
      status: talksasaConfigured ? 'ONLINE' : 'OFFLINE',
      message: talksasaConfigured ? 'TalkSasa SMS service is configured' : 'TalkSasa SMS service is not configured',
      configSummary: {
        apiToken: talksasaConfigured,
        senderId: !!process.env.TALKSASA_SENDER_ID,
        apiUrl: !!(process.env.TALKSASA_API_URL || 'https://bulksms.talksasa.com/api/v3/'),
      }
    };

    const requiredVars = [
      'DATABASE_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'PESAPAL_CONSUMER_KEY',
      'PESAPAL_CONSUMER_SECRET',
    ];
    
    const optionalVars = [
      'TUMA_BUSINESS_EMAIL',
      'TUMA_API_KEY',
      'PAYMENT_CALLBACK_URL',
      'BREVO_API_KEY',
      'SMTP_USER',
      'SMTP_PASS',
      'TALKSASA_API_TOKEN',
      'TALKSASA_SENDER_ID',
    ];

    const missingRequired = requiredVars.filter(v => !process.env[v]);
    const missingOptional = optionalVars.filter(v => !process.env[v]);
    
    const tumaConfigured = !!(process.env.TUMA_BUSINESS_EMAIL && process.env.TUMA_API_KEY);
    
    services.environmentVariables = {
      status: missingRequired.length === 0 ? 'ONLINE' : 'WARNING',
      message: missingRequired.length === 0 
        ? 'All required environment variables are set' 
        : `Missing required: ${missingRequired.join(', ')}`,
      configSummary: {
        required: requiredVars.reduce((acc, v) => ({ ...acc, [v]: !!process.env[v] }), {}),
        optional: optionalVars.reduce((acc, v) => ({ ...acc, [v]: !!process.env[v] }), {}),
        tumaConfigured: tumaConfigured,
      }
    };

    const allOnline = Object.values(services).every((s: any) => s.status === 'ONLINE');
    const hasWarnings = Object.values(services).some((s: any) => s.status === 'WARNING');

    return {
      status: allOnline ? 'ONLINE' : (hasWarnings ? 'WARNING' : 'OFFLINE'),
      timestamp: new Date().toISOString(),
      serverTime: new Date().toISOString(),
      timezone: 'Africa/Nairobi',
      services,
      summary: {
        totalServices: Object.keys(services).length,
        online: Object.values(services).filter((s: any) => s.status === 'ONLINE').length,
        offline: Object.values(services).filter((s: any) => s.status === 'OFFLINE').length,
        warnings: Object.values(services).filter((s: any) => s.status === 'WARNING').length,
      }
    };
  }
}
