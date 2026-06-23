import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class SupportController {
    createTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getMyTickets(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    reply(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const supportController: SupportController;
//# sourceMappingURL=support.controller.d.ts.map