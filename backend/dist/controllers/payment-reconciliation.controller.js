"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentReconciliationController = void 0;
const payment_reconciliation_service_1 = __importDefault(require("../services/payment-reconciliation.service"));
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("../utils/logger"));
class PaymentReconciliationController {
    // Get unreconciled payments
    async getUnreconciledPayments(req, res) {
        try {
            const { skip = 0, take = 50 } = req.query;
            const payments = await payment_reconciliation_service_1.default.getUnreconciledPayments(parseInt(skip), parseInt(take));
            res.json(payments);
        }
        catch (error) {
            logger_1.default.error(`Error fetching unreconciled payments: ${error}`);
            res.status(500).json({ error: "Failed to fetch payments" });
        }
    }
    // Get mismatched payments
    async getMismatchedPayments(req, res) {
        try {
            const { skip = 0, take = 50 } = req.query;
            const payments = await payment_reconciliation_service_1.default.getMismatchedPayments(parseInt(skip), parseInt(take));
            res.json(payments);
        }
        catch (error) {
            logger_1.default.error(`Error fetching mismatched payments: ${error}`);
            res.status(500).json({ error: "Failed to fetch payments" });
        }
    }
    // Get orphaned payments
    async getOrphanedPayments(req, res) {
        try {
            const { skip = 0, take = 50 } = req.query;
            const payments = await payment_reconciliation_service_1.default.getOrphanedPayments(parseInt(skip), parseInt(take));
            res.json(payments);
        }
        catch (error) {
            logger_1.default.error(`Error fetching orphaned payments: ${error}`);
            res.status(500).json({ error: "Failed to fetch payments" });
        }
    }
    // Get reconciliation stats
    async getReconciliationStats(req, res) {
        try {
            const stats = await payment_reconciliation_service_1.default.getReconciliationStats();
            res.json(stats);
        }
        catch (error) {
            logger_1.default.error(`Error getting reconciliation stats: ${error}`);
            res.status(500).json({ error: "Failed to get stats" });
        }
    }
    // Reconcile payment
    async reconcilePayment(req, res) {
        try {
            const { paymentId } = req.params;
            const { status } = req.body;
            if (!status || !Object.values(client_1.PaymentReconciliationStatus).includes(status)) {
                res.status(400).json({ error: "Invalid reconciliation status" });
                return;
            }
            const payment = await payment_reconciliation_service_1.default.reconcilePayment(paymentId, status);
            res.json(payment);
        }
        catch (error) {
            logger_1.default.error(`Error reconciling payment: ${error}`);
            res.status(500).json({ error: "Failed to reconcile payment" });
        }
    }
    // Auto-reconcile payments
    async autoReconcilePayments(req, res) {
        try {
            const count = await payment_reconciliation_service_1.default.autoReconcilePayments();
            res.json({ message: `${count} payments auto-reconciled` });
        }
        catch (error) {
            logger_1.default.error(`Error auto-reconciling payments: ${error}`);
            res.status(500).json({ error: "Failed to auto-reconcile payments" });
        }
    }
    // Generate reconciliation report
    async generateReconciliationReport(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const report = await payment_reconciliation_service_1.default.generateReconciliationReport(startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
            res.json(report);
        }
        catch (error) {
            logger_1.default.error(`Error generating reconciliation report: ${error}`);
            res.status(500).json({ error: "Failed to generate report" });
        }
    }
    // Bulk reconcile payments
    async bulkReconcilePayments(req, res) {
        try {
            const { paymentIds, status } = req.body;
            if (!Array.isArray(paymentIds) || !status) {
                res.status(400).json({ error: "Payment IDs and status are required" });
                return;
            }
            const count = await payment_reconciliation_service_1.default.bulkReconcilePayments(paymentIds, status);
            res.json({ message: `${count} payments reconciled` });
        }
        catch (error) {
            logger_1.default.error(`Error bulk reconciling payments: ${error}`);
            res.status(500).json({ error: "Failed to reconcile payments" });
        }
    }
}
exports.PaymentReconciliationController = PaymentReconciliationController;
exports.default = new PaymentReconciliationController();
//# sourceMappingURL=payment-reconciliation.controller.js.map