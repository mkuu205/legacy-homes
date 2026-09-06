import { Router } from 'express';
import { monitoringController } from '../controllers/monitoring.controller';
import { authenticate, authorize } from '../middleware/auth';

const router: import('express').Router = Router();

router.get('/status', authenticate, authorize('SUPER_ADMIN'), monitoringController.getStatus.bind(monitoringController));

export default router;
