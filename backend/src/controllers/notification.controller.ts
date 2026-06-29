import { Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      // Always return a safe shape — never undefined
      res.json({
        success: true,
        data: {
          notifications: result?.notifications ?? [],
          pagination: result?.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 },
          unread: result?.unread ?? 0,
        },
      });
    } catch (error) {
      // Return empty list instead of crashing
      res.json({ success: true, data: { notifications: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 }, unread: 0 } });
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.getResidentNotifications(req.user!.userId, { page: 1, limit: 1 });
      res.json({ success: true, unread: result?.unread ?? 0 });
    } catch (error) {
      res.json({ success: true, unread: 0 });
    }
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
      // Always return a safe shape — never undefined
      res.json({
        success: true,
        data: {
          notifications: result?.notifications ?? [],
          pagination: result?.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 },
          unreadCount: result?.unreadCount ?? 0,
        },
      });
    } catch (error) {
      res.json({ success: true, data: { notifications: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 }, unreadCount: 0 } });
    }
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

  async registerDevice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token, platform, deviceName } = req.body;
      const residentId = req.user!.userId;

      const deviceToken = await prisma.deviceToken.upsert({
        where: { token },
        update: {
          residentId,
          platform,
          deviceName,
          active: true,
          lastSeenAt: new Date(),
        },
        create: {
          token,
          residentId,
          platform,
          deviceName,
          active: true,
        },
      });

      res.json({ success: true, data: deviceToken });
    } catch (error) {
      next(error);
    }
  }

  async removeDevice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      
      await prisma.deviceToken.update({
        where: { token },
        data: { active: false },
      });

      res.json({ success: true, message: 'Device token removed' });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
