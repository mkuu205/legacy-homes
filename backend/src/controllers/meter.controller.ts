import { Response, NextFunction } from 'express';
import { meterService } from '../services/meter.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { auditService } from '../services/audit.service';

export class MeterController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await meterService.getAllMeters(req.query as any);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const meterId = req.params.id;
      if (!meterId) throw new AppError('Meter ID is required', 400);
      const meter = await meterService.getMeterById(meterId);
      res.json({ success: true, data: meter });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const meter = await meterService.createMeter(req.body);
      await auditService.logAction({
        userId: req.user!.userId,
        action: 'CREATE_METER',
        resource: 'Meter',
        resourceId: (meter as any).id,
        details: { meterNumber: (meter as any).meterNumber },
        ipAddress: req.ip,
      }).catch(() => {});
      res.status(201).json({ success: true, data: meter });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const meterId = req.params.id;
      if (!meterId) throw new AppError('Meter ID is required', 400);
      const meter = await meterService.updateMeter(meterId, req.body);
      await auditService.logAction({
        userId: req.user!.userId,
        action: 'UPDATE_METER',
        resource: 'Meter',
        resourceId: meterId,
        details: req.body,
        ipAddress: req.ip,
      }).catch(() => {});
      res.json({ success: true, data: meter });
    } catch (error) {
      next(error);
    }
  }

  async deleteMeter(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const meterId = req.params.id;
      if (!meterId) throw new AppError('Meter ID is required', 400);
      const result = await meterService.deleteMeter(meterId);
      await auditService.logAction({
        userId: req.user!.userId,
        action: 'DELETE_METER',
        resource: 'Meter',
        resourceId: meterId,
        ipAddress: req.ip,
      }).catch(() => {});
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async addReading(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const meterId = req.params.id || req.params.meterId;
      if (!meterId) throw new AppError('Meter ID is required', 400);
      const reading = await meterService.addReading({
        meterId,
        ...req.body,
        readBy: req.user!.userId,
        photoFile: req.file?.path,
      });
      res.status(201).json({ success: true, data: reading });
    } catch (error) {
      next(error);
    }
  }

  async getReadingHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const meterId = req.params.id || req.params.meterId;
      if (!meterId) throw new AppError('Meter ID is required', 400);
      const readings = await meterService.getReadingHistory(meterId);
      res.json({ success: true, data: readings });
    } catch (error) {
      next(error);
    }
  }

  async getMyMeter(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const meter = await meterService.getResidentMeter(req.user!.userId);
      res.json({ success: true, data: meter });
    } catch (error) {
      next(error);
    }
  }

  async exportCSV(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const csv = await meterService.exportMetersCSV();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=meters.csv');
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
}

export const meterController = new MeterController();
