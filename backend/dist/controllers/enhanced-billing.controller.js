"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedBillingController = void 0;
const enhanced_billing_service_1 = __importDefault(require("../services/enhanced-billing.service"));
const collection_service_1 = __importDefault(require("../services/collection.service"));
const logger_1 = __importDefault(require("../utils/logger"));
class EnhancedBillingController {
    // Lock bill
    async lockBill(req, res) {
        try {
            const { billId } = req.params;
            const bill = await enhanced_billing_service_1.default.lockBill(billId);
            res.json(bill);
        }
        catch (error) {
            logger_1.default.error(`Error locking bill: ${error}`);
            res.status(500).json({ error: "Failed to lock bill" });
        }
    }
    // Unlock bill
    async unlockBill(req, res) {
        try {
            const { billId } = req.params;
            const bill = await enhanced_billing_service_1.default.unlockBill(billId);
            res.json(bill);
        }
        catch (error) {
            logger_1.default.error(`Error unlocking bill: ${error}`);
            res.status(500).json({ error: "Failed to unlock bill" });
        }
    }
    // Create final bill
    async createFinalBill(req, res) {
        try {
            const { residentId } = req.params;
            const { totalAmount, reason } = req.body;
            if (!totalAmount || !reason) {
                res.status(400).json({ error: "Total amount and reason are required" });
                return;
            }
            const bill = await enhanced_billing_service_1.default.createFinalBill(residentId, { totalAmount, reason });
            res.status(201).json(bill);
        }
        catch (error) {
            logger_1.default.error(`Error creating final bill: ${error}`);
            res.status(500).json({ error: "Failed to create final bill" });
        }
    }
    // Get locked bills
    async getLockedBills(req, res) {
        try {
            const { skip = 0, take = 50 } = req.query;
            const bills = await enhanced_billing_service_1.default.getLockedBills(parseInt(skip), parseInt(take));
            res.json(bills);
        }
        catch (error) {
            logger_1.default.error(`Error fetching locked bills: ${error}`);
            res.status(500).json({ error: "Failed to fetch bills" });
        }
    }
    // Get unpaid bills for collection
    async getUnpaidBillsForCollection(req, res) {
        try {
            const { skip = 0, take = 50 } = req.query;
            const bills = await enhanced_billing_service_1.default.getUnpaidBillsForCollection(parseInt(skip), parseInt(take));
            res.json(bills);
        }
        catch (error) {
            logger_1.default.error(`Error fetching unpaid bills: ${error}`);
            res.status(500).json({ error: "Failed to fetch bills" });
        }
    }
    // Get overdue bills
    async getOverdueBills(req, res) {
        try {
            const { skip = 0, take = 50 } = req.query;
            const bills = await enhanced_billing_service_1.default.getOverdueBills(parseInt(skip), parseInt(take));
            res.json(bills);
        }
        catch (error) {
            logger_1.default.error(`Error fetching overdue bills: ${error}`);
            res.status(500).json({ error: "Failed to fetch bills" });
        }
    }
    // Get collection stats
    async getCollectionStats(req, res) {
        try {
            const stats = await enhanced_billing_service_1.default.getCollectionStats();
            res.json(stats);
        }
        catch (error) {
            logger_1.default.error(`Error getting collection stats: ${error}`);
            res.status(500).json({ error: "Failed to get stats" });
        }
    }
    // Get collection performance by month
    async getCollectionPerformanceByMonth(req, res) {
        try {
            const { months = 12 } = req.query;
            const performance = await enhanced_billing_service_1.default.getCollectionPerformanceByMonth(parseInt(months));
            res.json(performance);
        }
        catch (error) {
            logger_1.default.error(`Error getting collection performance: ${error}`);
            res.status(500).json({ error: "Failed to get performance data" });
        }
    }
    // Bulk lock bills for cycle
    async bulkLockBillsForCycle(req, res) {
        try {
            const { billingMonth } = req.body;
            if (!billingMonth) {
                res.status(400).json({ error: "Billing month is required" });
                return;
            }
            const count = await enhanced_billing_service_1.default.bulkLockBillsForCycle(billingMonth);
            res.json({ message: `${count} bills locked` });
        }
        catch (error) {
            logger_1.default.error(`Error bulk locking bills: ${error}`);
            res.status(500).json({ error: "Failed to lock bills" });
        }
    }
    // Bulk unlock bills for cycle
    async bulkUnlockBillsForCycle(req, res) {
        try {
            const { billingMonth } = req.body;
            if (!billingMonth) {
                res.status(400).json({ error: "Billing month is required" });
                return;
            }
            const count = await enhanced_billing_service_1.default.bulkUnlockBillsForCycle(billingMonth);
            res.json({ message: `${count} bills unlocked` });
        }
        catch (error) {
            logger_1.default.error(`Error bulk unlocking bills: ${error}`);
            res.status(500).json({ error: "Failed to unlock bills" });
        }
    }
    // Get collection metrics
    async getCollectionMetrics(req, res) {
        try {
            const metrics = await collection_service_1.default.getCollectionMetrics();
            res.json(metrics);
        }
        catch (error) {
            logger_1.default.error(`Error getting collection metrics: ${error}`);
            res.status(500).json({ error: "Failed to get metrics" });
        }
    }
    // Get top debtors
    async getTopDebtors(req, res) {
        try {
            const { limit = 10 } = req.query;
            const debtors = await collection_service_1.default.getTopDebtors(parseInt(limit));
            res.json(debtors);
        }
        catch (error) {
            logger_1.default.error(`Error getting top debtors: ${error}`);
            res.status(500).json({ error: "Failed to get debtors" });
        }
    }
    // Get resident collection status
    async getResidentCollectionStatus(req, res) {
        try {
            const { residentId } = req.params;
            const status = await collection_service_1.default.getResidentCollectionStatus(residentId);
            res.json(status);
        }
        catch (error) {
            logger_1.default.error(`Error getting resident collection status: ${error}`);
            res.status(500).json({ error: "Failed to get status" });
        }
    }
    // Get collection timeline
    async getCollectionTimeline(req, res) {
        try {
            const { billId } = req.params;
            const timeline = await collection_service_1.default.getCollectionTimeline(billId);
            res.json(timeline);
        }
        catch (error) {
            logger_1.default.error(`Error getting collection timeline: ${error}`);
            res.status(500).json({ error: "Failed to get timeline" });
        }
    }
    // Get collection efficiency score
    async getCollectionEfficiencyScore(req, res) {
        try {
            const score = await collection_service_1.default.getCollectionEfficiencyScore();
            res.json({ score });
        }
        catch (error) {
            logger_1.default.error(`Error getting collection efficiency score: ${error}`);
            res.status(500).json({ error: "Failed to get score" });
        }
    }
}
exports.EnhancedBillingController = EnhancedBillingController;
exports.default = new EnhancedBillingController();
//# sourceMappingURL=enhanced-billing.controller.js.map