import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Resident routes
router.post('/initiate', authenticate, paymentController.initiatePayment.bind(paymentController));
router.get('/my-payments', authenticate, paymentController.getMyPayments.bind(paymentController));
router.get('/status/:paymentId', authenticate, paymentController.checkStatus.bind(paymentController));

// PayHero webhook (no auth - verified by signature)
router.post('/callback', paymentController.handleCallback.bind(paymentController));

// Admin routes
router.get('/stats', authenticate, authorize('SUPER_ADMIN'), paymentController.getStats.bind(paymentController));
router.get('/', authenticate, authorize('SUPER_ADMIN'), paymentController.getAll.bind(paymentController));

export default router;
