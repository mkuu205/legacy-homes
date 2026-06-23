"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = require("../controllers/report.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/dashboard', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), report_controller_1.reportController.getDashboardStats.bind(report_controller_1.reportController));
router.get('/billing', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), report_controller_1.reportController.getBillingReport.bind(report_controller_1.reportController));
router.get('/revenue', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), report_controller_1.reportController.getRevenueReport.bind(report_controller_1.reportController));
router.get('/overdue', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), report_controller_1.reportController.getOverdueReport.bind(report_controller_1.reportController));
router.get('/consumption', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), report_controller_1.reportController.getConsumptionReport.bind(report_controller_1.reportController));
exports.default = router;
//# sourceMappingURL=report.routes.js.map