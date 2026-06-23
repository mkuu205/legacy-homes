import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class ReportController {
    getDashboardStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getBillingReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getRevenueReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getOverdueReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getConsumptionReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const reportController: ReportController;
//# sourceMappingURL=report.controller.d.ts.map