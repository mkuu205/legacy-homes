"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingController = exports.BillingController = void 0;
const billing_service_1 = require("../services/billing.service");
class BillingController {
    async generateMonthlyBills(req, res, next) {
        try {
            const { billingMonth } = req.body;
            const result = await billing_service_1.billingService.generateMonthlyBills(billingMonth);
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getAll(req, res, next) {
        try {
            const result = await billing_service_1.billingService.getAllBills(req.query);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const bill = await billing_service_1.billingService.getBillById(req.params.id);
            res.json({ success: true, data: bill });
        }
        catch (error) {
            next(error);
        }
    }
    async getMyBills(req, res, next) {
        try {
            const result = await billing_service_1.billingService.getResidentBills(req.user.userId, req.query);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getStatement(req, res, next) {
        try {
            const residentId = req.params.residentId || req.user.userId;
            const statement = await billing_service_1.billingService.getResidentStatement(residentId);
            res.json({ success: true, data: statement });
        }
        catch (error) {
            next(error);
        }
    }
    async getStats(req, res, next) {
        try {
            const stats = await billing_service_1.billingService.getBillingStats();
            res.json({ success: true, data: stats });
        }
        catch (error) {
            next(error);
        }
    }
    async markOverdue(req, res, next) {
        try {
            const result = await billing_service_1.billingService.markOverdueBills();
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async downloadInvoice(req, res, next) {
        try {
            const { id } = req.params;
            const result = await billing_service_1.billingService.generateInvoicePDF(id);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
            res.send(result.pdfBuffer);
        }
        catch (error) {
            next(error);
        }
    }
    async downloadReceipt(req, res, next) {
        try {
            const { paymentId } = req.params;
            const result = await billing_service_1.billingService.generateReceiptPDF(paymentId);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
            res.send(result.pdfBuffer);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.BillingController = BillingController;
exports.billingController = new BillingController();
//# sourceMappingURL=billing.controller.js.map