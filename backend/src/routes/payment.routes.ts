import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Resident routes
router.post('/initiate', authenticate, paymentController.initiatePayment.bind(paymentController));
router.get('/my-payments', authenticate, paymentController.getMyPayments.bind(paymentController));
router.get('/status/:paymentId', authenticate, paymentController.checkStatus.bind(paymentController));
router.delete('/my-history', authenticate, paymentController.clearMyPaymentHistory.bind(paymentController));

// PayHero webhook (no auth - verified by signature)
router.post('/callback', paymentController.handleCallback.bind(paymentController));

// Admin routes
router.get('/stats', authenticate, authorize('SUPER_ADMIN'), paymentController.getStats.bind(paymentController));
router.get('/export/csv', authenticate, authorize('SUPER_ADMIN'), paymentController.exportCSV.bind(paymentController));
router.get('/', authenticate, authorize('SUPER_ADMIN'), paymentController.getAll.bind(paymentController));
router.post('/bulk-delete', authenticate, authorize('SUPER_ADMIN'), paymentController.bulkDelete.bind(paymentController));
router.post('/retry/:paymentId', authenticate, authorize('SUPER_ADMIN'), paymentController.retryVerification.bind(paymentController));
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), paymentController.deletePayment.bind(paymentController));

export default router;
