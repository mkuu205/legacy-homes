"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportController = exports.ReportController = void 0;
const report_service_1 = require("../services/report.service");
class ReportController {
    async getDashboardStats(req, res, next) {
        try {
            const stats = await report_service_1.reportService.getAdminDashboardStats();
            res.json({ success: true, data: stats });
        }
        catch (error) {
            next(error);
        }
    }
    async getBillingReport(req, res, next) {
        try {
            const result = await report_service_1.reportService.getBillingReport(req.query);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getRevenueReport(req, res, next) {
        try {
            const result = await report_service_1.reportService.getRevenueReport(req.query);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getOverdueReport(req, res, next) {
        try {
            const result = await report_service_1.reportService.getOverdueReport();
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getConsumptionReport(req, res, next) {
        try {
            const result = await report_service_1.reportService.getConsumptionReport(req.query);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ReportController = ReportController;
exports.reportController = new ReportController();
//# sourceMappingURL=report.controller.js.map