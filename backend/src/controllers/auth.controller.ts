import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';
import { sendAccountDeletedEmail } from '../utils/email';
import { auditService } from '../services/audit.service';
import { AppError } from '../middleware/errorHandler';

const refreshCookieName = 'legacy_refresh_token';
const refreshCookieOptions = () => {
  const secure = process.env.NODE_ENV === 'production';
  const sameSite = process.env.COOKIE_SAMESITE || (secure ? 'none' : 'lax');
  return `HttpOnly; Path=/api/auth; Max-Age=${7 * 24 * 60 * 60}; SameSite=${sameSite}${secure ? '; Secure' : ''}`;
};
const setRefreshCookie = (res: Response, refreshToken: string) => {
  res.setHeader('Set-Cookie', `${refreshCookieName}=${encodeURIComponent(refreshToken)}; ${refreshCookieOptions()}`);
};
const clearRefreshCookie = (res: Response) => {
  const secure = process.env.NODE_ENV === 'production';
  const sameSite = process.env.COOKIE_SAMESITE || (secure ? 'none' : 'lax');
  res.setHeader('Set-Cookie', `${refreshCookieName}=; HttpOnly; Path=/api/auth; Max-Age=0; SameSite=${sameSite}${secure ? '; Secure' : ''}`);
};

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
          tokens: (() => {
            setRefreshCookie(res, result.tokens.refreshToken);
            return { accessToken: result.tokens.accessToken };
          })(),
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
      
      if (result.twoFactorRequired) {
        res.json({
          success: true,
          message: 'Two-factor authentication required',
          data: {
            twoFactorRequired: true,
            challengeToken: result.challengeToken,
            user: { id: result.user.id, fullName: result.user.fullName, email: result.user.email, role: result.user.role },
          },
        });
        return;
      }

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
          tokens: (() => {
            setRefreshCookie(res, result.tokens.refreshToken);
            return { accessToken: result.tokens.accessToken };
          })(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyTwoFactorLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { challengeToken, code } = req.body;
      const result = await authService.completeTwoFactorLogin(String(challengeToken || ''), String(code || ''));
      setRefreshCookie(res, result.tokens.refreshToken);
      res.json({
        success: true,
        message: 'Login successful',
        data: { user: { id: result.user.id, fullName: result.user.fullName, email: result.user.email, role: result.user.role }, tokens: { accessToken: result.tokens.accessToken } },
      });
    } catch (error) { next(error); }
  }

  async twoFactorStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await authService.getTwoFactorStatus(req.user!.userId) });
    } catch (error) { next(error); }
  }

  async setupTwoFactor(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await authService.setupTwoFactor(req.user!.userId) });
    } catch (error) { next(error); }
  }

  async confirmTwoFactor(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await authService.confirmTwoFactor(req.user!.userId, String(req.body.code || '')) });
    } catch (error) { next(error); }
  }

  async disableTwoFactor(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await authService.disableTwoFactor(req.user!.userId, String(req.body.code || '')) });
    } catch (error) { next(error); }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const cookieHeader = req.headers.cookie || '';
      const cookieToken = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${refreshCookieName}=`))?.split('=').slice(1).join('=');
      const refreshToken = cookieToken ? decodeURIComponent(cookieToken) : req.body?.refreshToken;
      if (!refreshToken) throw new AppError('Refresh session required', 401);
      const tokens = await authService.refreshTokens(refreshToken);
      setRefreshCookie(res, tokens.refreshToken);
      res.json({ success: true, data: { accessToken: tokens.accessToken } });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const cookieHeader = req.headers.cookie || '';
      const cookieToken = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${refreshCookieName}=`))?.split('=').slice(1).join('=');
      const refreshToken = cookieToken ? decodeURIComponent(cookieToken) : req.body?.refreshToken;
      if (refreshToken) await authService.logout(refreshToken);
      clearRefreshCookie(res);
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
        // Financial records are immutable. Retain receipts, payments, bills,
        // meter-reading links, and audit history for reconciliation and legal audit.
        // Payment methods are not financial transactions and may be removed.
        await tx.paymentMethod.deleteMany({ where: { residentId: user.id } });

        // Delete user notifications
        await tx.userNotification.deleteMany({ where: { userId: user.id } });

        // Preserve audit logs for historical accountability.

        // Support tickets
        await tx.ticketReply.deleteMany({ where: { userId: user.id } });
        await tx.ticket.deleteMany({ where: { residentId: user.id } });

        // OTP codes and refresh tokens
        await tx.otpCode.deleteMany({ where: { userId: user.id } });
        await tx.refreshToken.deleteMany({ where: { userId: user.id } });

        // Device tokens
        try {
          // @ts-ignore - table might not exist in some environments
          await (tx as any).deviceToken.deleteMany({ where: { residentId: user.id } });
        } catch (e) {
          // Ignore if table doesn't exist
        }

        // Release the house and permanently deactivate the account.
        if (user.houseId) {
          await tx.house.update({ where: { id: user.houseId }, data: { occupancyStatus: 'VACANT' } });
        }
        await tx.user.update({
          where: { id: user.id },
          data: { houseId: null, accountStatus: 'INACTIVE', registrationStatus: 'REJECTED', emailVerified: false },
        });
      });
      res.json({ success: true, message: 'Your account has been permanently deactivated; financial history retained for audit.' });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
