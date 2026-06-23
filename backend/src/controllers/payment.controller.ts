import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export class PaymentController {
  async initiatePayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.initiateSTKPush({
        ...req.body,
        residentId: req.user!.userId,
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async handleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['x-payhero-signature'] as string || '';
      logger.info('PayHero callback received:', JSON.stringify(req.body));
      const result = await paymentService.handleCallback(req.body, signature);
      res.json(result);
    } catch (error) {
      logger.error('Callback error:', error);
      res.status(200).json({ received: true }); // Always return 200 to PayHero
    }
  }

  async checkStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payment = await paymentService.checkPaymentStatus(req.params.paymentId as string, req.user!.userId);
      res.json({ success: true, data: payment });
    } catch (error) { next(error); }
  }

  async getMyPayments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.getResidentPayments(req.user!.userId, req.query as any);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.getAllPayments(req.query as any);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await paymentService.getPaymentStats();
      res.json({ success: true, data: stats });
    } catch (error) { next(error); }
  }
}

export const paymentController = new PaymentController();
