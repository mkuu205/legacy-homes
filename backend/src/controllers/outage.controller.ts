import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { outageService } from '../services/outage.service';

export class OutageController {
  async recover(req: Request, res: Response, next: NextFunction) {
    try {
      const configuredSecret = process.env.OUTAGE_MONITOR_SECRET;
      const suppliedSecret = req.header('x-outage-monitor-secret') || '';
      if (!configuredSecret || suppliedSecret.length !== configuredSecret.length ||
          !timingSafeEqual(Buffer.from(suppliedSecret), Buffer.from(configuredSecret))) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      await outageService.notifySubscribers();
      res.json({ success: true, message: 'Recovery notifications processed' });
    } catch (error) {
      next(error);
    }
  }

  async subscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      await outageService.subscribe(email);
      
      res.json({
        success: true,
        message: "We'll notify you when Legacy Homes is back online."
      });
    } catch (error: any) {
      if (error.message === 'Invalid email format') {
        return res.status(400).json({ success: false, message: error.message });
      }
      next(error);
    }
  }
}

export const outageController = new OutageController();
