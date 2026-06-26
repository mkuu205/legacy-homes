"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const billing_controller_1 = require("../controllers/billing.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Resident routes
router.get('/my-bills', auth_1.authenticate, billing_controller_1.billingController.getMyBills.bind(billing_controller_1.billingController));
router.get('/my-statement', auth_1.authenticate, billing_controller_1.billingController.getStatement.bind(billing_controller_1.billingController));
router.get('/receipt/:paymentId', auth_1.authenticate, billing_controller_1.billingController.downloadReceipt.bind(billing_controller_1.billingController));
// Admin routes
router.get('/stats', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), billing_controller_1.billingController.getStats.bind(billing_controller_1.billingController));
router.get('/check-duplicate', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), billing_controller_1.billingController.checkDuplicateBills.bind(billing_controller_1.billingController));
router.get('/export/csv', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), billing_controller_1.billingController.exportCSV.bind(billing_controller_1.billingController));
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), billing_controller_1.billingController.getAll.bind(billing_controller_1.billingController));
router.post('/generate', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), billing_controller_1.billingController.generateMonthlyBills.bind(billing_controller_1.billingController));
router.post('/mark-overdue', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), billing_controller_1.billingController.markOverdue.bind(billing_controller_1.billingController));
router.post('/bulk-delete', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), billing_controller_1.billingController.deleteBills.bind(billing_controller_1.billingController));
router.post('/delete-by-month', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), billing_controller_1.billingController.deleteBillsByMonth.bind(billing_controller_1.billingController));
router.post('/delete-all-unpaid', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), billing_controller_1.billingController.deleteAllUnpaidBills.bind(billing_controller_1.billingController));
router.get('/statement/:residentId', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), billing_controller_1.billingController.getStatement.bind(billing_controller_1.billingController));
router.get('/:id/invoice', auth_1.authenticate, billing_controller_1.billingController.downloadInvoice.bind(billing_controller_1.billingController));
router.get('/:id', auth_1.authenticate, billing_controller_1.billingController.getById.bind(billing_controller_1.billingController));
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), billing_controller_1.billingController.deleteBill.bind(billing_controller_1.billingController));
exports.default = router;
//# sourceMappingURL=billing.routes.js.map