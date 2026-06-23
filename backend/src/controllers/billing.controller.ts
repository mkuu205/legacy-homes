import { Response, NextFunction } from 'express';
import { billingService } from '../services/billing.service';
import { AuthRequest } from '../middleware/auth';

export class BillingController {
  async generateMonthlyBills(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { billingMonth } = req.body;
      const result = await billingService.generateMonthlyBills(billingMonth);
      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await billingService.getAllBills(req.query as any);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bill = await billingService.getBillById(req.params.id as string);
      res.json({ success: true, data: bill });
    } catch (error) { next(error); }
  }

  async getMyBills(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await billingService.getResidentBills(req.user!.userId, req.query as any);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getStatement(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const residentId = req.params.residentId as string || req.user!.userId;
      const statement = await billingService.getResidentStatement(residentId);
      res.json({ success: true, data: statement });
    } catch (error) { next(error); }
  }

  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await billingService.getBillingStats();
      res.json({ success: true, data: stats });
    } catch (error) { next(error); }
  }

  async markOverdue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await billingService.markOverdueBills();
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async downloadInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await billingService.generateInvoicePDF(id) as any;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
      res.send(result.pdfBuffer);
    } catch (error) { next(error); }
  }

  async downloadReceipt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { paymentId } = req.params;
      const result = await billingService.generateReceiptPDF(paymentId) as any;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
      res.send(result.pdfBuffer);
    } catch (error) { next(error); }
  }
}

export const billingController = new BillingController();
