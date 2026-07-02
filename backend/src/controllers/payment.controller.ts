// src/controllers/payment.controller.ts
import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { AppError } from '../middleware/errorHandler';
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
      
      logger.info('[TUMA CALLBACK] ===== CALLBACK RECEIVED =====');
      logger.info(`[TUMA CALLBACK] Method: ${req.method}`);
      logger.info(`[TUMA CALLBACK] Headers: ${JSON.stringify(req.headers)}`);
      logger.info(`[TUMA CALLBACK] Body: ${JSON.stringify(payload)}`);
      logger.info('[TUMA CALLBACK] =============================');
      
      // Always return 200 immediately to prevent TUMA from retrying
      res.status(200).json({
        status: 'success',
        message: 'Callback received',
        timestamp: new Date().toISOString(),
      });
      
      // Process the callback asynchronously
      setImmediate(async () => {
        try {
          const result = await paymentEngineService.handleCallback(
            'TUMA',
            payload,
            undefined,
            req.headers as any
          );
          logger.info(`[TUMA CALLBACK] Processed successfully:`, result);
        } catch (error) {
          logger.error('[TUMA CALLBACK] Async processing error:', error);
        }
      });
      
    } catch (error) {
      logger.error('[TUMA CALLBACK] Error:', error);
      // Always return 200 to prevent TUMA from retrying
      res.status(200).json({
        status: 'error',
        message: 'Callback processing failed',
      });
    }
  }

  /**
   * Handle Pesapal IPN (Server-to-Server)
   */
  async handlePesapalIpn(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = Object.keys(req.body).length > 0 ? req.body : req.query;
      
      logger.info('[PESAPAL IPN] ===== IPN RECEIVED =====');
      logger.info(`[PESAPAL IPN] Method: ${req.method}`);
      logger.info(`[PESAPAL IPN] Payload: ${JSON.stringify(payload)}`);
      logger.info('[PESAPAL IPN] =========================');
      
      const result = await paymentEngineService.handleCallback('PESAPAL', payload, undefined, req.headers);
      
      // Pesapal expects this specific response format
      res.status(200).json({
        orderNotificationType: 'IPNCHANGE',
        orderTrackingId: payload.OrderTrackingId || payload.order_tracking_id || '',
        orderMerchantReference: payload.OrderMerchantReference || payload.order_merchant_reference || '',
        status: 200,
      });
    } catch (error) {
      logger.error('[PESAPAL IPN] Error:', error);
      // Always return 200 to prevent retries
      res.status(200).json({
        orderNotificationType: 'IPNCHANGE',
        orderTrackingId: req.body?.OrderTrackingId || req.query?.OrderTrackingId || '',
        orderMerchantReference: req.body?.OrderMerchantReference || req.query?.OrderMerchantReference || '',
        status: 500,
      });
    }
  }

  /**
   * Handle Pesapal Callback (Redirect from Pesapal)
   */
  async handlePesapalCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.query; // Pesapal sends callback as query params
      
      logger.info('[PESAPAL CALLBACK] ===== CALLBACK RECEIVED =====');
      logger.info(`[PESAPAL CALLBACK] Method: ${req.method}`);
      logger.info(`[PESAPAL CALLBACK] Query: ${JSON.stringify(payload)}`);
      logger.info('[PESAPAL CALLBACK] =============================');
      
      // Process the callback
      const result = await paymentEngineService.handleCallback(
        'PESAPAL',
        payload,
        undefined,
        req.headers as any
      );
      
      // Redirect to success or failure page
      if (result.success && result.status === 'SUCCESSFUL') {
        const successUrl = process.env.PAYMENT_SUCCESS_URL || 'https://legacy-homes-frontend.vercel.app/payment/success';
        logger.info(`[PESAPAL CALLBACK] Redirecting to success: ${successUrl}`);
        res.redirect(`${successUrl}?paymentId=${result.paymentId}&tracking=${payload.OrderTrackingId}`);
      } else {
        const failureUrl = process.env.PAYMENT_FAILURE_URL || 'https://legacy-homes-frontend.vercel.app/payment/failure';
        logger.info(`[PESAPAL CALLBACK] Redirecting to failure: ${failureUrl}`);
        res.redirect(`${failureUrl}?tracking=${payload.OrderTrackingId}&reason=${encodeURIComponent(result.message)}`);
      }
    } catch (error) {
      logger.error('[PESAPAL CALLBACK] Error:', error);
      // Send a user-friendly error page or redirect
      res.status(500).send(`
        <html>
          <body>
            <h1>Payment Processing Error</h1>
            <p>We encountered an error processing your payment. Please contact support.</p>
            <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          </body>
        </html>
      `);
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
      const paymentId = req.params.id;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      // If not admin, check if user owns the payment
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
        const payment = await paymentService.checkPaymentStatus(paymentId, userId);
        if (!payment) throw new AppError('Payment not found', 404);
      }

      const result = await paymentService.deletePayment(paymentId);
      await auditService.logAction({
        userId: req.user!.userId,
        action: 'DELETE_PAYMENT',
        resource: 'Payment',
        resourceId: paymentId,
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
