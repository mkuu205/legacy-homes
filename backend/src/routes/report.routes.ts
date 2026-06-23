import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authenticate, authorize('SUPER_ADMIN'), reportController.getDashboardStats.bind(reportController));
router.get('/billing', authenticate, authorize('SUPER_ADMIN'), reportController.getBillingReport.bind(reportController));
router.get('/revenue', authenticate, authorize('SUPER_ADMIN'), reportController.getRevenueReport.bind(reportController));
router.get('/overdue', authenticate, authorize('SUPER_ADMIN'), reportController.getOverdueReport.bind(reportController));
router.get('/consumption', authenticate, authorize('SUPER_ADMIN'), reportController.getConsumptionReport.bind(reportController));

export default router;
