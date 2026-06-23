import { Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { AuthRequest } from '../middleware/auth';

export class NotificationController {
  async send(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.sendBroadcast({
        ...req.body,
        sentBy: req.user!.userId,
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getMyNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.getResidentNotifications(req.user!.userId, req.query as any);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.markAsRead(req.user!.userId, req.params.id as string);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async markAsUnread(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.markAsUnread(req.user!.userId, req.params.id as string);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.markAllAsRead(req.user!.userId);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async deleteOne(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.deleteOne(req.user!.userId, req.params.id as string);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getNotificationLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.getNotificationLogs(req.query as any);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.getAllNotifications(req.query as any);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async deleteAllMyNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.deleteAllResidentNotifications(req.user!.userId);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async adminDeleteAllNotifications(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.adminDeleteAllNotifications();
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

}

export const notificationController = new NotificationController();
