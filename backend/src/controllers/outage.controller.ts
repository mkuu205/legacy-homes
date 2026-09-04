import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { outageService } from '../services/outage.service';

export class OutageController {
  async syncRecipients(req: Request, res: Response, next: NextFunction) {
    try {
      const configuredSecret = process.env.OUTAGE_MONITOR_SECRET;
      const suppliedSecret = req.header('x-outage-monitor-secret') || '';
      if (!configuredSecret || suppliedSecret.length !== configuredSecret.length ||
          !timingSafeEqual(Buffer.from(suppliedSecret), Buffer.from(configuredSecret))) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const snapshot = await outageService.getRecipientSnapshot();
      res.json({ success: true, ...snapshot });
    } catch (error) {
      next(error);
    }
  }
}

export const outageController = new OutageController();
