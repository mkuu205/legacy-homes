import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';
import { sendAccountDeletedEmail } from '../utils/email';
import { auditService } from '../services/audit.service';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async verifyOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, otp } = req.body;
      const result = await authService.verifyOTPAndActivate(userId, otp);
      
      // Fetch house info for frontend
      const house = result.user.houseId 
        ? await prisma.house.findUnique({ where: { id: result.user.houseId } })
        : null;
      
      res.json({
        success: true,
        message: 'Email verified successfully. Welcome to Legacy Homes!',
        data: {
          user: {
            id: result.user.id,
            fullName: result.user.fullName,
            email: result.user.email,
            role: result.user.role,
            accountNumber: result.user.accountNumber,
            houseNumber: house?.houseNumber, // Return houseNumber for frontend
            profilePicture: result.user.profilePicture,
          },
          tokens: result.tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async resendOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      await authService.sendOTP(user.id, user.email, user.fullName);
      res.json({ success: true, message: 'OTP resent successfully.' });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      // Fetch house info for frontend
      const house = result.user.houseId 
        ? await prisma.house.findUnique({ where: { id: result.user.houseId } })
        : null;
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: result.user.id,
            fullName: result.user.fullName,
            email: result.user.email,
            phone: result.user.phone,
            role: result.user.role,
            accountNumber: result.user.accountNumber,
            houseNumber: house?.houseNumber, // Return houseNumber for frontend
            profilePicture: result.user.profilePicture,
            accountStatus: result.user.accountStatus,
          },
          tokens: result.tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshTokens(refreshToken);
      res.json({ success: true, data: tokens });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      const result = await authService.resetPassword(token, newPassword);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          accountNumber: true,
          houseId: true,
          profilePicture: true,
          accountStatus: true,
          nationalId: true,
          emailVerified: true,
          createdAt: true,
        },
      });
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      
      // Fetch house info for frontend compatibility
      const house = user.houseId 
        ? await prisma.house.findUnique({ where: { id: user.houseId } })
        : null;
      
      res.json({
        success: true,
        data: {
          ...user,
          houseNumber: house?.houseNumber, // Return houseNumber for frontend
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { password } = req.body;
      if (!password) {
        res.status(400).json({ success: false, message: 'Password is required to delete your account' });
        return;
      }
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        res.status(400).json({ success: false, message: 'Incorrect password. Please try again.' });
        return;
      }
      // Audit log before deletion (while user still exists)
      await auditService.logAction({
        userId: user.id,
        action: 'DELETE_ACCOUNT',
        resource: 'User',
        resourceId: user.id,
        details: { email: user.email, fullName: user.fullName },
        ipAddress: req.ip,
      }).catch(() => {});
      // Send deletion email asynchronously
      sendAccountDeletedEmail(user.email, user.fullName).catch(() => {});
      // Explicitly delete all related records to avoid FK constraint violations
      // (schema-level cascades are not defined for all relations)
      await prisma.$transaction(async (tx) => {
        // 1. Receipts reference payments (paymentId FK), delete receipts first
        const userPayments = await tx.payment.findMany({ where: { residentId: user.id }, select: { id: true } });
        const userPaymentIds = userPayments.map(p => p.id);
        if (userPaymentIds.length > 0) {
          await tx.receipt.deleteMany({ where: { paymentId: { in: userPaymentIds } } });
        }

        // 2. Delete payments
        await tx.payment.deleteMany({ where: { residentId: user.id } });

        // 3. Delete payment methods
        await tx.paymentMethod.deleteMany({ where: { residentId: user.id } });

        // 4. Unlink meter readings from bills
        const userBills = await tx.bill.findMany({ where: { residentId: user.id }, select: { id: true } });
        const userBillIds = userBills.map((b) => b.id);
        if (userBillIds.length > 0) {
          await tx.meterReading.updateMany({ where: { billId: { in: userBillIds } }, data: { billId: null } });
        }

        // 5. Delete bills
        await tx.bill.deleteMany({ where: { residentId: user.id } });

        // 6. Delete user notifications
        await tx.userNotification.deleteMany({ where: { userId: user.id } });

        // 7. Delete audit logs
        await tx.auditLog.deleteMany({ where: { userId: user.id } });

        // 8. Support tickets
        await tx.ticketReply.deleteMany({ where: { userId: user.id } });
        await tx.ticket.deleteMany({ where: { residentId: user.id } });

        // 9. OTP codes and refresh tokens
        await tx.otpCode.deleteMany({ where: { userId: user.id } });
        await tx.refreshToken.deleteMany({ where: { userId: user.id } });

        // 10. Device tokens
        try {
          // @ts-ignore - table might not exist in some environments
          await tx.deviceToken.deleteMany({ where: { residentId: user.id } });
        } catch (e) {
          // Ignore if table doesn't exist
        }

        // 11. Unassign house before deleting user
        await tx.user.update({ where: { id: user.id }, data: { houseId: null } });

        // 12. Finally delete the user
        await tx.user.delete({ where: { id: user.id } });
      });
      res.json({ success: true, message: 'Your account has been permanently deleted.' });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
