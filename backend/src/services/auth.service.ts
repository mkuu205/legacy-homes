import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { generateOTP, hashOTP, verifyOTP, getOTPExpiry } from '../utils/otp';
import {
  generateAccessToken,
  generateAccountNumber,
} from '../utils/jwt';
import { sendOTPEmail, sendPasswordResetEmail } from '../utils/email';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import crypto from 'crypto';
import { isSessionInactive, SESSION_EXPIRED_MESSAGE } from '../utils/session-policy';
import {
  consumeRecoveryCode,
  createTotpQrCode,
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  verifyTotp,
} from '../utils/totp';

export class AuthService {
  async register(data: {
    fullName: string;
    email: string;
    phone: string;
    houseNumber: string;
    password: string;
    profilePicture?: string;
  }) {
    // Normalise house number: trim whitespace and convert to uppercase
    const houseNumber = data.houseNumber.trim().toUpperCase();

    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingEmail) {
      throw new AppError('Email already registered', 409);
    }

    const existingPhone = await prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (existingPhone) {
      throw new AppError('Phone number already registered', 409);
    }

    const house = await prisma.house.upsert({
      where: { houseNumber },
      update: {},
      create: {
        houseNumber,
        occupancyStatus: 'OCCUPIED',
      },
    });

    const existingResident = await prisma.user.findUnique({
      where: { houseId: house.id },
    });

    if (existingResident) {
      throw new AppError('This house is already assigned', 409);
    }

    await prisma.house.update({
      where: { id: house.id },
      data: { occupancyStatus: 'OCCUPIED' },
    });

