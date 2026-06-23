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
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
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
    async markAllAsRead(req, res, next) {
        try {
            const result = await notification_service_1.notificationService.markAllAsRead(req.user.userId);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async getAll(req, res, next) {
        try {
            const result = await notification_service_1.notificationService.getAllNotifications(req.query);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
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