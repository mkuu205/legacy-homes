import { Response, NextFunction } from 'express';
import { billingService } from '../services/billing.service';
import { AuthRequest } from '../middleware/auth';
import { auditService } from '../services/audit.service';

export class BillingController {
  async generateMonthlyBills(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { billingMonth, force, residentId, dueDate, waterUnitRate, lateFee, billingPeriodStart, billingPeriodEnd } = req.body;
      const options = { residentId, dueDate, waterUnitRate: waterUnitRate ? Number(waterUnitRate) : undefined, lateFee: lateFee ? Number(lateFee) : undefined, billingPeriodStart, billingPeriodEnd };
      const result = await billingService.generateMonthlyBills(billingMonth, force === true || force === 'true', options);
      // Audit log
      await auditService.logAction({
        userId: req.user!.userId,
        action: 'GENERATE_BILLS',
        resource: 'Bill',
        details: { billingMonth, residentId, generated: result.generated, force, dueDate, waterUnitRate, lateFee },
        ipAddress: req.ip,
      }).catch(() => {});
      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async checkDuplicateBills(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { billingMonth } = req.query as any;
      const prisma = (billingService as any).prisma || require('../config/prisma').default;
      const count = await require('../config/prisma').default.bill.count({ where: { billingMonth } });
      res.json({ success: true, data: { exists: count > 0, count } });
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
      const bill = await billingService.getBillById(
        req.params.id as string,
        req.user!.role === 'SUPER_ADMIN' ? undefined : req.user!.userId
      );
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
      const residentId = req.user!.role === 'SUPER_ADMIN'
        ? (req.params.residentId as string || req.user!.userId)
        : req.user!.userId;
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
      const result = await billingService.generateInvoicePDF(
        id,
        req.user!.role === 'SUPER_ADMIN' ? undefined : req.user!.userId
      ) as any;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
      res.send(result.pdfBuffer);
    } catch (error) { next(error); }
  }

  async downloadReceipt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { paymentId } = req.params;
      const result = await billingService.generateReceiptPDF(
        paymentId,
        req.user!.role === 'SUPER_ADMIN' ? undefined : req.user!.userId
      ) as any;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
      res.send(result.pdfBuffer);
    } catch (error) { next(error); }
  }

  async deleteBill(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await billingService.deleteBill(req.params.id);
      res.status(409).json({ success: false, error: 'Financial bills cannot be deleted; use the audited correction workflow.' });
    } catch (error) { next(error); }
  }

  async deleteBills(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      await billingService.deleteBills(ids);
      res.status(409).json({ success: false, error: 'Financial bills cannot be deleted; use the audited correction workflow.' });
    } catch (error) { next(error); }
  }

  async deleteBillsByMonth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { billingMonth } = req.body;
      await billingService.deleteBillsByMonth(billingMonth);
      res.status(409).json({ success: false, error: 'Financial bills cannot be deleted; use the audited correction workflow.' });
    } catch (error) { next(error); }
  }

  async deleteAllUnpaidBills(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await billingService.deleteAllUnpaidBills();
      res.status(409).json({ success: false, error: 'Financial bills cannot be deleted; use the audited correction workflow.' });
    } catch (error) { next(error); }
  }

  async exportCSV(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const csv = await billingService.exportBillsCSV(req.query);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=bills.csv');
      res.send(csv);
    } catch (error) { next(error); }
  }
}

export const billingController = new BillingController();
