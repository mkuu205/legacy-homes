import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { uploadToCloudinary } from '../utils/cloudinary';

export class ResidentService {
  async getAllResidents(query: { page?: number; limit?: number; search?: string; status?: string }) {
    const pageNum = Number.parseInt(String(query?.page || 1), 10);
    const limitNum = Number.parseInt(String(query?.limit || 20), 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { role: 'RESIDENT' };
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { accountNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.accountStatus = query.status;

    const [residents, total] = await Promise.all([
      prisma.user.findMany({
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
      prisma.user.count({ where }),
    ]);

    // Fetch house info for residents to return houseNumber
    const residentsWithHouseNumber = await Promise.all(
      residents.map(async (resident) => {
        const house = resident.houseId
          ? await prisma.house.findUnique({ where: { id: resident.houseId } })
          : null;
        return {
          ...resident,
          houseNumber: house?.houseNumber,
        };
      })
    );

    return {
      residents: residentsWithHouseNumber,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    };
  }

  async getResidentById(id: string) {
    const resident = await prisma.user.findFirst({
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
    if (!resident) throw new AppError('Resident not found', 404);

    // Fetch related data separately
    const [house, bills, payments] = await Promise.all([
      resident.houseId ? prisma.house.findUnique({ where: { id: resident.houseId } }) : null,
      prisma.bill.findMany({
        where: { residentId: id },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.payment.findMany({
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

  async updateResident(id: string, data: Partial<{
    fullName: string;
    phone: string;
    nationalId: string;
  }>) {
    const resident = await prisma.user.findFirst({ where: { id, role: 'RESIDENT' } });
    if (!resident) throw new AppError('Resident not found', 404);

    return prisma.user.update({ where: { id }, data });
  }

  async updateProfile(userId: string, data: {
    fullName?: string;
    phone?: string;
    nationalId?: string;
  }) {
    const updated = await prisma.user.update({
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
      ? await prisma.house.findUnique({ where: { id: updated.houseId } })
      : null;

    return {
      ...updated,
      houseNumber: house?.houseNumber,
    };
  }

  async updateProfilePicture(userId: string, filePath: string) {
    const url = await uploadToCloudinary(filePath, 'profile-pictures');
    return prisma.user.update({
      where: { id: userId },
      data: { profilePicture: url },
      select: { id: true, profilePicture: true },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new AppError('Current password is incorrect', 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return { message: 'Password changed successfully' };
  }

  async updateAccountStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE') {
    const resident = await prisma.user.findFirst({ where: { id, role: 'RESIDENT' } });
    if (!resident) throw new AppError('Resident not found', 404);

    return prisma.user.update({ where: { id }, data: { accountStatus: status } });
  }

  async deleteResident(id: string) {
    const resident = await prisma.user.findFirst({ where: { id, role: 'RESIDENT' } });
    if (!resident) throw new AppError('Resident not found', 404);

    await prisma.user.delete({ where: { id } });
    return { message: 'Resident deleted successfully' };
  }

  async adminResetPassword(id: string, newPassword: string) {
    const resident = await prisma.user.findFirst({ where: { id, role: 'RESIDENT' } });
    if (!resident) throw new AppError('Resident not found', 404);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    return { message: 'Password reset successfully' };
  }

  async getResidentDashboard(userId: string) {
    const [user, currentBill, recentPayments, unreadNotifications] = await Promise.all([
      prisma.user.findUnique({
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
      prisma.bill.findFirst({
        where: { residentId: userId, status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.findMany({
        where: { residentId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.userNotification.count({
        where: { userId, status: { not: 'READ' } },
      }),
    ]);

    if (!user) throw new AppError('User not found', 404);

    // Fetch house info
    const house = user.houseId
      ? await prisma.house.findUnique({ where: { id: user.houseId } })
      : null;

    const consumptionHistory = await prisma.meterReading.findMany({
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

export const residentService = new ResidentService();
