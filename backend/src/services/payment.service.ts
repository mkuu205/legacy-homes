// This service is obsolete and has been replaced by PaymentEngineService.
// It is kept temporarily as a shell to prevent import errors during transition, 
// but all logic has been moved to PaymentEngineService.

import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';

export class PaymentService {
  async checkPaymentStatus(paymentId: string, userId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
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
        total,
        page,
        limit,
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
    if (query.billId) where.billId = query.billId;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { 
          bill: true,
          resident: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              accountNumber: true
            }
          }
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentStats() {
    const [totalPayments, totalAmount, statusStats] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'SUCCESSFUL' }
      }),
      prisma.payment.groupBy({
        by: ['status'],
        _count: true,
        _sum: { amount: true }
      })
    ]);

    return {
      totalPayments,
      totalAmount: totalAmount._sum.amount || 0,
      statusStats
    };
  }

  async deletePayment(id: string) {
    await prisma.payment.delete({ where: { id } });
    return { message: 'Payment deleted successfully' };
  }

  async bulkDeletePayments(ids: string[]) {
    const result = await prisma.payment.deleteMany({
      where: { id: { in: ids } }
    });
    return { deleted: result.count };
  }

  async clearResidentPaymentHistory(residentId: string) {
    const result = await prisma.payment.deleteMany({
      where: { residentId }
    });
    return { deleted: result.count };
  }

  async retryPaymentVerification(paymentId: string) {
    // This will be handled by PaymentEngineService.verifyPaymentStatus
    return { message: 'Verification retry initiated' };
  }

  async exportPaymentsCSV(query: any) {
    const payments = await prisma.payment.findMany({
      include: { 
        bill: true,
        resident: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const header = 'Date,Payment ID,Bill Number,Resident,Phone,Amount,Method,Status,Confirmation Code\n';
    const rows = payments.map(p => {
      return `${p.createdAt.toISOString()},${p.id},${p.bill.billNumber},"${p.resident.fullName}",${p.phoneNumber},${p.amount},${p.paymentMethod},${p.status},${p.confirmationCode || ''}`;
    }).join('\n');

    return header + rows;
  }
}

export const paymentService = new PaymentService();
