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
      logger.info(`Initiating Tuma STK Push for payment ${paymentId}`);
      const response = await axios.post(
        `${this.tumaApiUrl}/payment/stk-push`,
        {
          amount: data.amount,
          phone: phone,
          description: `Water Bill Payment - ${bill.billNumber}`,
          callback_url: process.env.TUMA_CALLBACK_URL,
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
    logger.info('Tuma callback received:', JSON.stringify(payload));

    const {
      checkout_request_id,
      merchant_request_id,
      status,
      mpesa_receipt_number,
      amount,
      result_code,
      result_desc,
      failure_reason,
      timestamp
    } = payload;

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { checkoutRequestId: checkout_request_id },
          { merchantRequestId: merchant_request_id }
        ]
      },
    });

    if (!payment) {
      logger.warn(`Callback received for unknown payment: ${checkout_request_id || merchant_request_id}`);
      return { success: true, message: 'Callback received' };
    }

    if (payment.status === 'SUCCESSFUL') {
      logger.info(`Callback for already successful payment: ${payment.paymentId}`);
      return { success: true, message: 'Callback received' };
    }

    const verificationTimestamp = timestamp ? new Date(timestamp) : new Date();

    if (status === 'completed' || result_code === 0 || result_code === "0") {
      logger.info(`Payment ${payment.paymentId} SUCCESSFUL. Reconciling...`);
      await this.reconcilePayment(payment.id, mpesa_receipt_number, Number(amount || payment.amount), payload, verificationTimestamp);
    } else {
      logger.info(`Payment ${payment.paymentId} FAILED/CANCELLED: ${result_desc || failure_reason}`);
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: failure_reason || result_desc || 'Payment failed',
          callbackPayload: payload,
          verificationTimestamp,
        },
      });
    }

    return { success: true, message: 'Callback received' };
  }

  private async reconcilePayment(
    paymentId: string,
    mpesaReceiptCode: string,
    amount: number,
    payload: any,
    verificationTimestamp: Date
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { bill: true },
    });

    if (!payment || payment.status === 'SUCCESSFUL') return;

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESSFUL',
        mpesaReceiptCode,
        callbackPayload: payload,
        verificationTimestamp,
        failureReason: null,
      },
    });

    const newAmountPaid = payment.bill.amountPaid + amount;
    const newBalance = Math.max(0, payment.bill.totalAmount - newAmountPaid);

    await prisma.bill.update({
      where: { id: payment.billId },
      data: {
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: newBalance <= 0 ? 'PAID' : 'PARTIAL',
      },
    });

    io.to(`user_${payment.residentId}`).emit('payment_success', {
      paymentId: payment.paymentId,
      amount,
      mpesaReceiptCode,
    });

    try {
      await notificationService.sendPaymentSuccessNotification(
        payment.residentId,
        amount,
        mpesaReceiptCode
      );
    } catch (err) {
      logger.error('Failed to send notifications:', err);
    }
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
