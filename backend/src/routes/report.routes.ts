import { Router, Response, NextFunction } from 'express';
import { reportController } from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/auth';
import { reportService } from '../services/report.service';
import { AuthRequest } from '../middleware/auth';

const router = Router();
router.get('/dashboard', authenticate, authorize('SUPER_ADMIN'), reportController.getDashboardStats.bind(reportController));
router.get('/billing', authenticate, authorize('SUPER_ADMIN'), reportController.getBillingReport.bind(reportController));
router.get('/revenue', authenticate, authorize('SUPER_ADMIN'), reportController.getRevenueReport.bind(reportController));
router.get('/overdue', authenticate, authorize('SUPER_ADMIN'), reportController.getOverdueReport.bind(reportController));
router.get('/consumption', authenticate, authorize('SUPER_ADMIN'), reportController.getConsumptionReport.bind(reportController));

// Export endpoints
router.get('/export/revenue', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await reportService.getRevenueReport(req.query as any);
    const payments = data.payments || [];
    const headers = ['Date', 'Resident Name', 'Account Number', 'House Number', 'Amount (KES)', 'Payment ID', 'M-Pesa Code'];
    const rows = payments.map((p: any) => [
      new Date(p.createdAt).toLocaleDateString('en-KE'),
      p.resident?.fullName || '',
      p.resident?.accountNumber || '',
      p.resident?.houseNumber || '',
      p.amount,
      p.id,
      p.confirmationCode || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r: any[]) => r.map((v: any) => `"${v}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="revenue-report.csv"`);
    res.send(csv);
  } catch (error) { next(error); }
});

router.get('/export/overdue', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await reportService.getOverdueReport();
    const bills = data.bills || [];
    const headers = ['Resident Name', 'Account Number', 'House Number', 'Bill Number', 'Billing Month', 'Balance (KES)', 'Due Date'];
    const rows = bills.map((b: any) => [
      b.resident?.fullName || '',
      b.resident?.accountNumber || '',
      b.resident?.houseNumber || '',
      b.billNumber,
      b.billingMonth,
      b.balance,
      new Date(b.dueDate).toLocaleDateString('en-KE'),
    ]);
    const csv = [headers.join(','), ...rows.map((r: any[]) => r.map((v: any) => `"${v}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="overdue-report.csv"`);
    res.send(csv);
  } catch (error) { next(error); }
});

router.get('/export/billing', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await reportService.getBillingReport(req.query as any);
    const bills = data.bills || [];
    const headers = ['Bill Number', 'Resident Name', 'Account Number', 'Billing Month', 'Total Amount (KES)', 'Amount Paid (KES)', 'Balance (KES)', 'Status', 'Due Date'];
    const rows = bills.map((b: any) => [
      b.billNumber,
      b.resident?.fullName || '',
      b.resident?.accountNumber || '',
      b.billingMonth,
      b.totalAmount,
      b.amountPaid,
      b.balance,
      b.status,
      new Date(b.dueDate).toLocaleDateString('en-KE'),
    ]);
    const csv = [headers.join(','), ...rows.map((r: any[]) => r.map((v: any) => `"${v}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="billing-report.csv"`);
    res.send(csv);
  } catch (error) { next(error); }
});

export default router;
