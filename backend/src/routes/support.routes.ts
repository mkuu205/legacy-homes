import { Router } from 'express';
import { supportController } from '../controllers/support.controller';
import { authenticate, authorize } from '../middleware/auth';
import multer from 'multer';

const router: import("express").Router = Router();
const upload = multer({ dest: '/tmp/uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

// Resident routes
router.post('/', authenticate, upload.array('attachments', 5), supportController.createTicket.bind(supportController));
router.get('/my-tickets', authenticate, supportController.getMyTickets.bind(supportController));
router.post('/:id/reply', authenticate, upload.array('attachments', 5), supportController.reply.bind(supportController));
router.get('/:id', authenticate, supportController.getById.bind(supportController));

// Admin routes
router.get('/stats/overview', authenticate, authorize('SUPER_ADMIN'), supportController.getStats.bind(supportController));
router.get('/', authenticate, authorize('SUPER_ADMIN'), supportController.getAll.bind(supportController));
router.patch('/:id/status', authenticate, authorize('SUPER_ADMIN'), supportController.updateStatus.bind(supportController));

export default router;
