"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentController = exports.PaymentController = void 0;
const payment_service_1 = require("../services/payment.service");
const payment_engine_service_1 = require("../services/payment-engine.service");
const paymentEngineService = new payment_engine_service_1.PaymentEngineService();
const logger_1 = require("../utils/logger");
const audit_service_1 = require("../services/audit.service");
class PaymentController {
    async initiatePayment(req, res, next) {
        try {
            const { billId, provider, paymentMethod, phoneNumber, amount } = req.body;
            const result = await paymentEngineService.initiatePayment(billId, req.user.userId, provider, paymentMethod, phoneNumber, amount);
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async handleTumaCallback(req, res, next) {
        try {
            const result = await paymentEngineService.handleCallback('TUMA', req.body);
            res.json(result);
        }
        catch (error) {
            logger_1.logger.error('Tuma callback error:', error);
            res.status(200).json({ success: true, message: 'Callback received' });
        }
    }
    async handlePesapalIpn(req, res, next) {
        try {
            // Pesapal IPN usually sends orderTrackingId in query params
            const payload = Object.keys(req.body).length > 0 ? req.body : req.query;
            const result = await paymentEngineService.handleCallback('PESAPAL', payload);
            res.json(result);
        }
        catch (error) {
            logger_1.logger.error('Pesapal IPN error:', error);
            res.status(200).json({ success: true, message: 'IPN received' });
        }
    }
    async checkStatus(req, res, next) {
        try {
            const payment = await payment_service_1.paymentService.checkPaymentStatus(req.params.paymentId, req.user.userId);
            res.json({ success: true, data: payment });
        }
        catch (error) {
            next(error);
        }
    }
    async getMyPayments(req, res, next) {
        try {
            const result = await payment_service_1.paymentService.getResidentPayments(req.user.userId, req.query);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getAll(req, res, next) {
        try {
            const result = await payment_service_1.paymentService.getAllPayments(req.query);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getStats(req, res, next) {
        try {
            const stats = await payment_service_1.paymentService.getPaymentStats();
            res.json({ success: true, data: stats });
        }
        catch (error) {
            next(error);
        }
    }
    async deletePayment(req, res, next) {
        try {
            const result = await payment_service_1.paymentService.deletePayment(req.params.id);
            await audit_service_1.auditService.logAction({
                userId: req.user.userId,
                action: 'DELETE_PAYMENT',
                resource: 'Payment',
                resourceId: req.params.id,
                ipAddress: req.ip,
            }).catch(() => { });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async bulkDelete(req, res, next) {
        try {
            const { ids } = req.body;
            const result = await payment_service_1.paymentService.bulkDeletePayments(ids);
            await audit_service_1.auditService.logAction({
                userId: req.user.userId,
                action: 'BULK_DELETE_PAYMENTS',
                resource: 'Payment',
                details: { ids, count: result.deleted },
                ipAddress: req.ip,
            }).catch(() => { });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async clearMyPaymentHistory(req, res, next) {
        try {
            const result = await payment_service_1.paymentService.clearResidentPaymentHistory(req.user.userId);
            await audit_service_1.auditService.logAction({
                userId: req.user.userId,
                action: 'CLEAR_PAYMENT_HISTORY',
                resource: 'Payment',
                details: { residentId: req.user.userId },
                ipAddress: req.ip,
            }).catch(() => { });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async retryVerification(req, res, next) {
        try {
            const result = await payment_service_1.paymentService.retryPaymentVerification(req.params.paymentId);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async exportCSV(req, res, next) {
        try {
            const csv = await payment_service_1.paymentService.exportPaymentsCSV(req.query);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
            res.send(csv);
        }
        catch (error) {
            next(error);
        }
    }
    async systemCheck(req, res, next) {
        try {
            const health = await paymentEngineService.checkSystemHealth();
            res.json({ success: true, data: health });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PaymentController = PaymentController;
exports.paymentController = new PaymentController();
//# sourceMappingURL=payment.controller.js.map