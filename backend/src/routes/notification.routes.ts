import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate, authorize } from '../middleware/auth';
const router: import("express").Router = Router();

// ─── Admin routes ───────────────────────────────────────────────────────────

router.post('/send', authenticate, authorize('SUPER_ADMIN'), notificationController.send.bind(notificationController));

// GET /api/notifications  — admin notifications list (used by admin notifications page)
router.get('/', authenticate, authorize('SUPER_ADMIN'), notificationController.getAll.bind(notificationController));

router.get('/admin', authenticate, authorize('SUPER_ADMIN'), notificationController.getAll.bind(notificationController));

// Alias for admin layout unread count polling (GET /notifications/all)
router.get('/all', authenticate, authorize('SUPER_ADMIN'), notificationController.getAll.bind(notificationController));

router.delete('/admin/delete-all', authenticate, authorize('SUPER_ADMIN'), notificationController.adminDeleteAllNotifications.bind(notificationController));
router.get('/admin/logs', authenticate, authorize('SUPER_ADMIN'), notificationController.getNotificationLogs.bind(notificationController));

// ─── Resident routes (static paths MUST come before parameterized :id routes) ─

router.get('/my', authenticate, notificationController.getMyNotifications.bind(notificationController));

// GET /api/notifications/unread — unread count for the authenticated user
router.get('/unread', authenticate, notificationController.getUnreadCount.bind(notificationController));

router.patch('/mark-all-read', authenticate, notificationController.markAllAsRead.bind(notificationController));

// PUT aliases (spec requires PUT, existing code uses PATCH — support both)
router.put('/read-all', authenticate, notificationController.markAllAsRead.bind(notificationController));

router.delete('/delete-all', authenticate, notificationController.deleteAllMyNotifications.bind(notificationController));

// ─── Parameterized routes ────────────────────────────────────────────────────

router.patch('/:id/read', authenticate, notificationController.markAsRead.bind(notificationController));
router.put('/:id/read', authenticate, notificationController.markAsRead.bind(notificationController));

router.patch('/:id/unread', authenticate, notificationController.markAsUnread.bind(notificationController));

router.delete('/:id', authenticate, notificationController.deleteOne.bind(notificationController));

export default router;
