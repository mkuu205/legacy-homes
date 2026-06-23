"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.residentController = exports.ResidentController = void 0;
const resident_service_1 = require("../services/resident.service");
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
            res.json({ success: true, data: resident });
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const result = await resident_service_1.residentService.deleteResident(req.params.id);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async adminResetPassword(req, res, next) {
        try {
            const result = await resident_service_1.residentService.adminResetPassword(req.params.id, req.body.newPassword);
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
}
exports.ResidentController = ResidentController;
exports.residentController = new ResidentController();
//# sourceMappingURL=resident.controller.js.map