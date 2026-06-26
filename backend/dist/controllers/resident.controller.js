"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.residentController = exports.ResidentController = void 0;
const resident_service_1 = require("../services/resident.service");
const audit_service_1 = require("../services/audit.service");
const email_1 = require("../utils/email");
const prisma_1 = __importDefault(require("../config/prisma"));
class ResidentController {
    async getAll(req, res, next) {
        try {
            const result = await resident_service_1.residentService.getAllResidents(req.query);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const resident = await resident_service_1.residentService.getResidentById(req.params.id);
            res.json({ success: true, data: resident });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const resident = await resident_service_1.residentService.createResident(req.body);
            await audit_service_1.auditService.logAction({
                userId: req.user.userId,
                action: 'CREATE_RESIDENT',
                resource: 'User',
                resourceId: resident.id,
                details: { email: resident.email, fullName: resident.fullName },
                ipAddress: req.ip,
            }).catch(() => { });
            res.status(201).json({ success: true, data: resident });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const resident = await resident_service_1.residentService.updateResident(req.params.id, req.body);
            res.json({ success: true, data: resident });
        }
        catch (error) {
            next(error);
        }
    }
    async updateProfile(req, res, next) {
        try {
            const user = await resident_service_1.residentService.updateProfile(req.user.userId, req.body);
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    async updateProfilePicture(req, res, next) {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, message: 'No file uploaded' });
                return;
            }
            const result = await resident_service_1.residentService.updateProfilePicture(req.user.userId, req.file.path);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;
            const result = await resident_service_1.residentService.changePassword(req.user.userId, currentPassword, newPassword);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async updateStatus(req, res, next) {
        try {
            const { status } = req.body;
            const resident = await resident_service_1.residentService.updateAccountStatus(req.params.id, status);
            // Send email notification based on new status
            if (status === 'SUSPENDED') {
                (0, email_1.sendAccountSuspendedEmail)(resident.email, resident.fullName).catch(() => { });
            }
            else if (status === 'ACTIVE') {
                (0, email_1.sendAccountActivatedEmail)(resident.email, resident.fullName).catch(() => { });
            }
            // Create in-app notification for the resident using the correct two-table structure
            const notifMessage = status === 'SUSPENDED'
                ? 'Your account has been suspended. Please contact support.'
                : status === 'ACTIVE'
                    ? 'Your account has been activated. You can now access all features.'
                    : `Your account status has been updated to ${status}.`;
            prisma_1.default.notification.create({
                data: {
                    title: status === 'SUSPENDED' ? 'Account Suspended' : status === 'ACTIVE' ? 'Account Activated' : 'Account Status Updated',
                    message: notifMessage,
                    type: 'ESTATE_COMMUNICATION',
                    channels: ['IN_APP'],
                    targetAll: false,
                    userNotifications: {
                        create: {
                            userId: resident.id,
                            channel: 'IN_APP',
                            status: 'PENDING',
                        },
                    },
                },
            }).catch(() => { });
            // Audit log
            await audit_service_1.auditService.logAction({
                userId: req.user.userId,
                action: status === 'SUSPENDED' ? 'SUSPEND_RESIDENT' : status === 'ACTIVE' ? 'ACTIVATE_RESIDENT' : 'UPDATE_RESIDENT_STATUS',
                resource: 'User',
                resourceId: req.params.id,
                details: { status, affectedUser: resident.email },
                ipAddress: req.ip,
            }).catch(() => { });
            res.json({ success: true, data: resident });
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            // Get resident info before deletion for audit log
            const resident = await prisma_1.default.user.findUnique({ where: { id: req.params.id }, select: { email: true, fullName: true } });
            const result = await resident_service_1.residentService.deleteResident(req.params.id);
            await audit_service_1.auditService.logAction({
                userId: req.user.userId,
                action: 'DELETE_RESIDENT',
                resource: 'User',
                resourceId: req.params.id,
                details: { affectedUser: resident?.email, fullName: resident?.fullName },
                ipAddress: req.ip,
            }).catch(() => { });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async adminResetPassword(req, res, next) {
        try {
            const result = await resident_service_1.residentService.adminResetPassword(req.params.id, req.body.newPassword);
            await audit_service_1.auditService.logAction({
                userId: req.user.userId,
                action: 'RESET_RESIDENT_PASSWORD',
                resource: 'User',
                resourceId: req.params.id,
                ipAddress: req.ip,
            }).catch(() => { });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async getDashboard(req, res, next) {
        try {
            const data = await resident_service_1.residentService.getResidentDashboard(req.user.userId);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async exportCSV(req, res, next) {
        try {
            const csv = await resident_service_1.residentService.exportResidentsCSV(req.query);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=residents.csv');
            res.send(csv);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ResidentController = ResidentController;
exports.residentController = new ResidentController();
//# sourceMappingURL=resident.controller.js.map