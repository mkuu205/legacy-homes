"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.residentService = exports.ResidentService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../config/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const cloudinary_1 = require("../utils/cloudinary");
class ResidentService {
    async getAllResidents(query) {
        const pageNum = Number.parseInt(String(query?.page || 1), 10);
        const limitNum = Number.parseInt(String(query?.limit || 20), 10);
        const skip = (pageNum - 1) * limitNum;
        const where = { role: 'RESIDENT' };
        if (query.search) {
            where.OR = [
                { fullName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search, mode: 'insensitive' } },
                { accountNumber: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        if (query.status)
            where.accountStatus = query.status;
        const [residents, total] = await Promise.all([
            prisma_1.default.user.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    houseId: true,
                    accountNumber: true,
                    accountStatus: true,
                    profilePicture: true,
                    nationalId: true,
                    emailVerified: true,
                    createdAt: true,
                },
            }),
            prisma_1.default.user.count({ where }),
        ]);
        // Fetch house info for residents to return houseNumber
        const residentsWithHouseNumber = await Promise.all(residents.map(async (resident) => {
            const house = resident.houseId
                ? await prisma_1.default.house.findUnique({ where: { id: resident.houseId } })
                : null;
            return {
                ...resident,
                houseNumber: house?.houseNumber,
            };
        }));
        return {
            residents: residentsWithHouseNumber,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
        };
    }
    async getResidentById(id) {
        const resident = await prisma_1.default.user.findFirst({
            where: { id, role: 'RESIDENT' },
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                houseId: true,
                accountNumber: true,
                profilePicture: true,
                nationalId: true,
                accountStatus: true,
                registrationStatus: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!resident)
            throw new errorHandler_1.AppError('Resident not found', 404);
        // Fetch related data separately
        const [house, bills, payments] = await Promise.all([
            resident.houseId ? prisma_1.default.house.findUnique({ where: { id: resident.houseId } }) : null,
            prisma_1.default.bill.findMany({
                where: { residentId: id },
                orderBy: { createdAt: 'desc' },
                take: 6,
            }),
            prisma_1.default.payment.findMany({
                where: { residentId: id },
                orderBy: { createdAt: 'desc' },
                take: 6,
            }),
        ]);
        return {
            ...resident,
            houseNumber: house?.houseNumber,
            bills,
            payments,
        };
    }
    async updateResident(id, data) {
        const resident = await prisma_1.default.user.findFirst({ where: { id, role: 'RESIDENT' } });
        if (!resident)
            throw new errorHandler_1.AppError('Resident not found', 404);
        return prisma_1.default.user.update({ where: { id }, data });
    }
    async updateProfile(userId, data) {
        const updated = await prisma_1.default.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                houseId: true,
                accountNumber: true,
                nationalId: true,
                profilePicture: true,
                accountStatus: true,
            },
        });
        // Fetch house for houseNumber
        const house = updated.houseId
            ? await prisma_1.default.house.findUnique({ where: { id: updated.houseId } })
            : null;
        return {
            ...updated,
            houseNumber: house?.houseNumber,
        };
    }
    async updateProfilePicture(userId, filePath) {
        const url = await (0, cloudinary_1.uploadToCloudinary)(filePath, 'profile-pictures');
        return prisma_1.default.user.update({
            where: { id: userId },
            data: { profilePicture: url },
            select: { id: true, profilePicture: true },
        });
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new errorHandler_1.AppError('User not found', 404);
        const isValid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isValid)
            throw new errorHandler_1.AppError('Current password is incorrect', 400);
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma_1.default.user.update({ where: { id: userId }, data: { passwordHash } });
        return { message: 'Password changed successfully' };
    }
    async updateAccountStatus(id, status) {
        const resident = await prisma_1.default.user.findFirst({ where: { id, role: 'RESIDENT' } });
        if (!resident)
            throw new errorHandler_1.AppError('Resident not found', 404);
        return prisma_1.default.user.update({ where: { id }, data: { accountStatus: status } });
    }
    async deleteResident(id) {
        const resident = await prisma_1.default.user.findFirst({ where: { id, role: 'RESIDENT' } });
        if (!resident)
            throw new errorHandler_1.AppError('Resident not found', 404);
        await prisma_1.default.user.delete({ where: { id } });
        return { message: 'Resident deleted successfully' };
    }
    async adminResetPassword(id, newPassword) {
        const resident = await prisma_1.default.user.findFirst({ where: { id, role: 'RESIDENT' } });
        if (!resident)
            throw new errorHandler_1.AppError('Resident not found', 404);
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma_1.default.user.update({ where: { id }, data: { passwordHash } });
        return { message: 'Password reset successfully' };
    }
    async getResidentDashboard(userId) {
        const [user, currentBill, recentPayments, unreadNotifications] = await Promise.all([
            prisma_1.default.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    houseId: true,
                    accountNumber: true,
                    profilePicture: true,
                },
            }),
            prisma_1.default.bill.findFirst({
                where: { residentId: userId, status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.default.payment.findMany({
                where: { residentId: userId },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            prisma_1.default.userNotification.count({
                where: { userId, status: { not: 'READ' } },
            }),
        ]);
        if (!user)
            throw new errorHandler_1.AppError('User not found', 404);
        // Fetch house info
        const house = user.houseId
            ? await prisma_1.default.house.findUnique({ where: { id: user.houseId } })
            : null;
        const consumptionHistory = await prisma_1.default.meterReading.findMany({
            where: { meter: { houseId: house?.id } },
            orderBy: { createdAt: 'desc' },
            take: 6,
            select: { billingMonth: true, unitsConsumed: true, createdAt: true },
        });
        return {
            user: { ...user, houseNumber: house?.houseNumber },
            currentBill,
            recentPayments,
            unreadNotifications,
            consumptionHistory,
        };
    }
}
exports.ResidentService = ResidentService;
exports.residentService = new ResidentService();
//# sourceMappingURL=resident.service.js.map