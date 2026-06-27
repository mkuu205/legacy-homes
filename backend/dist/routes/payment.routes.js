"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Resident routes
router.post('/initiate', auth_1.authenticate, payment_controller_1.paymentController.initiatePayment.bind(payment_controller_1.paymentController));
router.get('/my-payments', auth_1.authenticate, payment_controller_1.paymentController.getMyPayments.bind(payment_controller_1.paymentController));
router.get('/status/:paymentId', auth_1.authenticate, payment_controller_1.paymentController.checkStatus.bind(payment_controller_1.paymentController));
router.delete('/my-history', auth_1.authenticate, payment_controller_1.paymentController.clearMyPaymentHistory.bind(payment_controller_1.paymentController));
// Provider Webhooks / Callbacks
router.post('/tuma/callback', payment_controller_1.paymentController.handleTumaCallback.bind(payment_controller_1.paymentController));
router.post('/pesapal/ipn', payment_controller_1.paymentController.handlePesapalIpn.bind(payment_controller_1.paymentController));
router.get('/pesapal/ipn', payment_controller_1.paymentController.handlePesapalIpn.bind(payment_controller_1.paymentController));
// Diagnostic Routes
router.post('/callback-test', (req, res) => {
    logger_1.logger.info('CALLBACK TEST RECEIVED');
    logger_1.logger.info(JSON.stringify(req.body, null, 2));
    return res.status(200).json({
        success: true
    });
});
router.get('/callback-health', (_req, res) => {
    return res.json({
        success: true,
        message: 'Callback endpoint reachable'
    });
});
// Admin routes
router.get('/system-check', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), payment_controller_1.paymentController.systemCheck.bind(payment_controller_1.paymentController));
router.get('/stats', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), payment_controller_1.paymentController.getStats.bind(payment_controller_1.paymentController));
router.get('/export/csv', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), payment_controller_1.paymentController.exportCSV.bind(payment_controller_1.paymentController));
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), payment_controller_1.paymentController.getAll.bind(payment_controller_1.paymentController));
router.post('/bulk-delete', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), payment_controller_1.paymentController.bulkDelete.bind(payment_controller_1.paymentController));
router.post('/retry/:paymentId', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), payment_controller_1.paymentController.retryVerification.bind(payment_controller_1.paymentController));
router.post('/reconcile/:paymentId', auth_1.authenticate, payment_controller_1.paymentController.retryVerification.bind(payment_controller_1.paymentController));
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), payment_controller_1.paymentController.deletePayment.bind(payment_controller_1.paymentController));
exports.default = router;
//# sourceMappingURL=payment.routes.js.map