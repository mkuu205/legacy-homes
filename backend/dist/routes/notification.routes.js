"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Admin routes must be defined before resident routes to avoid route conflicts
router.post('/send', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), notification_controller_1.notificationController.send.bind(notification_controller_1.notificationController));
router.get('/admin', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), notification_controller_1.notificationController.getAll.bind(notification_controller_1.notificationController));
router.delete('/admin/delete-all', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), notification_controller_1.notificationController.adminDeleteAllNotifications.bind(notification_controller_1.notificationController));
router.get('/admin/logs', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), notification_controller_1.notificationController.getNotificationLogs.bind(notification_controller_1.notificationController));
// Resident routes
router.get('/my', auth_1.authenticate, notification_controller_1.notificationController.getMyNotifications.bind(notification_controller_1.notificationController));
router.patch('/:id/read', auth_1.authenticate, notification_controller_1.notificationController.markAsRead.bind(notification_controller_1.notificationController));
router.patch('/:id/unread', auth_1.authenticate, notification_controller_1.notificationController.markAsUnread.bind(notification_controller_1.notificationController));
router.patch('/mark-all-read', auth_1.authenticate, notification_controller_1.notificationController.markAllAsRead.bind(notification_controller_1.notificationController));
router.delete('/:id', auth_1.authenticate, notification_controller_1.notificationController.deleteOne.bind(notification_controller_1.notificationController));
router.delete('/delete-all', auth_1.authenticate, notification_controller_1.notificationController.deleteAllMyNotifications.bind(notification_controller_1.notificationController));
exports.default = router;
//# sourceMappingURL=notification.routes.js.map