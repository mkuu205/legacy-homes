import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { monitoringService } from '../services/monitoring.service';

export class MonitoringController {
  async getStatus(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await monitoringService.runChecks('admin-system-check');
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async runInternalCheck(req: Request, res: Response, next: NextFunction) {
    try {
      const configuredSecret = process.env.OUTAGE_MONITOR_SECRET || '';
      const suppliedSecret = req.header('x-outage-monitor-secret') || '';
      if (!configuredSecret || suppliedSecret.length !== configuredSecret.length || !timingSafeEqual(Buffer.from(suppliedSecret), Buffer.from(configuredSecret))) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const data = await monitoringService.runChecks('external-monitor');
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const monitoringController = new MonitoringController();
