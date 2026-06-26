"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingController = exports.BillingController = void 0;
const billing_service_1 = require("../services/billing.service");
const audit_service_1 = require("../services/audit.service");
class BillingController {
    async generateMonthlyBills(req, res, next) {
        try {
            const { billingMonth, force } = req.body;
            const result = await billing_service_1.billingService.generateMonthlyBills(billingMonth, force === true || force === 'true');
            // Audit log
            await audit_service_1.auditService.logAction({
                userId: req.user.userId,
                action: 'GENERATE_BILLS',
                resource: 'Bill',
                details: { billingMonth, generated: result.generated, force },
                ipAddress: req.ip,
            }).catch(() => { });
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async checkDuplicateBills(req, res, next) {
        try {
            const { billingMonth } = req.query;
            const prisma = billing_service_1.billingService.prisma || require('../config/prisma').default;
            const count = await require('../config/prisma').default.bill.count({ where: { billingMonth } });
            res.json({ success: true, data: { exists: count > 0, count } });
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
    async deleteBill(req, res, next) {
        try {
            const result = await billing_service_1.billingService.deleteBill(req.params.id);
            await audit_service_1.auditService.logAction({
                userId: req.user.userId,
                action: 'DELETE_BILL',
                resource: 'Bill',
                resourceId: req.params.id,
                ipAddress: req.ip,
            }).catch(() => { });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteBills(req, res, next) {
        try {
            const { ids } = req.body;
            const result = await billing_service_1.billingService.deleteBills(ids);
            await audit_service_1.auditService.logAction({
                userId: req.user.userId,
                action: 'BULK_DELETE_BILLS',
                resource: 'Bill',
                details: { ids, count: result.deleted },
                ipAddress: req.ip,
            }).catch(() => { });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteBillsByMonth(req, res, next) {
        try {
            const { billingMonth } = req.body;
            const result = await billing_service_1.billingService.deleteBillsByMonth(billingMonth);
            await audit_service_1.auditService.logAction({
                userId: req.user.userId,
                action: 'DELETE_BILLS_BY_MONTH',
                resource: 'Bill',
                details: { billingMonth, count: result.deleted },
                ipAddress: req.ip,
            }).catch(() => { });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteAllUnpaidBills(req, res, next) {
        try {
            const result = await billing_service_1.billingService.deleteAllUnpaidBills();
            await audit_service_1.auditService.logAction({
                userId: req.user.userId,
                action: 'DELETE_ALL_UNPAID_BILLS',
                resource: 'Bill',
                details: { count: result.deleted },
                ipAddress: req.ip,
            }).catch(() => { });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async exportCSV(req, res, next) {
        try {
            const csv = await billing_service_1.billingService.exportBillsCSV(req.query);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=bills.csv');
            res.send(csv);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.BillingController = BillingController;
exports.billingController = new BillingController();
//# sourceMappingURL=billing.controller.js.map