import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class ResidentController {
    getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateProfilePicture(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    adminResetPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const residentController: ResidentController;
//# sourceMappingURL=resident.controller.d.ts.map