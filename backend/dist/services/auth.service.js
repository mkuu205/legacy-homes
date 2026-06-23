"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../config/prisma"));
const otp_1 = require("../utils/otp");
const jwt_1 = require("../utils/jwt");
const email_1 = require("../utils/email");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
const crypto_1 = __importDefault(require("crypto"));
class AuthService {
    async register(data) {
        const existingEmail = await prisma_1.default.user.findUnique({
            where: { email: data.email },
        });
        if (existingEmail) {
            throw new errorHandler_1.AppError('Email already registered', 409);
        }
        const existingPhone = await prisma_1.default.user.findUnique({
            where: { phone: data.phone },
        });
        if (existingPhone) {
            throw new errorHandler_1.AppError('Phone number already registered', 409);
        }
        const house = await prisma_1.default.house.findUnique({
            where: { houseNumber: data.houseNumber },
        });
        if (!house) {
            throw new errorHandler_1.AppError('Invalid house number', 400);
        }
        const existingResident = await prisma_1.default.user.findUnique({
            where: { houseId: house.id },
        });
        if (existingResident) {
            throw new errorHandler_1.AppError('This house is already assigned', 409);
        }
        const passwordHash = await bcryptjs_1.default.hash(data.password, 12);
        const accountNumber = (0, jwt_1.generateAccountNumber)();
        const user = await prisma_1.default.user.create({
            data: {
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                houseId: house.id,
                passwordHash,
                nationalId: data.nationalId,
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
    async sendOTP(userId, email, name) {
        await prisma_1.default.otpCode.updateMany({
            where: {
                userId,
                used: false,
            },
            data: {
                used: true,
            },
        });
        const otp = (0, otp_1.generateOTP)();
        const otpHash = await (0, otp_1.hashOTP)(otp);
        const expiresAt = (0, otp_1.getOTPExpiry)(10);
        await prisma_1.default.otpCode.create({
            data: {
                userId,
                otpHash,
                expiresAt,
            },
        });
        await (0, email_1.sendOTPEmail)(email, name, otp);
        logger_1.default.info(`OTP sent to ${email}`);
    }
    async verifyOTPAndActivate(userId, otp) {
        const otpRecord = await prisma_1.default.otpCode.findFirst({
            where: {
                userId,
                used: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (!otpRecord) {
            throw new errorHandler_1.AppError('No active OTP found. Please request a new one.', 400);
        }
        if (new Date() > otpRecord.expiresAt) {
            await prisma_1.default.otpCode.update({
                where: { id: otpRecord.id },
                data: { used: true },
            });
            throw new errorHandler_1.AppError('OTP has expired. Please request a new one.', 400);
        }
        if (otpRecord.attempts >= 5) {
            throw new errorHandler_1.AppError('Maximum OTP attempts exceeded. Please request a new one.', 400);
        }
        const isValid = await (0, otp_1.verifyOTP)(otp, otpRecord.otpHash);
        if (!isValid) {
            await prisma_1.default.otpCode.update({
                where: { id: otpRecord.id },
                data: {
                    attempts: {
                        increment: 1,
                    },
                },
            });
            const remaining = 5 - (otpRecord.attempts + 1);
            throw new errorHandler_1.AppError(`Invalid OTP. ${remaining} attempts remaining.`, 400);
        }
        await prisma_1.default.otpCode.update({
            where: { id: otpRecord.id },
            data: { used: true },
        });
        const user = await prisma_1.default.user.update({
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
    async login(email, password) {
        const user = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new errorHandler_1.AppError('Invalid email or password', 401);
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new errorHandler_1.AppError('Invalid email or password', 401);
        }
        if (!user.emailVerified) {
            throw new errorHandler_1.AppError('Please verify your email before logging in.', 403);
        }
        if (user.accountStatus === 'SUSPENDED') {
            throw new errorHandler_1.AppError('Your account has been suspended. Please contact support.', 403);
        }
        if (user.accountStatus === 'INACTIVE') {
            throw new errorHandler_1.AppError('Your account is inactive. Please contact support.', 403);
        }
        const tokens = await this.generateTokens(user);
        return {
            user,
            tokens,
        };
    }
    async refreshTokens(refreshToken) {
        const tokenHash = crypto_1.default
            .createHash('sha256')
            .update(refreshToken)
            .digest('hex');
        const storedToken = await prisma_1.default.refreshToken.findUnique({
            where: { tokenHash },
        });
        if (!storedToken ||
            storedToken.revoked ||
            new Date() > storedToken.expiresAt) {
            throw new errorHandler_1.AppError('Invalid or expired refresh token', 401);
        }
        const user = await prisma_1.default.user.findUnique({
            where: {
                id: storedToken.userId,
            },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
        await prisma_1.default.refreshToken.update({
            where: {
                id: storedToken.id,
            },
            data: {
                revoked: true,
            },
        });
        return this.generateTokens(user);
    }
    async logout(refreshToken) {
        const tokenHash = crypto_1.default
            .createHash('sha256')
            .update(refreshToken)
            .digest('hex');
        await prisma_1.default.refreshToken.updateMany({
            where: {
                tokenHash,
            },
            data: {
                revoked: true,
            },
        });
    }
    async forgotPassword(email) {
        const user = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (!user) {
            return {
                message: 'If this email is registered, you will receive a reset link.',
            };
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const resetTokenHash = crypto_1.default
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await prisma_1.default.systemSetting.upsert({
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
        await (0, email_1.sendPasswordResetEmail)(user.email, user.fullName, resetToken);
        return {
            message: 'If this email is registered, you will receive a reset link.',
        };
    }
    async resetPassword(token, newPassword) {
        const tokenHash = crypto_1.default
            .createHash('sha256')
            .update(token)
            .digest('hex');
        const settings = await prisma_1.default.systemSetting.findMany({
            where: {
                key: {
                    startsWith: 'reset_',
                },
            },
        });
        let userId = null;
        for (const setting of settings) {
            const data = JSON.parse(setting.value);
            if (data.hash === tokenHash &&
                new Date() < new Date(data.expiresAt)) {
                userId = setting.key.replace('reset_', '');
                break;
            }
        }
        if (!userId) {
            throw new errorHandler_1.AppError('Invalid or expired reset token', 400);
        }
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma_1.default.user.update({
            where: {
                id: userId,
            },
            data: {
                passwordHash,
            },
        });
        await prisma_1.default.systemSetting.delete({
            where: {
                key: `reset_${userId}`,
            },
        });
        await prisma_1.default.refreshToken.updateMany({
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
    async generateTokens(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = (0, jwt_1.generateAccessToken)(payload);
        const refreshToken = crypto_1.default.randomBytes(64).toString('hex');
        const tokenHash = crypto_1.default
            .createHash('sha256')
            .update(refreshToken)
            .digest('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await prisma_1.default.refreshToken.create({
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
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map