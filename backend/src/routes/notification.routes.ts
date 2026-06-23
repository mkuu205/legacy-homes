import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Admin routes must be defined before resident routes to avoid route conflicts
router.post('/send', authenticate, authorize('SUPER_ADMIN'), notificationController.send.bind(notificationController));
router.get('/admin', authenticate, authorize('SUPER_ADMIN'), notificationController.getAll.bind(notificationController));
router.delete('/admin/delete-all', authenticate, authorize('SUPER_ADMIN'), notificationController.adminDeleteAllNotifications.bind(notificationController));
router.get('/admin/logs', authenticate, authorize('SUPER_ADMIN'), notificationController.getNotificationLogs.bind(notificationController));

// Resident routes
router.get('/my', authenticate, notificationController.getMyNotifications.bind(notificationController));
router.patch('/:id/read', authenticate, notificationController.markAsRead.bind(notificationController));
router.patch('/:id/unread', authenticate, notificationController.markAsUnread.bind(notificationController));
router.patch('/mark-all-read', authenticate, notificationController.markAllAsRead.bind(notificationController));
router.delete('/:id', authenticate, notificationController.deleteOne.bind(notificationController));
router.delete('/delete-all', authenticate, notificationController.deleteAllMyNotifications.bind(notificationController));



export default router;
