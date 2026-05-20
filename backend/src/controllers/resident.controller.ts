import { Response, NextFunction } from 'express';
import { residentService } from '../services/resident.service';
import { AuthRequest } from '../middleware/auth';

export class ResidentController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await residentService.getAllResidents(req.query as any);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const resident = await residentService.getResidentById(req.params.id as string);
      res.json({ success: true, data: resident });
    } catch (error) { next(error); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const resident = await residentService.updateResident(req.params.id as string, req.body);
      res.json({ success: true, data: resident });
    } catch (error) { next(error); }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await residentService.updateProfile(req.user!.userId, req.body);
      res.json({ success: true, data: user });
    } catch (error) { next(error); }
  }

  async updateProfilePicture(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      const result = await residentService.updateProfilePicture(req.user!.userId, req.file.path);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await residentService.changePassword(req.user!.userId, currentPassword, newPassword);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const resident = await residentService.updateAccountStatus(req.params.id as string, status);
      res.json({ success: true, data: resident });
    } catch (error) { next(error); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await residentService.deleteResident(req.params.id as string);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async adminResetPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await residentService.adminResetPassword(req.params.id as string, req.body.newPassword);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await residentService.getResidentDashboard(req.user!.userId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export const residentController = new ResidentController();
