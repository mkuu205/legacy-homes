"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const prisma_1 = __importDefault(require("../config/prisma"));
class AuthController {
    async register(req, res, next) {
        try {
            const result = await auth_service_1.authService.register(req.body);
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async verifyOTP(req, res, next) {
        try {
            const { userId, otp } = req.body;
            const result = await auth_service_1.authService.verifyOTPAndActivate(userId, otp);
            // Fetch house info for frontend
            const house = result.user.houseId
                ? await prisma_1.default.house.findUnique({ where: { id: result.user.houseId } })
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
        }
        catch (error) {
            next(error);
        }
    }
    async resendOTP(req, res, next) {
        try {
            const { userId } = req.body;
            const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
            if (!user) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }
            await auth_service_1.authService.sendOTP(user.id, user.email, user.fullName);
            res.json({ success: true, message: 'OTP resent successfully.' });
        }
        catch (error) {
            next(error);
        }
    }
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await auth_service_1.authService.login(email, password);
            // Fetch house info for frontend
            const house = result.user.houseId
                ? await prisma_1.default.house.findUnique({ where: { id: result.user.houseId } })
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
        }
        catch (error) {
            next(error);
        }
    }
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const tokens = await auth_service_1.authService.refreshTokens(refreshToken);
            res.json({ success: true, data: tokens });
        }
        catch (error) {
            next(error);
        }
    }
    async logout(req, res, next) {
        try {
            const { refreshToken } = req.body;
            await auth_service_1.authService.logout(refreshToken);
            res.json({ success: true, message: 'Logged out successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;
            const result = await auth_service_1.authService.forgotPassword(email);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async resetPassword(req, res, next) {
        try {
            const { token, newPassword } = req.body;
            const result = await auth_service_1.authService.resetPassword(token, newPassword);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async getMe(req, res, next) {
        try {
            const user = await prisma_1.default.user.findUnique({
                where: { id: req.user.userId },
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
                ? await prisma_1.default.house.findUnique({ where: { id: user.houseId } })
                : null;
            res.json({
                success: true,
                data: {
                    ...user,
                    houseNumber: house?.houseNumber, // Return houseNumber for frontend
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=auth.controller.js.map