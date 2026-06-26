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
const jwt_1 = require("../utils/jwt");
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
        // Wrap in a transaction for full atomicity
        await prisma_1.default.$transaction(async (tx) => {
            // 1. Delete payments (reference bills)
            await tx.payment.deleteMany({ where: { residentId: id } });
            // 2. Unlink meter readings from bills (readingId is unique FK on Bill)
            const bills = await tx.bill.findMany({ where: { residentId: id }, select: { id: true } });
            const billIds = bills.map((b) => b.id);
            if (billIds.length > 0) {
                await tx.meterReading.updateMany({ where: { billId: { in: billIds } }, data: { billId: null } });
            }
            // 3. Delete bills
            await tx.bill.deleteMany({ where: { residentId: id } });
            // 4. Delete user notifications
            await tx.userNotification.deleteMany({ where: { userId: id } });
            // 5. Delete support ticket replies
            await tx.ticketReply.deleteMany({ where: { userId: id } });
            // 6. Delete support tickets
            await tx.ticket.deleteMany({ where: { residentId: id } });
            // 7. Delete audit logs
            await tx.auditLog.deleteMany({ where: { userId: id } });
            // 8. Delete OTP codes and refresh tokens
            await tx.otpCode.deleteMany({ where: { userId: id } });
            await tx.refreshToken.deleteMany({ where: { userId: id } });
            // 9. Delete the user (houseId FK removed with user)
            await tx.user.delete({ where: { id } });
        });
        return { message: 'Resident and all associated data deleted successfully' };
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
    async createResident(data) {
        // Check for existing email or phone
        const existing = await prisma_1.default.user.findFirst({
            where: { OR: [{ email: data.email }, { phone: data.phone }] },
        });
        if (existing)
            throw new errorHandler_1.AppError('A user with this email or phone already exists', 409);
        // Lookup house
        const house = await prisma_1.default.house.findUnique({ where: { houseNumber: data.houseNumber } });
        if (!house)
            throw new errorHandler_1.AppError(`House number ${data.houseNumber} not found`, 400);
        // Check house is not already occupied
        const occupant = await prisma_1.default.user.findFirst({ where: { houseId: house.id } });
        if (occupant)
            throw new errorHandler_1.AppError(`House ${data.houseNumber} is already assigned to another resident`, 409);
        const passwordHash = await bcryptjs_1.default.hash(data.password, 12);
        const accountNumber = (0, jwt_1.generateAccountNumber)();
        const resident = await prisma_1.default.user.create({
            data: {
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                passwordHash,
                role: 'RESIDENT',
                accountStatus: 'ACTIVE',
                registrationStatus: 'APPROVED',
                emailVerified: true,
                accountNumber,
                houseId: house.id,
                nationalId: data.nationalId,
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                accountNumber: true,
                accountStatus: true,
                houseId: true,
                createdAt: true,
            },
        });
        return { ...resident, houseNumber: house.houseNumber };
    }
    async exportResidentsCSV(query) {
        const { residents } = await this.getAllResidents({ ...query, limit: 10000 });
        const headers = [
            'Account Number', 'Full Name', 'Email', 'Phone', 'House Number',
            'National ID', 'Status', 'Email Verified', 'Created Date',
        ];
        const rows = residents.map((r) => [
            r.accountNumber,
            r.fullName,
            r.email,
            r.phone || '',
            r.houseNumber || '',
            r.nationalId || '',
            r.accountStatus,
            r.emailVerified ? 'Yes' : 'No',
            new Date(r.createdAt).toLocaleDateString('en-KE'),
        ]);
        return [headers, ...rows]
            .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
            .join('\n');
    }
}
exports.ResidentService = ResidentService;
exports.residentService = new ResidentService();
//# sourceMappingURL=resident.service.js.map