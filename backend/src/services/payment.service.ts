import axios from 'axios';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { io } from '../server';

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

  if (!/^2547\d{8}$/.test(phone)) {
    throw new AppError(
      'Invalid phone number format. Use 07XXXXXXXX or 2547XXXXXXXX',
      400
    );
  }

  return phone;
};

export class PaymentService {
  private payHeroBaseUrl = 'https://backend.payhero.co.ke/api/v2';

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

    const existingPendingPayment = await prisma.payment.findFirst({
      where: {
        billId: data.billId,
        residentId: data.residentId,
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existingPendingPayment) {
      const pendingAge =
        Date.now() - new Date(existingPendingPayment.createdAt).getTime();

      const timeoutMs = 60 * 1000;

      if (pendingAge < timeoutMs) {
        throw new AppError(
          `A payment request is already pending. Please wait ${Math.ceil(
            (timeoutMs - pendingAge) / 1000
          )} seconds.`,
          400
        );
      }

      await prisma.payment.update({
        where: { id: existingPendingPayment.id },
        data: {
          status: 'FAILED',
          failureReason: 'Timed out / abandoned by user',
        },
      });
    }

    const paymentId = generatePaymentId();

    const payment = await prisma.payment.create({
      data: {
        paymentId,
        billId: data.billId,
        residentId: data.residentId,
        amount: data.amount,
        phoneNumber: phone,
        status: 'PENDING',
      },
    });

    try {
      const response = await axios.post(
        `${this.payHeroBaseUrl}/payments`,
        {
          amount: data.amount,
          phone_number: phone,
          channel_id: process.env.PAYHERO_CHANNEL_ID,
          provider: 'm-pesa',
          external_reference: paymentId,
          callback_url: process.env.PAYHERO_CALLBACK_URL,
          customer_name: bill.resident?.fullName || 'Customer',
          account_reference: bill.billNumber,
          description: `Water Bill Payment - ${bill.billNumber}`,
        },
        {
          headers: {
            Authorization: process.env.PAYHERO_AUTH,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 30000,
        }
      );

      const checkoutRequestId =
        response.data?.CheckoutRequestID ||
        response.data?.checkout_request_id ||
        response.data?.reference ||
        null;

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          checkoutRequestId,
          payHeroReference: response.data?.reference || null,
        },
      });

      return {
        success: true,
        paymentId,
        checkoutRequestId,
        message: 'STK Push sent successfully.',
      };
    } catch (error: any) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason:
            error?.response?.data?.message ||
            error?.message ||
            'Unknown payment error',
        },
      });

      throw new AppError(
        error?.response?.data?.message || 'Failed to initiate payment.',
        500
      );
    }
  }

  async handleCallback(payload: any, signature: string) {
    const webhookSecret = process.env.PAYHERO_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSig) {
        throw new AppError('Invalid webhook signature', 401);
      }
    }

    const paymentId =
      payload?.external_reference ||
      payload?.reference ||
      payload?.payment_reference;

    const status = payload?.status;
    const mpesaReceiptCode =
      payload?.MpesaReceiptNumber || payload?.mpesa_receipt || null;

    const amount = Number(payload?.Amount || payload?.amount || 0);

    if (!paymentId) {
      return { received: true };
    }

    const payment = await prisma.payment.findUnique({
      where: { paymentId },
    });

    if (!payment || payment.status === 'SUCCESSFUL') {
      return { received: true };
    }

    if (
      status === 'SUCCESS' ||
      status === 'COMPLETED'
    ) {
      await this.reconcilePayment(payment.id, mpesaReceiptCode, amount);
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason:
            payload?.ResultDesc ||
            payload?.message ||
            'Payment failed',
          mpesaReceiptCode,
        },
      });
    }

    return { received: true };
  }

  private async reconcilePayment(
    paymentId: string,
    mpesaReceiptCode: string,
    amount: number
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { bill: true },
    });

    if (!payment || payment.status === 'SUCCESSFUL') {
      return;
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESSFUL',
        mpesaReceiptCode,
      },
    });

    const newAmountPaid = payment.bill.amountPaid + amount;
    const newBalance = payment.bill.totalAmount - newAmountPaid;

    await prisma.bill.update({
      where: { id: payment.billId },
      data: {
        amountPaid: newAmountPaid,
        balance: Math.max(0, newBalance),
        status: newBalance <= 0 ? 'PAID' : 'PARTIAL',
      },
    });

    io.to(`user_${payment.residentId}`).emit('payment_success', {
      paymentId: payment.paymentId,
      amount,
      mpesaReceiptCode,
    });
  }

  async checkPaymentStatus(paymentId: string, userId: string) {
  const payment = await prisma.payment.findUnique({
    where: { paymentId },
    include: {
      bill: {
        select: {
          billNumber: true,
          status: true,
          balance: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  if (payment.residentId !== userId) {
    throw new AppError('Unauthorized', 403);
  }

  const pendingAge =
    Date.now() - new Date(payment.createdAt).getTime();

  // Auto-fail abandoned/cancelled payments after 15 seconds
  if (payment.status === 'PENDING' && pendingAge > 15 * 1000) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failureReason: 'Payment cancelled / timed out / insufficient funds',
      },
    });

    return {
      ...payment,
      status: 'FAILED',
      failureReason: 'Payment cancelled / timed out / insufficient funds',
    };
  }

  return payment;
  }

  async getResidentPayments(residentId: string, query: any) {
    const pageNum = Number.parseInt(String(query?.page || 1), 10);
    const limitNum = Number.parseInt(String(query?.limit || 20), 10);

    const where: any = { residentId };

    if (query.status) {
      where.status = query.status;
    }

    // Allow filtering by billId so resident can find the payment for a specific bill
    if (query.billId) {
      where.billId = query.billId;
    }

    const payments = await prisma.payment.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        bill: true,
      },
    });

    const total = await prisma.payment.count({ where });

    return {
      payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async getAllPayments(query: any) {
    const pageNum = Number.parseInt(String(query?.page || 1), 10);
    const limitNum = Number.parseInt(String(query?.limit || 20), 10);

    const where: any = {};

    // Filter by status
    if (query?.status) {
      where.status = query.status;
    }

    // Filter by residentId (used by admin resident history modal)
    if (query?.residentId) {
      where.residentId = query.residentId;
    }

    // Search by mpesa receipt, payment ID, or resident name/account number
    if (query?.search) {
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
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          resident: {
            select: { id: true, fullName: true, accountNumber: true, email: true, phone: true },
          },
          bill: {
            select: { id: true, billNumber: true, billingMonth: true, totalAmount: true, status: true },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async getPaymentStats() {
    const total = await prisma.payment.count();
    const successful = await prisma.payment.count({
      where: { status: 'SUCCESSFUL' },
    });
    const pending = await prisma.payment.count({
      where: { status: 'PENDING' },
    });
    const failed = await prisma.payment.count({
      where: { status: 'FAILED' },
    });

    return { total, successful, pending, failed };
  }

  async deletePayment(id: string) {
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new AppError('Payment not found', 404);
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
    try {
      const response = await axios.get(
        `${this.payHeroBaseUrl}/transaction-status?reference=${payment.paymentId}`,
        {
          headers: { Authorization: process.env.PAYHERO_AUTH },
          timeout: 15000,
        }
      );
      const data = response.data;
      if (data?.status === 'SUCCESS' || data?.status === 'COMPLETED') {
        const mpesaCode = data?.MpesaReceiptNumber || data?.mpesa_receipt || null;
        const amount = Number(data?.Amount || data?.amount || payment.amount);
        await this.reconcilePayment(payment.id, mpesaCode, amount);
        return { message: 'Payment verified successfully', status: 'SUCCESSFUL' };
      }
      return { message: 'Payment still pending or failed', status: payment.status };
    } catch (err) {
      return { message: 'Could not verify payment at this time', status: payment.status };
    }
  }

  async exportPaymentsCSV(query: any): Promise<string> {
    const { payments } = await this.getAllPayments({ ...query, limit: 10000 });
    const headers = ['Payment ID', 'Resident', 'Account', 'Amount', 'M-Pesa Code', 'Bill Number', 'Status', 'Date'];
    const rows = (payments as any[]).map((p) => [
      p.paymentId || p.id,
      p.resident?.fullName || '',
      p.resident?.accountNumber || '',
      p.amount,
      p.mpesaReceiptCode || '',
      p.bill?.billNumber || '',
      p.status,
      new Date(p.createdAt).toLocaleDateString('en-KE'),
    ]);
    return [headers, ...rows].map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  }
}

export const paymentService = new PaymentService();
