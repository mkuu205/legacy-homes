"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentController = exports.PaymentController = void 0;
const payment_service_1 = require("../services/payment.service");
const logger_1 = require("../utils/logger");
class PaymentController {
    async initiatePayment(req, res, next) {
        try {
            const result = await payment_service_1.paymentService.initiateSTKPush({
                ...req.body,
                residentId: req.user.userId,
            });
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async handleCallback(req, res, next) {
        try {
            const signature = req.headers['x-payhero-signature'] || '';
            logger_1.logger.info('PayHero callback received:', JSON.stringify(req.body));
            const result = await payment_service_1.paymentService.handleCallback(req.body, signature);
            res.json(result);
        }
        catch (error) {
            logger_1.logger.error('Callback error:', error);
            res.status(200).json({ received: true }); // Always return 200 to PayHero
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
}
exports.PaymentController = PaymentController;
exports.paymentController = new PaymentController();
//# sourceMappingURL=payment.controller.js.map