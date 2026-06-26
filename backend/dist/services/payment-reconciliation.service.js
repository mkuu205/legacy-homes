"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentReconciliationService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class PaymentReconciliationService {
    // Reconcile a payment
    async reconcilePayment(paymentId, status) {
        try {
            const payment = await prisma.payment.update({
                where: { id: paymentId },
                data: { reconciliationStatus: status },
            });
            logger_1.logger.info(`Payment reconciled: ${paymentId} - ${status}`);
            return payment;
        }
        catch (error) {
            logger_1.logger.error(`Error reconciling payment: ${error}`);
            throw error;
        }
    }
    // Get unreconciled payments
    async getUnreconciledPayments(skip = 0, take = 50) {
        try {
            const payments = await prisma.payment.findMany({
                where: {
                    reconciliationStatus: client_1.PaymentReconciliationStatus.PENDING,
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
        }
        catch (error) {
            logger_1.logger.error(`Error fetching unreconciled payments: ${error}`);
            throw error;
        }
    }
    // Get mismatched payments
    async getMismatchedPayments(skip = 0, take = 50) {
        try {
            const payments = await prisma.payment.findMany({
                where: {
                    reconciliationStatus: client_1.PaymentReconciliationStatus.MISMATCH,
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
        }
        catch (error) {
            logger_1.logger.error(`Error fetching mismatched payments: ${error}`);
            throw error;
        }
    }
    // Get orphaned payments (no matching bill)
    async getOrphanedPayments(skip = 0, take = 50) {
        try {
            const payments = await prisma.payment.findMany({
                where: {
                    reconciliationStatus: client_1.PaymentReconciliationStatus.ORPHANED,
                },
                include: {
                    resident: { select: { id: true, fullName: true, email: true } },
                },
                skip,
                take,
                orderBy: { createdAt: "desc" },
            });
            return payments;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching orphaned payments: ${error}`);
            throw error;
        }
    }
    // Get reconciliation statistics
    async getReconciliationStats() {
        try {
            const [total, reconciled, pending, mismatched, orphaned] = await Promise.all([
                prisma.payment.count(),
                prisma.payment.count({ where: { reconciliationStatus: client_1.PaymentReconciliationStatus.RECONCILED } }),
                prisma.payment.count({ where: { reconciliationStatus: client_1.PaymentReconciliationStatus.PENDING } }),
                prisma.payment.count({ where: { reconciliationStatus: client_1.PaymentReconciliationStatus.MISMATCH } }),
                prisma.payment.count({ where: { reconciliationStatus: client_1.PaymentReconciliationStatus.ORPHANED } }),
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
        }
        catch (error) {
            logger_1.logger.error(`Error getting reconciliation stats: ${error}`);
            throw error;
        }
    }
    // Auto-reconcile payments based on amount matching
    async autoReconcilePayments() {
        try {
            const pendingPayments = await prisma.payment.findMany({
                where: { reconciliationStatus: client_1.PaymentReconciliationStatus.PENDING },
                include: { bill: true },
            });
            let reconciled = 0;
            for (const payment of pendingPayments) {
                if (payment.bill && payment.amount === payment.bill.balance) {
                    await this.reconcilePayment(payment.id, client_1.PaymentReconciliationStatus.RECONCILED);
                    reconciled++;
                }
                else if (payment.bill && payment.amount < payment.bill.balance) {
                    // Partial payment - still reconcile if within tolerance
                    const tolerance = payment.bill.balance * 0.01; // 1% tolerance
                    if (Math.abs(payment.amount - payment.bill.balance) <= tolerance) {
                        await this.reconcilePayment(payment.id, client_1.PaymentReconciliationStatus.RECONCILED);
                        reconciled++;
                    }
                    else {
                        await this.reconcilePayment(payment.id, client_1.PaymentReconciliationStatus.MISMATCH);
                    }
                }
            }
            logger_1.logger.info(`Auto-reconciled ${reconciled} payments`);
            return reconciled;
        }
        catch (error) {
            logger_1.logger.error(`Error auto-reconciling payments: ${error}`);
            throw error;
        }
    }
    // Generate reconciliation report
    async generateReconciliationReport(startDate, endDate) {
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
                    reconciled: payments.filter((p) => p.reconciliationStatus === client_1.PaymentReconciliationStatus.RECONCILED).length,
                    pending: payments.filter((p) => p.reconciliationStatus === client_1.PaymentReconciliationStatus.PENDING).length,
                    mismatched: payments.filter((p) => p.reconciliationStatus === client_1.PaymentReconciliationStatus.MISMATCH).length,
                    orphaned: payments.filter((p) => p.reconciliationStatus === client_1.PaymentReconciliationStatus.ORPHANED).length,
                },
                details: payments,
            };
            return report;
        }
        catch (error) {
            logger_1.logger.error(`Error generating reconciliation report: ${error}`);
            throw error;
        }
    }
    // Bulk reconcile payments
    async bulkReconcilePayments(paymentIds, status) {
        try {
            const result = await prisma.payment.updateMany({
                where: { id: { in: paymentIds } },
                data: { reconciliationStatus: status },
            });
            logger_1.logger.info(`Bulk reconciled ${result.count} payments to ${status}`);
            return result.count;
        }
        catch (error) {
            logger_1.logger.error(`Error bulk reconciling payments: ${error}`);
            throw error;
        }
    }
}
exports.PaymentReconciliationService = PaymentReconciliationService;
exports.default = new PaymentReconciliationService();
//# sourceMappingURL=payment-reconciliation.service.js.map