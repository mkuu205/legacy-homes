import axios from 'axios';
import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { io } from '../server';
import { notificationService } from './notification.service';

const generatePaymentId = (): string => {
  return `PAY-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
};

const normalizePhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    throw new AppError('Phone number is required', 400);
  }

  let phone = phoneNumber.trim().replace(/\s+/g, '');

  if (!phone) {
    throw new AppError('Phone number is required', 400);
  }

  if (phone.startsWith('+')) {
    phone = phone.slice(1);
  }

  if (phone.startsWith('0')) {
    phone = `254${phone.slice(1)}`;
  }

  if (phone.startsWith('7') && phone.length === 9) {
    phone = `254${phone}`;
  }

  if (!/^254\d{9}$/.test(phone)) {
    throw new AppError(
      'Invalid phone number format. Use 07XXXXXXXX or 2547XXXXXXXX',
      400
    );
  }

  return phone;
};

export class PaymentService {
  private tumaApiUrl = process.env.TUMA_API_URL || 'https://api.tuma.co.ke';
  private tumaAuthUrl = process.env.TUMA_AUTH_URL || 'https://api.tuma.co.ke/auth/token';
  private cachedToken: string | null = null;
  private tokenExpiry: number | null = null;

  private async getAuthToken(): Promise<string> {
    if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    try {
      logger.info('Requesting new Tuma auth token');
      const response = await axios.post(this.tumaAuthUrl, {
        email: process.env.TUMA_BUSINESS_EMAIL,
        api_key: process.env.TUMA_API_KEY,
      });

      if (response.data.success && response.data.data.token) {
        this.cachedToken = response.data.data.token;
        this.tokenExpiry = Date.now() + 50 * 60 * 1000;
        return this.cachedToken!;
      }
      throw new Error(response.data.message || 'Authentication failed');
    } catch (error: any) {
      logger.error('Tuma authentication error:', error.response?.data || error.message);
      throw new AppError('Failed to authenticate with payment provider', 500);
    }
  }

  async initiateSTKPush(data: {
    billId: string;
    residentId: string;
    amount: number;
    phoneNumber: string;
  }) {
    if (!data.billId) throw new AppError('Bill ID is required', 400);
    if (!data.residentId) throw new AppError('Resident ID is required', 400);
    if (!data.amount || data.amount <= 0) {
      throw new AppError('Valid payment amount is required', 400);
    }

    const phone = normalizePhoneNumber(data.phoneNumber);

    const bill = await prisma.bill.findUnique({
      where: { id: data.billId },
      include: { resident: true },
    });

    if (!bill) throw new AppError('Bill not found', 404);

    if (bill.residentId !== data.residentId) {
      throw new AppError('Unauthorized', 403);
    }

    if (bill.status === 'PAID') {
      throw new AppError('Bill is already paid', 400);
    }

    if (data.amount > bill.balance) {
      throw new AppError(
        `Amount exceeds outstanding balance of KES ${bill.balance}`,
        400
      );
    }

    const paymentId = generatePaymentId();
    const token = await this.getAuthToken();

    const payment = await prisma.payment.create({
      data: {
        paymentId,
        billId: data.billId,
        residentId: data.residentId,
        amount: data.amount,
        phoneNumber: phone,
        status: 'PENDING',
        provider: 'TUMA',
      },
    });

    try {
      const callbackUrl = process.env.TUMA_CALLBACK_URL;
      logger.info(`Initiating Tuma STK Push for payment ${paymentId}. Callback URL: ${callbackUrl}`);
      const response = await axios.post(
        `${this.tumaApiUrl}/payment/stk-push`,
        {
          amount: data.amount,
          phone: phone,
          description: `Water Bill Payment - ${bill.billNumber}`,
          callback_url: callbackUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      if (response.data.success) {
        const { merchant_request_id, checkout_request_id } = response.data.data;

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            merchantRequestId: merchant_request_id,
            checkoutRequestId: checkout_request_id,
          },
        });

        return {
          success: true,
          paymentId,
          merchantRequestId: merchant_request_id,
          checkoutRequestId: checkout_request_id,
          message: response.data.message || 'STK Push sent successfully.',
        };
      }
      throw new Error(response.data.message || 'STK Push failed');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown payment error';
      logger.error('Tuma STK Push error:', error.response?.data || error.message);

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: errorMessage,
        },
      });

      throw new AppError(errorMessage, 500);
    }
  }

  async handleCallback(payload: any) {
    logger.info('Tuma callback received', payload);

    const {
      checkout_request_id,
      merchant_request_id,
      status,
      mpesa_receipt_number,
      amount,
      result_code,
      result_desc,
      timestamp
    } = payload;

    // Specific trace for requested transaction
    if (mpesa_receipt_number === 'UFONJ92VQ4') {
      logger.info(`TRACE: Callback received for transaction UFONJ92VQ4. Payload: ${JSON.stringify(payload)}`);
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { checkoutRequestId: checkout_request_id },
          { merchantRequestId: merchant_request_id }
        ].filter(Boolean)
      },
    });

    if (!payment) {
      logger.warn(`Callback received for unknown payment. MerchantID: ${merchant_request_id}, CheckoutID: ${checkout_request_id}. SILENTLY IGNORING.`);
      return { success: true, message: 'Callback received but payment not found' };
    }

    if (payment.status === 'SUCCESSFUL') {
      logger.info(`Callback for already successful payment: ${payment.paymentId}. Skipping.`);
      return { success: true, message: 'Callback already processed' };
    }

    const verificationTimestamp = timestamp ? new Date(timestamp) : new Date();

    // Success processing: result_code === 0 OR status === "completed"
    if (result_code === 0 || result_code === "0" || status === 'completed') {
      logger.info(`Payment ${payment.paymentId} marked as SUCCESSFUL in Tuma callback.`);
      try {
        await this.reconcilePayment(payment.id, mpesa_receipt_number, Number(amount || payment.amount), payload, verificationTimestamp);
        logger.info(`Payment updated: ${payment.paymentId} status = SUCCESSFUL`);
      } catch (error: any) {
        logger.error(`CRITICAL: Reconciliation failed for payment ${payment.paymentId}:`, error.message);
        throw error;
      }
    } 
    // Failure processing: result_code !== 0 OR status === "failed"
    else if (result_code !== 0 || status === 'failed') {
      logger.info(`Payment ${payment.paymentId} marked as FAILED in callback: ${result_desc}`);
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: result_desc || 'Payment failed',
          callbackPayload: payload,
          verificationTimestamp,
        },
      });
      logger.info(`Payment updated: ${payment.paymentId} status = FAILED`);
    }

    return { success: true, message: 'Callback processed successfully' };
  }

  private async reconcilePayment(
    paymentId: string,
    mpesaReceiptCode: string,
    amount: number,
    payload: any,
    verificationTimestamp: Date
  ) {
    // Use a transaction to ensure all updates succeed or fail together
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { bill: true },
      });

      if (!payment) {
        throw new Error(`Payment ${paymentId} not found during reconciliation`);
      }

      if (payment.status === 'SUCCESSFUL') {
        logger.info(`Payment ${paymentId} already reconciled.`);
        return;
      }

      // 1. Update Payment Record
      logger.info(`Updating payment ${payment.paymentId} to SUCCESSFUL`);
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'SUCCESSFUL',
          mpesaReceiptCode,
          callbackPayload: payload,
          verificationTimestamp,
          failureReason: null,
        },
      });
      logger.info(`Receipt saved: ${mpesaReceiptCode} for payment ${payment.paymentId}`);

      // 2. Update Bill Record
      const newAmountPaid = payment.bill.amountPaid + amount;
      const newBalance = Math.max(0, payment.bill.totalAmount - newAmountPaid);
      const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

      logger.info(`Updating bill ${payment.bill.billNumber}: PaidAmount=${newAmountPaid}, Balance=${newBalance}, Status=${newStatus}`);
      await tx.bill.update({
        where: { id: payment.billId },
        data: {
          amountPaid: newAmountPaid,
          balance: newBalance,
          status: newStatus,
          updatedAt: new Date(),
        },
      });
      logger.info(`Bill updated: ${payment.bill.billNumber}`);

      // 3. Update Resident Balance (Resident balance is tracked via their active bills)
      // If there was a specific balance field on User, it would be updated here.
      // Based on schema, we update the bill which reflects the resident's balance.
      logger.info(`Resident balance updated via bill ${payment.bill.billNumber}`);

      // 4. Create and send notifications
      try {
        logger.info(`Creating notification for payment ${payment.paymentId}`);
        await notificationService.sendPaymentSuccessNotification(
          payment.residentId,
          amount,
          mpesaReceiptCode
        );
        logger.info(`Notification created: Payment confirmation for ${payment.paymentId}`);
      } catch (err) {
        logger.error('Failed to send notifications during reconciliation:', err);
      }

      // 5. Emit Socket.IO events for real-time dashboard updates
      logger.info(`Emitting real-time updates for resident ${payment.residentId}`);
      
      io.to(`user_${payment.residentId}`).emit('payment_completed', {
        paymentId: payment.paymentId,
        amount,
        mpesaReceiptCode,
        billId: payment.billId,
        newBalance,
        newStatus
      });
      logger.info('Socket emitted: payment_completed');

      io.to(`user_${payment.residentId}`).emit('bill_updated', {
        billId: payment.billId,
        newBalance,
        newStatus
      });
      logger.info('Socket emitted: bill_updated');

      io.to(`user_${payment.residentId}`).emit('dashboard_updated', {
        residentId: payment.residentId
      });
      logger.info('Socket emitted: dashboard_updated');

      io.to(`user_${payment.residentId}`).emit('notification_created', {
        type: 'PAYMENT_CONFIRMATION',
        message: `Payment of KES ${amount} received. Receipt: ${mpesaReceiptCode}`
      });
      logger.info('Socket emitted: notification_created');
    });
  }

  async checkPaymentStatus(paymentId: string, userId: string) {
    const payment = await prisma.payment.findUnique({
      where: { paymentId },
      include: { bill: true },
    });

    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.residentId !== userId) throw new AppError('Unauthorized', 403);

    return payment;
  }

  async getResidentPayments(residentId: string, query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);

    const where: any = { residentId };
    if (query.status) where.status = query.status;
    if (query.billId) where.billId = query.billId;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { bill: true },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getAllPayments(query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.residentId) where.residentId = query.residentId;
    if (query.search) {
      where.OR = [
        { mpesaReceiptCode: { contains: query.search, mode: 'insensitive' } },
        { paymentId: { contains: query.search, mode: 'insensitive' } },
        { resident: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { resident: { accountNumber: { contains: query.search, mode: 'insensitive' } } },
        { bill: { billNumber: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          resident: { select: { id: true, fullName: true, accountNumber: true, email: true, phone: true } },
          bill: { select: { id: true, billNumber: true, billingMonth: true, totalAmount: true, status: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getPaymentStats() {
    const [total, successful, pending, failed] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'SUCCESSFUL' } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
    ]);

    return { total, successful, pending, failed };
  }

  async deletePayment(id: string) {
    await prisma.payment.delete({ where: { id } });
    return { message: 'Payment deleted successfully' };
  }

  async bulkDeletePayments(ids: string[]) {
    const result = await prisma.payment.deleteMany({ where: { id: { in: ids } } });
    return { deleted: result.count };
  }

  async clearResidentPaymentHistory(residentId: string) {
    const result = await prisma.payment.deleteMany({ where: { residentId } });
    return { deleted: result.count, message: 'Payment history cleared successfully' };
  }

  async retryPaymentVerification(paymentId: string) {
    const payment = await prisma.payment.findFirst({ where: { paymentId } });
    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.status === 'SUCCESSFUL') throw new AppError('Payment already successful', 400);
    return payment;
  }

  async exportPaymentsCSV(query: any) {
    const where: any = {};
    if (query.status) where.status = query.status;
    
    const payments = await prisma.payment.findMany({
      where,
      include: {
        resident: { select: { fullName: true, accountNumber: true } },
        bill: { select: { billNumber: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const header = 'Date,Payment ID,Resident,Account,Bill,Amount,M-Pesa Receipt,Status\n';
    const rows = payments.map(p => {
      return `${p.createdAt.toISOString()},${p.paymentId},${p.resident.fullName},${p.resident.accountNumber},${p.bill.billNumber},${p.amount},${p.mpesaReceiptCode || ''},${p.status}`;
    }).join('\n');

    return header + rows;
  }
}

export const paymentService = new PaymentService();
