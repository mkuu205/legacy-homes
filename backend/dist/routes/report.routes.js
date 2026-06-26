"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = require("../controllers/report.controller");
const auth_1 = require("../middleware/auth");
const report_service_1 = require("../services/report.service");
const router = (0, express_1.Router)();
router.get('/dashboard', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), report_controller_1.reportController.getDashboardStats.bind(report_controller_1.reportController));
router.get('/billing', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), report_controller_1.reportController.getBillingReport.bind(report_controller_1.reportController));
router.get('/revenue', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), report_controller_1.reportController.getRevenueReport.bind(report_controller_1.reportController));
router.get('/overdue', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), report_controller_1.reportController.getOverdueReport.bind(report_controller_1.reportController));
router.get('/consumption', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), report_controller_1.reportController.getConsumptionReport.bind(report_controller_1.reportController));
// Export endpoints
router.get('/export/revenue', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), async (req, res, next) => {
    try {
        const data = await report_service_1.reportService.getRevenueReport(req.query);
        const payments = data.payments || [];
        const headers = ['Date', 'Resident Name', 'Account Number', 'House Number', 'Amount (KES)', 'Payment ID', 'M-Pesa Code'];
        const rows = payments.map((p) => [
            new Date(p.createdAt).toLocaleDateString('en-KE'),
            p.resident?.fullName || '',
            p.resident?.accountNumber || '',
            p.resident?.houseNumber || '',
            p.amount,
            p.id,
            p.confirmationCode || '',
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="revenue-report.csv"`);
        res.send(csv);
    }
    catch (error) {
        next(error);
    }
});
router.get('/export/overdue', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), async (req, res, next) => {
    try {
        const data = await report_service_1.reportService.getOverdueReport();
        const bills = data.bills || [];
        const headers = ['Resident Name', 'Account Number', 'House Number', 'Bill Number', 'Billing Month', 'Balance (KES)', 'Due Date'];
        const rows = bills.map((b) => [
            b.resident?.fullName || '',
            b.resident?.accountNumber || '',
            b.resident?.houseNumber || '',
            b.billNumber,
            b.billingMonth,
            b.balance,
            new Date(b.dueDate).toLocaleDateString('en-KE'),
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="overdue-report.csv"`);
        res.send(csv);
    }
    catch (error) {
        next(error);
    }
});
router.get('/export/billing', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), async (req, res, next) => {
    try {
        const data = await report_service_1.reportService.getBillingReport(req.query);
        const bills = data.bills || [];
        const headers = ['Bill Number', 'Resident Name', 'Account Number', 'Billing Month', 'Total Amount (KES)', 'Amount Paid (KES)', 'Balance (KES)', 'Status', 'Due Date'];
        const rows = bills.map((b) => [
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
        const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="billing-report.csv"`);
        res.send(csv);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=report.routes.js.map