import { prisma } from '@/config/prisma';
import { logger } from '@/utils/logger';
import { PaymentReconciliationStatus, PaymentStatus } from '@prisma/client';

export class ReconciliationService {
  /**
   * Reconcile all pending payments
   */
  async reconcileAllPendingPayments() {
    try {
      const pendingPayments = await prisma.payment.findMany({
        where: {
          status: PaymentStatus.PENDING,
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Older than 24 hours
          },
        },
      });

      logger.info(`Found ${pendingPayments.length} pending payments for reconciliation`);

      for (const payment of pendingPayments) {
        await this.reconcilePayment(payment.id);
      }

      return {
        processed: pendingPayments.length,
        message: 'Reconciliation completed',
      };
    } catch (error) {
      logger.error('Reconciliation error:', error);
      throw error;
    }
  }

  /**
   * Reconcile a single payment
   */
  async reconcilePayment(paymentId: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { bill: true },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // If payment is already completed, mark as reconciled
      if (payment.status === PaymentStatus.SUCCESSFUL) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            reconciliationStatus: PaymentReconciliationStatus.RECONCILED,
          },
        });

        // Update bill status
        await this.updateBillStatus(payment.billId, payment.amount);

        logger.info(`Payment reconciled: ${paymentId}`);
        return { status: 'RECONCILED', message: 'Payment reconciled' };
      }

      // If payment is failed or cancelled, mark as such
      if (([PaymentStatus.FAILED, PaymentStatus.CANCELLED, PaymentStatus.REFUNDED] as any[]).includes(payment.status)) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            reconciliationStatus: PaymentReconciliationStatus.MISMATCH,
          },
        });

        logger.warn(`Payment marked as mismatch: ${paymentId}`);
        return { status: 'MISMATCH', message: 'Payment failed or cancelled' };
      }

      // If payment is still pending after 24 hours, mark as orphaned
      if (payment.status === PaymentStatus.PENDING) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            reconciliationStatus: PaymentReconciliationStatus.ORPHANED,
            status: PaymentStatus.FAILED,
            failureReason: 'Payment timeout - no confirmation received within 24 hours',
          },
        });

        logger.warn(`Payment marked as orphaned: ${paymentId}`);
        return { status: 'ORPHANED', message: 'Payment timeout' };
      }

      return { status: 'PENDING', message: 'Payment still pending' };
    } catch (error) {
      logger.error('Payment reconciliation error:', error);
      throw error;
    }
  }

  /**
   * Update bill status based on payment
   */
  private async updateBillStatus(billId: string, paymentAmount: number) {
    try {
      const bill = await prisma.bill.findUnique({
        where: { id: billId },
        include: { payments: true },
      });

      if (!bill) {
        throw new Error('Bill not found');
      }

      // Calculate total paid
      const totalPaid = bill.payments.reduce((sum, p) => {
        if (p.status === PaymentStatus.SUCCESSFUL) {
          return sum + p.amount;
        }
        return sum;
      }, 0);

      // Determine bill status
      let status;
      if (totalPaid >= bill.totalAmount) {
        status = 'PAID';
      } else if (totalPaid > 0) {
        status = 'PARTIAL';
      } else {
        status = 'UNPAID';
      }

      // Update bill
      await prisma.bill.update({
        where: { id: billId },
        data: {
          status,
          amountPaid: totalPaid,
          balance: Math.max(0, bill.totalAmount - totalPaid),
          paidAt: totalPaid >= bill.totalAmount ? new Date() : null,
        },
      });

      logger.info(`Bill status updated: ${billId} -> ${status}`);
    } catch (error) {
      logger.error('Bill status update error:', error);
      throw error;
    }
  }

  /**
   * Get reconciliation report
   */
  async getReconciliationReport(startDate: Date, endDate: Date) {
    try {
      const payments = await prisma.payment.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: { bill: true },
      });

      const report = {
        totalPayments: payments.length,
        successful: payments.filter(p => p.status === PaymentStatus.SUCCESSFUL).length,
        failed: payments.filter(p => p.status === PaymentStatus.FAILED).length,
        pending: payments.filter(p => p.status === PaymentStatus.PENDING).length,
        cancelled: payments.filter(p => p.status === PaymentStatus.CANCELLED).length,
        refunded: payments.filter(p => p.status === PaymentStatus.REFUNDED).length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        successfulAmount: payments
          .filter(p => p.status === PaymentStatus.SUCCESSFUL)
          .reduce((sum, p) => sum + p.amount, 0),
        reconciliationStatus: {
          reconciled: payments.filter(p => p.reconciliationStatus === PaymentReconciliationStatus.RECONCILED).length,
          pending: payments.filter(p => p.reconciliationStatus === PaymentReconciliationStatus.PENDING).length,
          mismatch: payments.filter(p => p.reconciliationStatus === PaymentReconciliationStatus.MISMATCH).length,
          orphaned: payments.filter(p => p.reconciliationStatus === PaymentReconciliationStatus.ORPHANED).length,
        },
      };

      return report;
    } catch (error) {
      logger.error('Reconciliation report error:', error);
      throw error;
    }
  }
}
