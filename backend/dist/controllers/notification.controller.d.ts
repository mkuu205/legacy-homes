import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class NotificationController {
    send(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getMyNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    markAsUnread(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    markAllAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteOne(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getNotificationLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteAllMyNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    adminDeleteAllNotifications(_req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const notificationController: NotificationController;
//# sourceMappingURL=notification.controller.d.ts.map