"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportController = exports.SupportController = void 0;
const support_service_1 = require("../services/support.service");
class SupportController {
    async createTicket(req, res, next) {
        try {
            const attachmentFiles = req.files
                ? req.files.map((f) => f.path)
                : [];
            const ticket = await support_service_1.supportService.createTicket({
                ...req.body,
                residentId: req.user.userId,
                attachmentFiles,
            });
            res.status(201).json({
                success: true,
                data: ticket,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getMyTickets(req, res, next) {
        try {
            const result = await support_service_1.supportService.getResidentTickets(req.user.userId, req.query);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getAll(req, res, next) {
        try {
            const result = await support_service_1.supportService.getAllTickets(req.query);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const ticket = await support_service_1.supportService.getTicketById(req.params.id);
            res.json({
                success: true,
                data: ticket,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async reply(req, res, next) {
        try {
            const attachmentFiles = req.files
                ? req.files.map((f) => f.path)
                : [];
            const isAdmin = req.user.role === 'SUPER_ADMIN';
            const reply = await support_service_1.supportService.replyToTicket({
                ticketId: req.params.id,
                userId: req.user.userId,
                message: req.body.message,
                isAdmin,
                attachmentFiles,
            });
            res.status(201).json({
                success: true,
                data: reply,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateStatus(req, res, next) {
        try {
            const ticket = await support_service_1.supportService.updateTicketStatus(req.params.id, req.body.status, req.body.assignedTo);
            res.json({
                success: true,
                data: ticket,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getStats(req, res, next) {
        try {
            const stats = await support_service_1.supportService.getTicketStats();
            res.json({
                success: true,
                data: stats,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SupportController = SupportController;
exports.supportController = new SupportController();
//# sourceMappingURL=support.controller.js.map