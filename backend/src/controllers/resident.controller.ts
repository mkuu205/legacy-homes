import { Response, NextFunction } from 'express';
import { residentService } from '../services/resident.service';
import { AuthRequest } from '../middleware/auth';
import { auditService } from '../services/audit.service';
import { sendAccountSuspendedEmail, sendAccountActivatedEmail } from '../utils/email';
import prisma from '../config/prisma';

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

      // Send email notification based on new status
      if (status === 'SUSPENDED') {
        sendAccountSuspendedEmail(resident.email, resident.fullName).catch(() => {});
      } else if (status === 'ACTIVE') {
        sendAccountActivatedEmail(resident.email, resident.fullName).catch(() => {});
      }

      // Create in-app notification for the resident
      const message = status === 'SUSPENDED'
        ? 'Your account has been suspended. Please contact support.'
        : status === 'ACTIVE'
        ? 'Your account has been activated. You can now access all features.'
        : `Your account status has been updated to ${status}.`;

      await prisma.userNotification.create({
        data: {
          userId: resident.id,
          title: status === 'SUSPENDED' ? 'Account Suspended' : status === 'ACTIVE' ? 'Account Activated' : 'Account Status Updated',
          message,
          type: status === 'SUSPENDED' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_ACTIVATED',
          status: 'UNREAD',
        },
      }).catch(() => {});

      // Audit log
      await auditService.logAction({
        userId: req.user!.userId,
        action: status === 'SUSPENDED' ? 'SUSPEND_RESIDENT' : status === 'ACTIVE' ? 'ACTIVATE_RESIDENT' : 'UPDATE_RESIDENT_STATUS',
        resource: 'User',
        resourceId: req.params.id,
        details: { status, affectedUser: resident.email },
        ipAddress: req.ip,
      }).catch(() => {});

      res.json({ success: true, data: resident });
    } catch (error) { next(error); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Get resident info before deletion for audit log
      const resident = await prisma.user.findUnique({ where: { id: req.params.id }, select: { email: true, fullName: true } });
      const result = await residentService.deleteResident(req.params.id as string);
      await auditService.logAction({
        userId: req.user!.userId,
        action: 'DELETE_RESIDENT',
        resource: 'User',
        resourceId: req.params.id,
        details: { affectedUser: resident?.email, fullName: resident?.fullName },
        ipAddress: req.ip,
      }).catch(() => {});
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async adminResetPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await residentService.adminResetPassword(req.params.id as string, req.body.newPassword);
      await auditService.logAction({
        userId: req.user!.userId,
        action: 'RESET_RESIDENT_PASSWORD',
        resource: 'User',
        resourceId: req.params.id,
        ipAddress: req.ip,
      }).catch(() => {});
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
