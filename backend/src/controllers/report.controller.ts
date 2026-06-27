import { Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';
import { AuthRequest } from '../middleware/auth';

export class ReportController {
  async getDashboardStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await reportService.getAdminDashboardStats();
      res.json({ success: true, data: stats });
    } catch (error) { next(error); }
  }

  async getBillingReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await reportService.getBillingReport(req.query as any);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getRevenueReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await reportService.getRevenueReport(req.query as any);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getOverdueReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await reportService.getOverdueReport();
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getConsumptionReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await reportService.getConsumptionReport(req.query as any);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export const reportController = new ReportController();
// Note: Export methods are handled directly in routes via service calls
