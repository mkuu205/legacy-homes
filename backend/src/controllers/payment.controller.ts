// src/controllers/payment.controller.ts
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
   * Handle TUMA Callback (STK Push)
   */
  async handleTumaCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body;
      
      logger.info('[TUMA CALLBACK] Received callback:', { 
        merchant_request_id: payload.merchant_request_id,
        checkout_request_id: payload.checkout_request_id,
        result_code: payload.result_code,
        status: payload.status,
      });
      
      const result = await paymentEngineService.handleCallback(
        'TUMA',
        payload,
        undefined,
        req.headers as any
      );
      
      // Tuma expects a 200 OK response
      // Always return 200 to prevent Tuma from retrying
      res.status(200).json({
        status: 'success',
        message: 'Callback processed',
        data: result,
      });
    } catch (error) {
      logger.error('[TUMA CALLBACK] Error:', error);
      // Always return 200 to prevent Tuma from retrying
      res.status(200).json({
        status: 'error',
        message: 'Callback processing failed',
      });
    }
  }

  /**
   * Handle Pesapal IPN (Callback)
   */
  async handlePesapalIpn(req: Request, res: Response, next: NextFunction) {
    try {
      // Pesapal v3 sends OrderTrackingId and OrderMerchantReference in the request
      const payload = Object.keys(req.body).length > 0 ? req.body : req.query;
      
      logger.info(`[PESAPAL IPN] Received: ${JSON.stringify(payload)}`);
      
      const result = await paymentEngineService.handleCallback('PESAPAL', payload, undefined, req.headers);
      
      // Pesapal expects a response to acknowledge receipt of IPN
      res.status(200).json({
        orderNotificationType: 'IPNCHANGE',
        orderTrackingId: payload.OrderTrackingId || payload.order_tracking_id || '',
        orderMerchantReference: payload.OrderMerchantReference || payload.order_merchant_reference || '',
        status: 200,
      });
    } catch (error) {
      logger.error('[PESAPAL IPN] Error:', error);
      // Always return 200 to Pesapal to avoid excessive retries
      res.status(200).json({
        orderNotificationType: 'IPNCHANGE',
        orderTrackingId: req.body?.OrderTrackingId || req.query?.OrderTrackingId || '',
        orderMerchantReference: req.body?.OrderMerchantReference || req.query?.OrderMerchantReference || '',
        status: 500,
      });
    }
  }

  /**
   * Handle Pesapal Callback (Redirect)
   */
  async handlePesapalCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.query;
      
      logger.info('[PESAPAL CALLBACK] Received:', { 
        OrderTrackingId: payload.OrderTrackingId,
        OrderMerchantReference: payload.OrderMerchantReference,
      });
      
      const result = await paymentEngineService.handleCallback(
        'PESAPAL',
        payload,
        undefined,
        req.headers as any
      );
      
      // Redirect to success or failure page
      if (result.success) {
        const successUrl = process.env.PAYMENT_SUCCESS_URL || '/payment/success';
        res.redirect(`${successUrl}?paymentId=${result.paymentId}&tracking=${payload.OrderTrackingId}`);
      } else {
        const failureUrl = process.env.PAYMENT_FAILURE_URL || '/payment/failure';
        res.redirect(`${failureUrl}?tracking=${payload.OrderTrackingId}&reason=${encodeURIComponent(result.message)}`);
      }
    } catch (error) {
      logger.error('[PESAPAL CALLBACK] Error:', error);
      res.status(500).send('Callback processing failed');
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

  /**
   * Get resident's payments
   */
  async getMyPayments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.getResidentPayments(req.user!.userId, req.query as any);
      res.json({ success: true, data: result });
    } catch (error) { 
      next(error); 
    }
  }

  /**
   * Get all payments (Admin)
   */
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.getAllPayments(req.query as any);
      res.json({ success: true, data: result });
    } catch (error) { 
      next(error); 
    }
  }

  /**
   * Get payment stats (Admin)
   */
  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await paymentService.getPaymentStats();
      res.json({ success: true, data: stats });
    } catch (error) { 
      next(error); 
    }
  }

  /**
   * Delete a payment (Admin)
   */
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
    } catch (error) { 
      next(error); 
    }
  }

  /**
   * Bulk delete payments (Admin)
   */
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
    } catch (error) { 
      next(error); 
    }
  }

  /**
   * Clear resident's payment history
   */
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
    } catch (error) { 
      next(error); 
    }
  }

  /**
   * Export payments as CSV
   */
  async exportCSV(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const csv = await paymentService.exportPaymentsCSV(req.query);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
      res.send(csv);
    } catch (error) { 
      next(error); 
    }
  }

  /**
   * System health check for payment providers
   */
  async systemCheck(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const health = await paymentEngineService.checkSystemHealth();
      res.json({ success: true, data: health });
    } catch (error) { 
      next(error); 
    }
  }
}

export const paymentController = new PaymentController();
