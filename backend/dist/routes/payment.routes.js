"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Resident routes
router.post('/initiate', auth_1.authenticate, payment_controller_1.paymentController.initiatePayment.bind(payment_controller_1.paymentController));
router.get('/my-payments', auth_1.authenticate, payment_controller_1.paymentController.getMyPayments.bind(payment_controller_1.paymentController));
router.get('/status/:paymentId', auth_1.authenticate, payment_controller_1.paymentController.checkStatus.bind(payment_controller_1.paymentController));
// PayHero webhook (no auth - verified by signature)
router.post('/callback', payment_controller_1.paymentController.handleCallback.bind(payment_controller_1.paymentController));
// Admin routes
router.get('/stats', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), payment_controller_1.paymentController.getStats.bind(payment_controller_1.paymentController));
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), payment_controller_1.paymentController.getAll.bind(payment_controller_1.paymentController));
exports.default = router;
//# sourceMappingURL=payment.routes.js.map