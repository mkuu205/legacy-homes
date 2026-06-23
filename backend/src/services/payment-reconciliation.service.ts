import { PrismaClient, Payment, PaymentReconciliationStatus } from "@prisma/client";
import logger from "../utils/logger";

const prisma = new PrismaClient();

export class PaymentReconciliationService {
  // Reconcile a payment
  async reconcilePayment(paymentId: string, status: PaymentReconciliationStatus): Promise<Payment> {
    try {
      const payment = await prisma.payment.update({
        where: { id: paymentId },
        data: { reconciliationStatus: status },
      });

      logger.info(`Payment reconciled: ${paymentId} - ${status}`);
      return payment;
    } catch (error) {
      logger.error(`Error reconciling payment: ${error}`);
      throw error;
    }
  }

  // Get unreconciled payments
  async getUnreconciledPayments(skip = 0, take = 50): Promise<Payment[]> {
    try {
      const payments = await prisma.payment.findMany({
        where: {
          reconciliationStatus: PaymentReconciliationStatus.PENDING,
        },
        include: {
          bill: { select: { id: true, billNumber: true, totalAmount: true } },
          resident: { select: { id: true, fullName: true, email: true } },
        },
        skip,
        take,
        orderBy: { createdAt: "asc" },
      });

      return payments;
    } catch (error) {
      logger.error(`Error fetching unreconciled payments: ${error}`);
      throw error;
    }
  }

  // Get mismatched payments
  async getMismatchedPayments(skip = 0, take = 50): Promise<Payment[]> {
    try {
      const payments = await prisma.payment.findMany({
        where: {
          reconciliationStatus: PaymentReconciliationStatus.MISMATCH,
        },
        include: {
          bill: { select: { id: true, billNumber: true, totalAmount: true } },
          resident: { select: { id: true, fullName: true, email: true } },
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      });

      return payments;
    } catch (error) {
      logger.error(`Error fetching mismatched payments: ${error}`);
      throw error;
    }
  }

  // Get orphaned payments (no matching bill)
  async getOrphanedPayments(skip = 0, take = 50): Promise<Payment[]> {
    try {
      const payments = await prisma.payment.findMany({
        where: {
          reconciliationStatus: PaymentReconciliationStatus.ORPHANED,
        },
        include: {
          resident: { select: { id: true, fullName: true, email: true } },
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      });

      return payments;
    } catch (error) {
      logger.error(`Error fetching orphaned payments: ${error}`);
      throw error;
    }
  }

  // Get reconciliation statistics
  async getReconciliationStats(): Promise<{
    totalPayments: number;
    reconciled: number;
    pending: number;
    mismatched: number;
    orphaned: number;
    reconciliationRate: number;
  }> {
    try {
      const [total, reconciled, pending, mismatched, orphaned] = await Promise.all([
        prisma.payment.count(),
        prisma.payment.count({ where: { reconciliationStatus: PaymentReconciliationStatus.RECONCILED } }),
        prisma.payment.count({ where: { reconciliationStatus: PaymentReconciliationStatus.PENDING } }),
        prisma.payment.count({ where: { reconciliationStatus: PaymentReconciliationStatus.MISMATCH } }),
        prisma.payment.count({ where: { reconciliationStatus: PaymentReconciliationStatus.ORPHANED } }),
      ]);

      const reconciliationRate = total > 0 ? (reconciled / total) * 100 : 0;

      return {
        totalPayments: total,
        reconciled,
        pending,
        mismatched,
        orphaned,
        reconciliationRate: parseFloat(reconciliationRate.toFixed(2)),
      };
    } catch (error) {
      logger.error(`Error getting reconciliation stats: ${error}`);
      throw error;
    }
  }

  // Auto-reconcile payments based on amount matching
  async autoReconcilePayments(): Promise<number> {
    try {
      const pendingPayments = await prisma.payment.findMany({
        where: { reconciliationStatus: PaymentReconciliationStatus.PENDING },
        include: { bill: true },
      });

      let reconciled = 0;
      for (const payment of pendingPayments) {
        if (payment.bill && payment.amount === payment.bill.balance) {
          await this.reconcilePayment(payment.id, PaymentReconciliationStatus.RECONCILED);
          reconciled++;
        } else if (payment.bill && payment.amount < payment.bill.balance) {
          // Partial payment - still reconcile if within tolerance
          const tolerance = payment.bill.balance * 0.01; // 1% tolerance
          if (Math.abs(payment.amount - payment.bill.balance) <= tolerance) {
            await this.reconcilePayment(payment.id, PaymentReconciliationStatus.RECONCILED);
            reconciled++;
          } else {
            await this.reconcilePayment(payment.id, PaymentReconciliationStatus.MISMATCH);
          }
        }
      }

      logger.info(`Auto-reconciled ${reconciled} payments`);
      return reconciled;
    } catch (error) {
      logger.error(`Error auto-reconciling payments: ${error}`);
      throw error;
    }
  }

  // Generate reconciliation report
  async generateReconciliationReport(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const payments = await prisma.payment.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          bill: true,
          resident: true,
        },
      });

      const report = {
        period: { startDate, endDate },
        summary: {
          totalPayments: payments.length,
          totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
          reconciled: payments.filter((p) => p.reconciliationStatus === PaymentReconciliationStatus.RECONCILED).length,
          pending: payments.filter((p) => p.reconciliationStatus === PaymentReconciliationStatus.PENDING).length,
          mismatched: payments.filter((p) => p.reconciliationStatus === PaymentReconciliationStatus.MISMATCH).length,
          orphaned: payments.filter((p) => p.reconciliationStatus === PaymentReconciliationStatus.ORPHANED).length,
        },
        details: payments,
      };

      return report;
    } catch (error) {
      logger.error(`Error generating reconciliation report: ${error}`);
      throw error;
    }
  }

  // Bulk reconcile payments
  async bulkReconcilePayments(paymentIds: string[], status: PaymentReconciliationStatus): Promise<number> {
    try {
      const result = await prisma.payment.updateMany({
        where: { id: { in: paymentIds } },
        data: { reconciliationStatus: status },
      });

      logger.info(`Bulk reconciled ${result.count} payments to ${status}`);
      return result.count;
    } catch (error) {
      logger.error(`Error bulk reconciling payments: ${error}`);
      throw error;
    }
  }
}

export default new PaymentReconciliationService();
