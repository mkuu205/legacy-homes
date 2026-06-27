import { Router } from 'express';
import { meterController } from '../controllers/meter.controller';
import { authenticate, authorize } from '../middleware/auth';
import multer from 'multer';

const router: import("express").Router = Router();
const upload = multer({ dest: '/tmp/uploads/', limits: { fileSize: 5 * 1024 * 1024 } });

// Resident routes
router.get('/my-meter', authenticate, meterController.getMyMeter.bind(meterController));

// Admin/Officer routes
router.get('/export/csv', authenticate, authorize('SUPER_ADMIN'), meterController.exportCSV.bind(meterController));
router.get('/', authenticate, authorize('SUPER_ADMIN'), meterController.getAll.bind(meterController));
router.post('/', authenticate, authorize('SUPER_ADMIN'), meterController.create.bind(meterController));
router.get('/:id', authenticate, authorize('SUPER_ADMIN'), meterController.getById.bind(meterController));
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), meterController.update.bind(meterController));
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), meterController.deleteMeter.bind(meterController));
router.get('/:id/readings', authenticate, authorize('SUPER_ADMIN'), meterController.getReadingHistory.bind(meterController));
router.post('/:id/readings', authenticate, authorize('SUPER_ADMIN'), upload.single('photo'), meterController.addReading.bind(meterController));

export default router;
