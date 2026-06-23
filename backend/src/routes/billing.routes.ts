import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Resident routes
router.get('/my-bills', authenticate, billingController.getMyBills.bind(billingController));
router.get('/my-statement', authenticate, billingController.getStatement.bind(billingController));

// Admin/Officer routes
router.get('/stats', authenticate, authorize('SUPER_ADMIN'), billingController.getStats.bind(billingController));
router.get('/', authenticate, authorize('SUPER_ADMIN'), billingController.getAll.bind(billingController));
router.post('/generate', authenticate, authorize('SUPER_ADMIN'), billingController.generateMonthlyBills.bind(billingController));
router.post('/mark-overdue', authenticate, authorize('SUPER_ADMIN'), billingController.markOverdue.bind(billingController));
router.get('/statement/:residentId', authenticate, authorize('SUPER_ADMIN'), billingController.getStatement.bind(billingController));
router.get('/:id', authenticate, billingController.getById.bind(billingController));
router.get('/:id/invoice', authenticate, billingController.downloadInvoice.bind(billingController));
router.get('/receipt/:paymentId', authenticate, billingController.downloadReceipt.bind(billingController));

export default router;
