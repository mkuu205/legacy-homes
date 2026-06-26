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

    const house = await prisma.house.findUnique({
      where: { houseNumber },
    });

    if (!house) {
      throw new AppError(`House ${houseNumber} not found. Please check your house number and try again.`, 400);
    }

    const existingResident = await prisma.user.findUnique({
      where: { houseId: house.id },
    });

    if (existingResident) {
      throw new AppError('This house is already assigned', 409);
    }

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

    if (user.accountStatus === 'INACTIVE') {
      throw new AppError('Your account is inactive. Please contact support.', 403);
    }

    const tokens = await this.generateTokens(user);

    return {
      user,
      tokens,
    };
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

    const user = await prisma.user.findUnique({
      where: {
        id: storedToken.userId,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
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

    if (!user) {
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

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash,
      },
    });

    await prisma.systemSetting.delete({
      where: {
        key: `reset_${userId}`,
      },
    });

    await prisma.refreshToken.updateMany({
      where: {
        userId,
      },
      data: {
        revoked: true,
      },
    });

    return {
      message: 'Password reset successful.',
    };
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    role: string;
  }) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);

    const refreshToken = crypto.randomBytes(64).toString('hex');

    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        revoked: false,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}

export const authService = new AuthService();
