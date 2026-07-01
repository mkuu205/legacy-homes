import { Request, Response, NextFunction } from 'express';
import { outageService } from '../services/outage.service';

export class OutageController {
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