    const passwordHash = await bcrypt.hash(data.password, 12);
    const accountNumber = generateAccountNumber();

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        assignedHouse: { connect: { id: house.id } },
        passwordHash,
        profilePicture: data.profilePicture,
        accountNumber,
        role: 'RESIDENT',
        accountStatus: 'INACTIVE',
        registrationStatus: 'PENDING',
        emailVerified: false,
      },
    });

    await this.sendOTP(user.id, user.email, user.fullName);

    return {
      userId: user.id,
      email: user.email,
      message: 'Registration successful. Please verify your email.',
    };
  }

  async sendOTP(userId: string, email: string, name: string) {
    await prisma.otpCode.updateMany({
      where: {
        userId,
        used: false,
      },
      data: {
        used: true,
      },
    });

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = getOTPExpiry(10);

    await prisma.otpCode.create({
      data: {
        user: { connect: { id: userId } },
        otpHash,
        expiresAt,
      },
    });

    await sendOTPEmail(email, name, otp);

    logger.info(`OTP sent to ${email}`);
  }

  async verifyOTPAndActivate(userId: string, otp: string) {
    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountStatus: true, registrationStatus: true },
    });
    if (!account || account.accountStatus !== 'INACTIVE' || account.registrationStatus !== 'PENDING') {
      throw new AppError('Account cannot be activated through OTP verification', 403);
    }

    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        userId,
        used: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      throw new AppError('No active OTP found. Please request a new one.', 400);
    }

    if (new Date() > otpRecord.expiresAt) {
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { used: true },
      });

      throw new AppError('OTP has expired. Please request a new one.', 400);
    }

    if (otpRecord.attempts >= 5) {
      throw new AppError('Maximum OTP attempts exceeded. Please request a new one.', 400);
    }

    const isValid = await verifyOTP(otp, otpRecord.otpHash);

    if (!isValid) {
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      const remaining = 5 - (otpRecord.attempts + 1);

      throw new AppError(`Invalid OTP. ${remaining} attempts remaining.`, 400);
    }

    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        accountStatus: 'ACTIVE',
        registrationStatus: 'APPROVED',
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      user,
      tokens,
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.emailVerified) {
      throw new AppError('Please verify your email before logging in.', 403);
    }

    if (user.accountStatus === 'SUSPENDED') {
      throw new AppError('Your account has been suspended. Please contact support.', 403);
    }

    if (user.accountStatus !== 'ACTIVE') {
      throw new AppError('Your account is inactive. Please contact support.', 403);
    }

    const twoFactor = user.role !== 'RESIDENT'
      ? await prisma.adminTwoFactor.findUnique({ where: { userId: user.id } })
      : null;

    if (user.role !== 'RESIDENT' && twoFactor?.enabled) {
      const challengeToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(challengeToken).digest('hex');
      await prisma.twoFactorChallenge.deleteMany({ where: { userId: user.id } });
      await prisma.twoFactorChallenge.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
      return {
        twoFactorRequired: true as const,
        challengeToken,
        user,
      };
    }

    const tokens = await this.generateTokens(user);

    return {
      twoFactorRequired: false as const,
      user,
      tokens,
    };
  }

  async completeTwoFactorLogin(challengeToken: string, code: string) {
    const tokenHash = crypto.createHash('sha256').update(challengeToken).digest('hex');
    const challenge = await prisma.twoFactorChallenge.findUnique({
      where: { tokenHash },
      include: { user: { include: { twoFactor: true } } },
    });
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date() || challenge.attempts >= 5) {
      throw new AppError('Invalid or expired two-factor challenge', 401);
    }
    const user = challenge.user;
    if (user.role === 'RESIDENT' || user.accountStatus !== 'ACTIVE' || !user.twoFactor?.enabled) {
      throw new AppError('Two-factor authentication is not available for this account', 401);
    }

    const secret = decryptTotpSecret(user.twoFactor.secretCiphertext);
    const totpValid = verifyTotp(secret, code);
    let remainingRecoveryHashes = Array.isArray(user.twoFactor.recoveryCodeHashes)
      ? user.twoFactor.recoveryCodeHashes.filter((value): value is string => typeof value === 'string')
      : [];
    const recoveryRemaining = totpValid ? remainingRecoveryHashes : consumeRecoveryCode(remainingRecoveryHashes, code);
    if (!totpValid && !recoveryRemaining) {
      await prisma.twoFactorChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw new AppError('Invalid two-factor code', 401);
    }
    if (!totpValid) remainingRecoveryHashes = recoveryRemaining as string[];

    await prisma.$transaction([
      prisma.twoFactorChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }),
      ...(totpValid ? [] : [prisma.adminTwoFactor.update({ where: { userId: user.id }, data: { recoveryCodeHashes: remainingRecoveryHashes } })]),
    ]);
    return { user, tokens: await this.generateTokens(user) };
  }

  async getTwoFactorStatus(userId: string) {
    const user = await this.requireAdmin(userId);
    const record = await prisma.adminTwoFactor.findUnique({ where: { userId: user.id } });
    const hashes = Array.isArray(record?.recoveryCodeHashes) ? record.recoveryCodeHashes : [];
    return { enabled: record?.enabled === true, recoveryCodesRemaining: hashes.length };
  }

  async setupTwoFactor(userId: string) {
    const user = await this.requireAdmin(userId);
    const existing = await prisma.adminTwoFactor.findUnique({ where: { userId: user.id } });
    if (existing?.enabled) throw new AppError('Two-factor authentication is already enabled', 409);
    const secret = generateTotpSecret();
    const recoveryCodes = generateRecoveryCodes();
    await prisma.adminTwoFactor.upsert({
      where: { userId: user.id },
      create: { userId: user.id, secretCiphertext: encryptTotpSecret(secret), recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode), enabled: false },
      update: { secretCiphertext: encryptTotpSecret(secret), recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode), enabled: false, verifiedAt: null },
    });
    return { secret, recoveryCodes, qrCodeDataUrl: await createTotpQrCode(secret, user.email) };
  }

  async confirmTwoFactor(userId: string, code: string) {
    const user = await this.requireAdmin(userId);
    const record = await prisma.adminTwoFactor.findUnique({ where: { userId: user.id } });
    if (!record) throw new AppError('Start two-factor setup first', 400);
    if (record.enabled) return { enabled: true };
    if (!verifyTotp(decryptTotpSecret(record.secretCiphertext), code)) throw new AppError('Invalid authenticator code', 400);
    await prisma.adminTwoFactor.update({ where: { userId: user.id }, data: { enabled: true, verifiedAt: new Date() } });
    return { enabled: true };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.requireAdmin(userId);
    const record = await prisma.adminTwoFactor.findUnique({ where: { userId: user.id } });
    if (!record?.enabled) return { enabled: false };
    const validTotp = verifyTotp(decryptTotpSecret(record.secretCiphertext), code);
    const remaining = validTotp ? record.recoveryCodeHashes : consumeRecoveryCode(Array.isArray(record.recoveryCodeHashes) ? record.recoveryCodeHashes.filter((value): value is string => typeof value === 'string') : [], code);
    if (!validTotp && !remaining) throw new AppError('Invalid two-factor code', 400);
    await prisma.adminTwoFactor.delete({ where: { userId: user.id } });
    return { enabled: false };
  }

  private async requireAdmin(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role === 'RESIDENT' || user.accountStatus !== 'ACTIVE') throw new AppError('Administrator access required', 403);
    return user;
  }

  async refreshTokens(refreshToken: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (
      !storedToken ||
      storedToken.revoked ||
      new Date() > storedToken.expiresAt
    ) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    if (isSessionInactive(storedToken.lastActivityAt, storedToken.createdAt)) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true },
      });
      throw new AppError(SESSION_EXPIRED_MESSAGE, 401);
    }

    const user = await prisma.user.findUnique({
      where: {
        id: storedToken.userId,
      },
    });

    if (!user || user.accountStatus !== 'ACTIVE') {
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { revoked: true },
      });
      throw new AppError('Account is inactive or has been deleted', 401);
    }

    await prisma.refreshToken.update({
      where: {
        id: storedToken.id,
      },
      data: {
        revoked: true,
      },
    });

    return this.generateTokens(user);
  }

  async logout(refreshToken: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await prisma.refreshToken.updateMany({
      where: {
        tokenHash,
      },
      data: {
        revoked: true,
      },
    });
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.accountStatus !== 'ACTIVE') {
      return {
        message: 'If this email is registered, you will receive a reset link.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.systemSetting.upsert({
      where: {
        key: `reset_${user.id}`,
      },
      update: {
        value: JSON.stringify({
          hash: resetTokenHash,
          expiresAt,
        }),
      },
      create: {
        key: `reset_${user.id}`,
        value: JSON.stringify({
          hash: resetTokenHash,
          expiresAt,
        }),
      },
    });

    await sendPasswordResetEmail(
      user.email,
      user.fullName,
      resetToken
    );

    return {
      message: 'If this email is registered, you will receive a reset link.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!newPassword || newPassword.length < 12 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      throw new AppError('Password must be at least 12 characters and include uppercase, lowercase, number, and special character', 400);
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          startsWith: 'reset_',
        },
      },
    });

    let userId: string | null = null;

    for (const setting of settings) {
      const data = JSON.parse(setting.value);

      if (
        data.hash === tokenHash &&
        new Date() < new Date(data.expiresAt)
      ) {
        userId = setting.key.replace('reset_', '');
        break;
      }
    }

    if (!userId) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, accountStatus: true },
    });
    if (!user || user.accountStatus !== 'ACTIVE') {
      throw new AppError('Account is inactive or has been deleted', 401);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: userId,
        },
      data: {
        passwordHash,
        },
      }),
      prisma.systemSetting.delete({
        where: {
          key: `reset_${userId}`,
        },
      }),
      prisma.refreshToken.updateMany({
        where: {
          userId,
        },
        data: {
          revoked: true,
        },
      }),
    ]);

    return {
      message: 'Password reset successful.',
    };
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    role: string;
  }) {
    const refreshToken = crypto.randomBytes(64).toString('hex');

    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const storedToken = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        lastActivityAt: new Date(),
        revoked: false,
      },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: storedToken.id,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}

export const authService = new AuthService();
