"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meterController = exports.MeterController = void 0;
const meter_service_1 = require("../services/meter.service");
const errorHandler_1 = require("../middleware/errorHandler");
const audit_service_1 = require("../services/audit.service");
class MeterController {
    async getAll(req, res, next) {
        try {
            const result = await meter_service_1.meterService.getAllMeters(req.query);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const meterId = req.params.id;
            if (!meterId)
                throw new errorHandler_1.AppError('Meter ID is required', 400);
            const meter = await meter_service_1.meterService.getMeterById(meterId);
            res.json({ success: true, data: meter });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const meter = await meter_service_1.meterService.createMeter(req.body);
            await audit_service_1.auditService.logAction({
                userId: req.user.userId,
                action: 'CREATE_METER',
                resource: 'Meter',
                resourceId: meter.id,
                details: { meterNumber: meter.meterNumber },
                ipAddress: req.ip,
            }).catch(() => { });
            res.status(201).json({ success: true, data: meter });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const meterId = req.params.id;
            if (!meterId)
                throw new errorHandler_1.AppError('Meter ID is required', 400);
            const meter = await meter_service_1.meterService.updateMeter(meterId, req.body);
            await audit_service_1.auditService.logAction({
                userId: req.user.userId,
                action: 'UPDATE_METER',
                resource: 'Meter',
                resourceId: meterId,
                details: req.body,
                ipAddress: req.ip,
            }).catch(() => { });
            res.json({ success: true, data: meter });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteMeter(req, res, next) {
        try {
            const meterId = req.params.id;
            if (!meterId)
                throw new errorHandler_1.AppError('Meter ID is required', 400);
            const result = await meter_service_1.meterService.deleteMeter(meterId);
            await audit_service_1.auditService.logAction({
                userId: req.user.userId,
                action: 'DELETE_METER',
                resource: 'Meter',
                resourceId: meterId,
                ipAddress: req.ip,
            }).catch(() => { });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async addReading(req, res, next) {
        try {
            const meterId = req.params.id || req.params.meterId;
            if (!meterId)
                throw new errorHandler_1.AppError('Meter ID is required', 400);
            const reading = await meter_service_1.meterService.addReading({
                meterId,
                ...req.body,
                readBy: req.user.userId,
                photoFile: req.file?.path,
            });
            res.status(201).json({ success: true, data: reading });
        }
        catch (error) {
            next(error);
        }
    }
    async getReadingHistory(req, res, next) {
        try {
            const meterId = req.params.id || req.params.meterId;
            if (!meterId)
                throw new errorHandler_1.AppError('Meter ID is required', 400);
            const readings = await meter_service_1.meterService.getReadingHistory(meterId);
            res.json({ success: true, data: readings });
        }
        catch (error) {
            next(error);
        }
    }
    async getMyMeter(req, res, next) {
        try {
            const meter = await meter_service_1.meterService.getResidentMeter(req.user.userId);
            res.json({ success: true, data: meter });
        }
        catch (error) {
            next(error);
        }
    }
    async exportCSV(req, res, next) {
        try {
            const csv = await meter_service_1.meterService.exportMetersCSV();
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=meters.csv');
            res.send(csv);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.MeterController = MeterController;
exports.meterController = new MeterController();
//# sourceMappingURL=meter.controller.js.map