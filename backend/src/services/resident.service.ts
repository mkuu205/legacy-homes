import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { uploadToCloudinary, uploadBufferToCloudinary } from '../utils/cloudinary';
import { generateAccountNumber } from '../utils/jwt';

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
    houseNumber: string;
  }>) {
    const resident = await prisma.user.findFirst({ where: { id, role: 'RESIDENT' } });
    if (!resident) throw new AppError('Resident not found', 404);

    const { houseNumber, ...profileData } = data;
    const updated = await prisma.$transaction(async (tx) => {
      if (houseNumber !== undefined) {
        const normalizedHouseNumber = houseNumber.trim().toUpperCase();
        const target = await tx.house.findUnique({ where: { houseNumber: normalizedHouseNumber } });
        if (!target) throw new AppError(`House number ${normalizedHouseNumber} not found`, 400);
        const occupant = await tx.user.findFirst({ where: { houseId: target.id, id: { not: id } } });
        if (occupant) throw new AppError(`House ${normalizedHouseNumber} is already assigned to another resident`, 409);
        if (resident.houseId && resident.houseId !== target.id) {
          await tx.house.update({ where: { id: resident.houseId }, data: { occupancyStatus: 'VACANT' } });
        }
        await tx.house.update({ where: { id: target.id }, data: { occupancyStatus: 'OCCUPIED' } });
        return tx.user.update({ where: { id }, data: { ...profileData, houseId: target.id } });
      }
      return tx.user.update({ where: { id }, data: profileData });
    });

    const house = updated.houseId ? await prisma.house.findUnique({ where: { id: updated.houseId } }) : null;
    return { ...updated, houseNumber: house?.houseNumber };
  }

    async updateProfile(userId: string, data: {
    fullName?: string;
    phone?: string;
    email?: string;
    nationalId?: string;
    houseNumber?: string;
  }) {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current) throw new AppError('User not found', 404);
      const { houseNumber, ...profileData } = data;

      if (houseNumber !== undefined) {
        const normalizedHouseNumber = houseNumber.trim().toUpperCase();
        const target = await tx.house.findUnique({ where: { houseNumber: normalizedHouseNumber } });
        if (!target) throw new AppError(`House number ${normalizedHouseNumber} not found`, 400);
        const occupant = await tx.user.findFirst({ where: { houseId: target.id, id: { not: userId } } });
        if (occupant) throw new AppError(`House ${normalizedHouseNumber} is already assigned to another resident`, 409);
        if (current.houseId && current.houseId !== target.id) {
          await tx.house.update({ where: { id: current.houseId }, data: { occupancyStatus: 'VACANT' } });
        }
        await tx.house.update({ where: { id: target.id }, data: { occupancyStatus: 'OCCUPIED' } });
        return tx.user.update({ where: { id: userId }, data: { ...profileData, houseId: target.id }, select: { id: true, fullName: true, email: true, phone: true, houseId: true, accountNumber: true, nationalId: true, profilePicture: true, accountStatus: true } });
      }

      return tx.user.update({ where: { id: userId }, data: profileData, select: { id: true, fullName: true, email: true, phone: true, houseId: true, accountNumber: true, nationalId: true, profilePicture: true, accountStatus: true } });
    });
    const house = updated.houseId ? await prisma.house.findUnique({ where: { id: updated.houseId } }) : null;
    return { ...updated, houseNumber: house?.houseNumber };
  }

  async updateProfilePicture(userId: string, fileBuffer: Buffer) {
    try {
      const uploadResult = await uploadBufferToCloudinary(fileBuffer, 'profile-pictures');
      return await prisma.user.update({
        where: { id: userId },
        data: { profilePicture: uploadResult.url },
        select: { id: true, profilePicture: true },
      });
    } catch (error: any) {
      logger.error('[RESIDENT_SERVICE] Failed to update profile picture', { error, userId });
      if (error.statusCode === 503) {
        throw new AppError('Profile picture upload is temporarily unavailable (Cloudinary not configured)', 503);
      }
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 12 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      throw new AppError('Password must be at least 12 characters and include uppercase, lowercase, number, and special character', 400);
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new AppError('Current password is incorrect', 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } }),
    ]);

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

    // Wrap in a transaction for full atomicity
    await prisma.$transaction(async (tx) => {
      // Financial bills, payments, meter readings, and their relationships are
      // retained permanently for auditability. Only non-financial session and
      // account-access data is revoked below.
      // Delete user notifications
      await tx.userNotification.deleteMany({ where: { userId: id } });
      // Delete support ticket replies
      await tx.ticketReply.deleteMany({ where: { userId: id } });
      // Delete support tickets
      await tx.ticket.deleteMany({ where: { residentId: id } });
      // Preserve audit logs for historical accountability.
      // Delete OTP codes and refresh tokens
      await tx.otpCode.deleteMany({ where: { userId: id } });
      await tx.refreshToken.deleteMany({ where: { userId: id } });
      // Permanently deactivate the account while retaining its identity and financial history.
      if (resident.houseId) {
        await tx.house.update({ where: { id: resident.houseId }, data: { occupancyStatus: 'VACANT' } });
      }
      await tx.user.update({
        where: { id },
        data: { houseId: null, accountStatus: 'INACTIVE', registrationStatus: 'REJECTED', emailVerified: false },
      });
    });
    return { message: 'Resident account deactivated; financial history retained for audit.' };
  }

  async adminResetPassword(id: string, newPassword: string) {
    if (!newPassword || newPassword.length < 12 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      throw new AppError('Password must be at least 12 characters and include uppercase, lowercase, number, and special character', 400);
    }
    const resident = await prisma.user.findFirst({ where: { id, role: 'RESIDENT' } });
    if (!resident) throw new AppError('Resident not found', 404);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { passwordHash } }),
      prisma.refreshToken.updateMany({ where: { userId: id }, data: { revoked: true } }),
    ]);
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
        where: {
          userId,
          channel: 'IN_APP',
          status: { not: 'READ' },
        },
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
  async createResident(data: {
    fullName: string;
    email: string;
    phone: string;
    houseNumber: string;
    password: string;
    nationalId?: string;
  }) {
    // Check for existing email or phone
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { phone: data.phone }] },
    });
    if (existing) throw new AppError('A user with this email or phone already exists', 409);

    // Lookup house
    const house = await prisma.house.findUnique({ where: { houseNumber: data.houseNumber } });
    if (!house) throw new AppError(`House number ${data.houseNumber} not found`, 400);

    // Check house is not already occupied
    const occupant = await prisma.user.findFirst({ where: { houseId: house.id } });
    if (occupant) throw new AppError(`House ${data.houseNumber} is already assigned to another resident`, 409);

    const passwordHash = await bcrypt.hash(data.password, 12);
    const accountNumber = generateAccountNumber();

    const resident = await prisma.user.create({
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

  async exportResidentsCSV(query: { status?: string; search?: string }): Promise<string> {
    const { residents } = await this.getAllResidents({ ...query, limit: 10000 });
    const headers = [
      'Account Number', 'Full Name', 'Email', 'Phone', 'House Number',
      'National ID', 'Status', 'Email Verified', 'Created Date',
    ];
    const rows = (residents as any[]).map((r) => [
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
      .map((row) => row.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }
}

export const residentService = new ResidentService();
