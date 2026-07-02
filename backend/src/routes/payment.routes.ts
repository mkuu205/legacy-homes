// src/routes/payment.routes.ts
import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router: import("express").Router = Router();

// ============================================
// RESIDENT ROUTES
// ============================================
router.post('/initiate', authenticate, paymentController.initiatePayment.bind(paymentController));
router.get('/my-payments', authenticate, paymentController.getMyPayments.bind(paymentController));
router.get('/status/:paymentId', authenticate, paymentController.checkStatus.bind(paymentController));
router.post('/verify/:paymentId', authenticate, paymentController.retryVerification.bind(paymentController));
router.delete('/my-history', authenticate, paymentController.clearMyPaymentHistory.bind(paymentController));

// ============================================
// PROVIDER WEBHOOKS / CALLBACKS (Public - No Auth)
// ============================================

// ✅ Pesapal Callback - GET (redirect from Pesapal)
router.get('/callback', paymentController.handlePesapalCallback.bind(paymentController));

// ✅ Pesapal IPN (supports both GET and POST)
router.post('/pesapal/ipn', paymentController.handlePesapalIpn.bind(paymentController));
router.get('/pesapal/ipn', paymentController.handlePesapalIpn.bind(paymentController));

// ✅ TUMA Callback - POST
router.post('/tuma/callback', paymentController.handleTumaCallback.bind(paymentController));

// Also handle TUMA on the generic callback endpoint
router.post('/callback', paymentController.handleTumaCallback.bind(paymentController));

// ============================================
// ADMIN ROUTES
// ============================================
router.get('/system-check', authenticate, authorize('SUPER_ADMIN'), paymentController.systemCheck.bind(paymentController));
router.get('/stats', authenticate, authorize('SUPER_ADMIN'), paymentController.getStats.bind(paymentController));
router.get('/export/csv', authenticate, authorize('SUPER_ADMIN'), paymentController.exportCSV.bind(paymentController));
router.get('/', authenticate, authorize('SUPER_ADMIN'), paymentController.getAll.bind(paymentController));
router.post('/bulk-delete', authenticate, authorize('SUPER_ADMIN'), paymentController.bulkDelete.bind(paymentController));
router.post('/retry/:paymentId', authenticate, authorize('SUPER_ADMIN'), paymentController.retryVerification.bind(paymentController));
router.delete('/:id', authenticate, paymentController.deletePayment.bind(paymentController));

export default router;
