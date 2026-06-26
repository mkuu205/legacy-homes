"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationController = exports.NotificationController = void 0;
const notification_service_1 = require("../services/notification.service");
class NotificationController {
    async send(req, res, next) {
        try {
            const result = await notification_service_1.notificationService.sendBroadcast({
                ...req.body,
                sentBy: req.user.userId,
            });
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getMyNotifications(req, res, next) {
        try {
            const result = await notification_service_1.notificationService.getResidentNotifications(req.user.userId, req.query);
            // Always return a safe shape — never undefined
            res.json({
                success: true,
                data: {
                    notifications: result?.notifications ?? [],
                    pagination: result?.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 },
                    unread: result?.unread ?? 0,
                },
            });
        }
        catch (error) {
            // Return empty list instead of crashing
            res.json({ success: true, data: { notifications: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 }, unread: 0 } });
        }
    }
    async getUnreadCount(req, res, next) {
        try {
            const result = await notification_service_1.notificationService.getResidentNotifications(req.user.userId, { page: 1, limit: 1 });
            res.json({ success: true, unread: result?.unread ?? 0 });
        }
        catch (error) {
            res.json({ success: true, unread: 0 });
        }
    }
    async markAsRead(req, res, next) {
        try {
            const result = await notification_service_1.notificationService.markAsRead(req.user.userId, req.params.id);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async markAsUnread(req, res, next) {
        try {
            const result = await notification_service_1.notificationService.markAsUnread(req.user.userId, req.params.id);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async markAllAsRead(req, res, next) {
        try {
            const result = await notification_service_1.notificationService.markAllAsRead(req.user.userId);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteOne(req, res, next) {
        try {
            const result = await notification_service_1.notificationService.deleteOne(req.user.userId, req.params.id);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async getNotificationLogs(req, res, next) {
        try {
            const result = await notification_service_1.notificationService.getNotificationLogs(req.query);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getAll(req, res, next) {
        try {
            const result = await notification_service_1.notificationService.getAllNotifications(req.query);
            // Always return a safe shape — never undefined
            res.json({
                success: true,
                data: {
                    notifications: result?.notifications ?? [],
                    pagination: result?.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 },
                    unreadCount: result?.unreadCount ?? 0,
                },
            });
        }
        catch (error) {
            res.json({ success: true, data: { notifications: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 }, unreadCount: 0 } });
        }
    }
    async deleteAllMyNotifications(req, res, next) {
        try {
            const result = await notification_service_1.notificationService.deleteAllResidentNotifications(req.user.userId);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async adminDeleteAllNotifications(_req, res, next) {
        try {
            const result = await notification_service_1.notificationService.adminDeleteAllNotifications();
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.NotificationController = NotificationController;
exports.notificationController = new NotificationController();
//# sourceMappingURL=notification.controller.js.map