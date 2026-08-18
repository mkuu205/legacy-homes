import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import { AppError } from './errorHandler';
import prisma from '../config/prisma';
import {
  getSessionActivityUpdateIntervalMs,
  isSessionInactive,
  SESSION_EXPIRED_MESSAGE,
} from '../utils/session-policy';

export type AuthRequest = Request & {
  user?: JWTPayload;
  file?: any;
  files?: any;
};

export const authMiddleware = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token required', 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, accountStatus: true },
    });

    if (!user || user.accountStatus !== 'ACTIVE') {
      throw new AppError('Account is inactive or has been deleted', 401);
    }

    if (payload.sessionId) {
      const session = await prisma.refreshToken.findUnique({
        where: { id: payload.sessionId },
        select: {
          id: true,
          userId: true,
          revoked: true,
          expiresAt: true,
          createdAt: true,
          lastActivityAt: true,
        },
      });

      const now = new Date();
      if (
        !session ||
        session.userId !== user.id ||
        session.revoked ||
        now > session.expiresAt
      ) {
        throw new AppError('Invalid or expired session', 401);
      }

      if (isSessionInactive(session.lastActivityAt, session.createdAt, now)) {
        await prisma.refreshToken.update({
          where: { id: session.id },
          data: { revoked: true },
        });
        throw new AppError(SESSION_EXPIRED_MESSAGE, 401);
      }

      const activityCutoff = new Date(now.getTime() - getSessionActivityUpdateIntervalMs());
      const shouldRefreshActivity =
        !session.lastActivityAt || session.lastActivityAt < activityCutoff;

      if (shouldRefreshActivity) {
        await prisma.refreshToken.updateMany({
          where: {
            id: session.id,
            revoked: false,
            expiresAt: { gt: now },
            OR: [
              { lastActivityAt: null },
              { lastActivityAt: { lt: activityCutoff } },
            ],
          },
          data: { lastActivityAt: now },
        });
      }
    }

    req.user = {
      ...payload,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      next(new AppError('Access token expired', 401));
    } else if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid access token', 401));
    } else {
      next(error);
    }
  }
};

export const authenticate = authMiddleware;

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError('Insufficient permissions', 403));
      return;
    }

    next();
  };
};
