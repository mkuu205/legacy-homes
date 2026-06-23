import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Resident routes
router.get('/my', authenticate, notificationController.getMyNotifications.bind(notificationController));
router.patch('/:id/read', authenticate, notificationController.markAsRead.bind(notificationController));
router.patch('/mark-all-read', authenticate, notificationController.markAllAsRead.bind(notificationController));
router.delete('/delete-all', authenticate, notificationController.deleteAllMyNotifications.bind(notificationController));

// Admin routes
router.post('/send', authenticate, authorize('SUPER_ADMIN'), notificationController.send.bind(notificationController));
router.get('/', authenticate, authorize('SUPER_ADMIN'), notificationController.getAll.bind(notificationController));
router.delete('/admin/delete-all', authenticate, authorize('SUPER_ADMIN'), notificationController.adminDeleteAllNotifications.bind(notificationController));

export default router;
