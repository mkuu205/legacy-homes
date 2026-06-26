"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const prisma_1 = __importDefault(require("../config/prisma"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const email_1 = require("../utils/email");
const audit_service_1 = require("../services/audit.service");
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
    async deleteAccount(req, res, next) {
        try {
            const { password } = req.body;
            if (!password) {
                res.status(400).json({ success: false, message: 'Password is required to delete your account' });
                return;
            }
            const user = await prisma_1.default.user.findUnique({ where: { id: req.user.userId } });
            if (!user) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }
            // Verify password
            const isValid = await bcryptjs_1.default.compare(password, user.passwordHash);
            if (!isValid) {
                res.status(400).json({ success: false, message: 'Incorrect password. Please try again.' });
                return;
            }
            // Audit log before deletion (while user still exists)
            await audit_service_1.auditService.logAction({
                userId: user.id,
                action: 'DELETE_ACCOUNT',
                resource: 'User',
                resourceId: user.id,
                details: { email: user.email, fullName: user.fullName },
                ipAddress: req.ip,
            }).catch(() => { });
            // Send deletion email asynchronously
            (0, email_1.sendAccountDeletedEmail)(user.email, user.fullName).catch(() => { });
            // Explicitly delete all related records to avoid FK constraint violations
            // (schema-level cascades are not defined for all relations)
            await prisma_1.default.$transaction(async (tx) => {
                // Payments reference bills (billId FK), delete payments first
                await tx.payment.deleteMany({ where: { residentId: user.id } });
                // Unlink meter readings from bills before deleting bills
                const userBills = await tx.bill.findMany({ where: { residentId: user.id }, select: { id: true } });
                const userBillIds = userBills.map((b) => b.id);
                if (userBillIds.length > 0) {
                    await tx.meterReading.updateMany({ where: { billId: { in: userBillIds } }, data: { billId: null } });
                }
                // Delete bills
                await tx.bill.deleteMany({ where: { residentId: user.id } });
                // Delete user notifications (UserNotification has cascade on user)
                await tx.userNotification.deleteMany({ where: { userId: user.id } });
                // Delete audit logs
                await tx.auditLog.deleteMany({ where: { userId: user.id } });
                // Support tickets
                await tx.ticketReply.deleteMany({ where: { userId: user.id } });
                await tx.ticket.deleteMany({ where: { residentId: user.id } });
                // OTP codes and refresh tokens
                await tx.otpCode.deleteMany({ where: { userId: user.id } });
                await tx.refreshToken.deleteMany({ where: { userId: user.id } });
                // Unassign house before deleting user
                await tx.user.update({ where: { id: user.id }, data: { houseId: null } });
                // Finally delete the user
                await tx.user.delete({ where: { id: user.id } });
            });
            res.json({ success: true, message: 'Your account has been permanently deleted.' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=auth.controller.js.map