import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { PaymentEngineService } from '../services/payment-engine.service';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { auditService } from '../services/audit.service';

const paymentEngineService = new PaymentEngineService();

export class PaymentController {
  /**
   * Initiate a payment through the selected provider
   */
  async initiatePayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { billId, provider, paymentMethod, phoneNumber, amount } = req.body;
      
      logger.info(`[PAYMENT CONTROLLER] Initiating payment for bill ${billId} via ${provider}`);
      
      const result = await paymentEngineService.initiatePayment(
        billId,
        req.user!.userId,
        provider,
        paymentMethod,
        phoneNumber,
        amount
      );
      
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      logger.error('[PAYMENT CONTROLLER] Initiation error:', error);
      next(error);
    }
  }

  /**
   * Handle Pesapal IPN (Callback)
   */
  async handlePesapalIpn(req: Request, res: Response, next: NextFunction) {
    try {
      // Pesapal v3 sends OrderTrackingId and OrderMerchantReference in the request
      const payload = Object.keys(req.body).length > 0 ? req.body : req.query;
      
      logger.info(`[PAYMENT CONTROLLER] Pesapal IPN received: ${JSON.stringify(payload)}`);
      
      const result = await paymentEngineService.handleCallback('PESAPAL', payload, undefined, req.headers);
      
      // Pesapal expects a response to acknowledge receipt of IPN
      res.status(200).json(result);
    } catch (error) {
      logger.error('[PAYMENT CONTROLLER] Pesapal IPN error:', error);
      // Always return 200 to Pesapal to avoid excessive retries if we've logged it
      res.status(200).json({ success: true, message: 'IPN received' });
    }
  }


  /**
   * Verify payment status (Resident manual check or retry)
   */
  async checkStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const paymentId = req.params.paymentId;
      const result = await paymentEngineService.verifyPaymentStatus(paymentId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retry verification (Admin)
   */
  async retryVerification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentEngineService.verifyPaymentStatus(req.params.paymentId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
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

  async exportCSV(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const csv = await paymentService.exportPaymentsCSV(req.query);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
      res.send(csv);
    } catch (error) { next(error); }
  }

  async systemCheck(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const health = await paymentEngineService.checkSystemHealth();
      res.json({ success: true, data: health });
    } catch (error) { next(error); }
  }
}

export const paymentController = new PaymentController();
