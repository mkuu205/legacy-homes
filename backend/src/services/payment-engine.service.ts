import prisma from '../config/prisma';
import { PaymentProvider } from '../providers/payment-provider.interface';
import { TumaProvider } from '../providers/tuma.provider';
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
    phoneNumber: string | undefined,
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

      // 2. Backend Phone Resolution
      let finalPhoneNumber = phoneNumber;
      if (!finalPhoneNumber) {
        finalPhoneNumber = bill.resident.phone;
      }

      if (!finalPhoneNumber) {
        throw new Error('Phone number not found for resident.');
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          provider,
          paymentMethod,
          residentId,
          billId,
          phoneNumber: finalPhoneNumber,
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

      // Check if paying with a saved card
      let accountToken = undefined;
      if (method === 'SAVED_CARD') {
        const savedMethod = await prisma.paymentMethod.findFirst({
          where: { residentId, isActive: true, methodType: 'SAVED_CARD' }
        });
        if (savedMethod?.providerToken) {
          accountToken = savedMethod.providerToken;
        }
      }

      // Initiate payment through provider
      const result = await paymentProvider.initiatePayment({
        amount,
        phoneNumber: finalPhoneNumber,
        billId,
        residentId,
        externalReference: payment.id,
        // @ts-ignore - Pesapal 3.0 supports account_value for tokenized payments
        account_value: accountToken,
        // Pass resident details for a better checkout experience on provider page
        // @ts-ignore
        residentName: bill.resident.fullName,
        // @ts-ignore
        residentEmail: bill.resident.email,
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
          // Store these specifically for Tuma/Pesapal as per spec
          merchantRequestId: result.orderId,
          checkoutRequestId: result.transactionId,
        },
      });

      logger.info(`[PAYMENT] Payment initiated successfully: ${payment.id}`);

      return {
        success: true,
        paymentId: payment.id,
        transactionId: result.transactionId,
        orderId: result.orderId,
        checkoutUrl: result.checkoutUrl,
        redirectUrl: result.checkoutUrl, // Support both names for frontend
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

      // For Tuma, the callback is the source of truth, so we don't re-verify with the provider.
      if (payment.provider === 'TUMA') {
        return {
          status: payment.status,
          message: payment.providerMessage || 'Status from Tuma callback',
          verified: payment.status === PaymentStatus.SUCCESSFUL,
        };
      }

      const provider = this.getProvider(payment.provider);
      if (!provider) {
        throw new Error(`Provider ${payment.provider} not configured`);
      }

      // For other providers (Pesapal), proceed with verification
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

      // If status changed to SUCCESSFUL, we need to update the bill etc.
      if (status === PaymentStatus.SUCCESSFUL && payment.status !== PaymentStatus.SUCCESSFUL) {
        await this.processSuccessfulPayment(payment.id, result.providerData);
      } else if (status !== payment.status) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status,
            providerStatus: result.status,
            providerMessage: result.message,
            verificationTimestamp: result.timestamp || new Date(),
            providerPayload: result.providerData as any,
          },
        });
      }

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

      if (provider === 'TUMA') {
        return await this.handleTumaCallback(payload, auditId);
      } else if (provider === 'PESAPAL') {
        return await this.handlePesapalCallback(payload, auditId);
      }

      throw new Error(`Unsupported provider for callback: ${provider}`);
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

  private async handleTumaCallback(payload: Record<string, any>, auditId: string) {
    const { status, result_code, merchant_request_id, checkout_request_id, mpesa_receipt_number, amount, result_desc, failure_reason } = payload;

    // 3. Check for idempotency first
    const existingPayment = await prisma.payment.findFirst({
      where: {
        OR: [
          { checkoutRequestId: checkout_request_id },
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
        message: 'Tuma callback processed successfully',
        paymentId: existingPayment.id,
        status: PaymentStatus.SUCCESSFUL,
      };
    }

    // 4. Find the payment record using merchant_request_id
    const payment = await prisma.payment.findFirst({
      where: {
        merchantRequestId: merchant_request_id,
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

    if (status === 'completed' && result_code === 0) {
      await this.processSuccessfulPayment(payment.id, payload);
      
      await prisma.callbackAudit.update({
        where: { id: auditId },
        data: {
          processed: true,
          paymentId: payment.id,
          processingResult: JSON.stringify({ status: PaymentStatus.SUCCESSFUL, message: 'Tuma callback processed successfully', payload }),
        },
      });

      return {
        success: true,
        paymentId: payment.id,
        status: PaymentStatus.SUCCESSFUL,
        message: 'Tuma callback processed successfully',
      };
    } else {
      // Mark payment FAILED
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          providerStatus: status,
          providerMessage: result_desc || failure_reason || 'Payment failed',
          failureReason: result_desc || failure_reason || 'Provider reported failure',
          providerPayload: payload as any,
          verificationTimestamp: new Date(),
          verifiedBy: 'TUMA_CALLBACK',
        },
      });

      logger.warn(`[TUMA CALLBACK] Tuma callback reported payment failure for payment ${payment.id}. Reason: ${result_desc || failure_reason}`, { auditId });

      await prisma.callbackAudit.update({
        where: { id: auditId },
        data: {
          processed: true,
          paymentId: payment.id,
          processingResult: JSON.stringify({ status: PaymentStatus.FAILED, message: 'Tuma callback reported payment failure', payload }),
        },
      });

      return {
        success: false,
        paymentId: payment.id,
        status: PaymentStatus.FAILED,
        message: 'Tuma callback reported payment failure',
      };
    }
  }

  private async handlePesapalCallback(payload: Record<string, any>, auditId: string) {
    const orderTrackingId = payload.OrderTrackingId || payload.order_tracking_id;

    if (!orderTrackingId) {
      throw new Error('Missing OrderTrackingId in Pesapal callback');
    }

    // Check idempotency
    const existingPayment = await prisma.payment.findFirst({
      where: { providerOrderId: orderTrackingId },
    });

    if (existingPayment && existingPayment.status === PaymentStatus.SUCCESSFUL) {
      return { success: true, message: 'Payment already processed', paymentId: existingPayment.id };
    }

    // Always verify status with Pesapal API
    const provider = this.getProvider('PESAPAL');
    const result = await provider!.verifyPaymentStatus({ orderId: orderTrackingId });

    if (result.status === 'SUCCESSFUL') {
      const payment = existingPayment || await prisma.payment.findFirst({
        where: { providerOrderId: orderTrackingId }
      });

      if (payment) {
        await this.processSuccessfulPayment(payment.id, result.providerData);
        
        await prisma.callbackAudit.update({
          where: { id: auditId },
          data: {
            processed: true,
            paymentId: payment.id,
            processingResult: JSON.stringify({ status: PaymentStatus.SUCCESSFUL, result }),
          },
        });

        return { success: true, paymentId: payment.id, status: PaymentStatus.SUCCESSFUL };
      }
    }

    return { success: false, message: 'Payment not successful' };
  }

  private async processSuccessfulPayment(paymentId: string, providerPayload: any) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { bill: true, resident: true },
    });

    if (!payment || payment.status === PaymentStatus.SUCCESSFUL) return;

    const { 
      checkout_request_id, 
      mpesa_receipt_number, 
      amount, 
      result_desc,
      confirmation_code,
      payment_status_description
    } = providerPayload;

    const finalAmount = amount || payment.amount;
    const confirmationCode = mpesa_receipt_number || confirmation_code || payment.confirmationCode;

    // 1. Update Payment record
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.SUCCESSFUL,
        providerStatus: providerPayload.status || payment_status_description || 'completed',
        providerMessage: result_desc || 'Payment successful',
        providerTransactionId: checkout_request_id || confirmationCode || payment.providerTransactionId,
        confirmationCode: confirmationCode,
        providerPayload: providerPayload as any,
        verificationTimestamp: new Date(),
        verifiedBy: payment.provider === 'TUMA' ? 'TUMA_CALLBACK' : 'PESAPAL_VERIFY',
        receiptNumber: confirmationCode, // Use confirmation code as receipt number if not provided
      },
    });

    // 1b. Handle Card Tokenization (Saved Cards)
    if (payment.provider === 'PESAPAL' && providerPayload.payment_method === 'CARD' && providerPayload.token) {
      try {
        const existingMethod = await prisma.paymentMethod.findFirst({
          where: {
            residentId: payment.residentId,
            providerToken: providerPayload.token,
            isActive: true,
          },
        });

        if (!existingMethod) {
          await prisma.paymentMethod.create({
            data: {
              residentId: payment.residentId,
              provider: 'PESAPAL',
              methodType: 'SAVED_CARD',
              displayName: `${providerPayload.card_brand} ending in ${providerPayload.last_four_digits}`,
              lastFour: providerPayload.last_four_digits,
              cardBrand: providerPayload.card_brand,
              expiryMonth: parseInt(providerPayload.expiry_month),
              expiryYear: parseInt(providerPayload.expiry_year),
              providerToken: providerPayload.token,
              isActive: true,
            },
          });
          logger.info(`[PAYMENT ENGINE] Saved new card token for resident ${payment.residentId}`);
        }
      } catch (tokenError) {
        logger.error(`[PAYMENT ENGINE] Failed to save card token: ${tokenError}`);
      }
    }

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

    logger.info(`[PAYMENT ENGINE] Bill ${payment.billId} updated to status: ${newBillStatus}`);

    // 3. Generate Receipt
    try {
      const receipt = await receiptService.generateReceipt(payment.id);
      logger.info(`[PAYMENT ENGINE] Receipt generated: ${receipt.id}`);
    } catch (error) {
      logger.error(`[PAYMENT ENGINE] Failed to generate receipt: ${error}`);
    }

    // 4. Send Notification
    try {
      await notificationService.sendPaymentSuccessNotification(
        payment.residentId,
        finalAmount,
        confirmationCode
      );
    } catch (error) {
      logger.error(`[PAYMENT ENGINE] Failed to send notification: ${error}`);
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
    
    logger.info(`[PAYMENT ENGINE] Broadcasted updates for resident ${residentId}`);
  }

  /**
   * Check system health
   */
  async checkSystemHealth() {
    const results: Record<string, any> = {};
    for (const [name, provider] of this.providers) {
      results[name] = {
        configured: provider.isConfigured(),
        healthy: await provider.validateCredentials(),
      };
    }
    return results;
  }
}
