import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { auditService } from '../services/audit.service';

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
      logger.info('Tuma callback received:', JSON.stringify(req.body));
      const result = await paymentService.handleCallback(req.body);
      res.json(result);
    } catch (error) {
      logger.error('Callback error:', error);
      res.status(200).json({ success: true, message: 'Callback received' });
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

  async deletePayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.deletePayment(req.params.id);
      await auditService.logAction({
        userId: req.user!.userId,
        action: 'DELETE_PAYMENT',
        resource: 'Payment',
        resourceId: req.params.id,
        ipAddress: req.ip,
      }).catch(() => {});
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async bulkDelete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      const result = await paymentService.bulkDeletePayments(ids);
      await auditService.logAction({
        userId: req.user!.userId,
        action: 'BULK_DELETE_PAYMENTS',
        resource: 'Payment',
        details: { ids, count: result.deleted },
        ipAddress: req.ip,
      }).catch(() => {});
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async clearMyPaymentHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.clearResidentPaymentHistory(req.user!.userId);
      await auditService.logAction({
        userId: req.user!.userId,
        action: 'CLEAR_PAYMENT_HISTORY',
        resource: 'Payment',
        details: { residentId: req.user!.userId },
        ipAddress: req.ip,
      }).catch(() => {});
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async retryVerification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.retryPaymentVerification(req.params.paymentId);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async exportCSV(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const csv = await paymentService.exportPaymentsCSV(req.query);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
      res.send(csv);
    } catch (error) { next(error); }
  }
}

export const paymentController = new PaymentController();
