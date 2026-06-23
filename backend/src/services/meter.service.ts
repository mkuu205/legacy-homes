import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { uploadToCloudinary } from '../utils/cloudinary';

export class MeterService {
  async getAllMeters(query: { page?: number; limit?: number; search?: string; status?: string }) {
    const pageNum = Number.parseInt(String(query?.page || 1), 10);
    const limitNum = Number.parseInt(String(query?.limit || 20), 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { meterNumber: { contains: query.search, mode: 'insensitive' } },
        { meterSerial: { contains: query.search, mode: 'insensitive' } },
        { house: { houseNumber: { contains: query.search, mode: 'insensitive' } } },
        { house: { resident: { fullName: { contains: query.search, mode: 'insensitive' } } } },
        { house: { resident: { accountNumber: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }
    if (query.status) where.status = query.status;

    const [meters, total] = await Promise.all([
      prisma.meter.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          meterNumber: true,
          meterSerial: true,
          houseId: true,
          status: true,
          installationDate: true,
          previousReading: true,
          currentReading: true,
          createdAt: true,
        },
      }),
      prisma.meter.count({ where }),
    ]);

    // Fetch house and resident info for each meter
    const metersWithDetails = await Promise.all(
      meters.map(async (meter) => {
        const house = await prisma.house.findUnique({
          where: { id: meter.houseId },
          include: {
            resident: {
              select: {
                id: true,
                fullName: true,
                accountNumber: true,
                phone: true,
                email: true,
              },
            },
          },
        });
        return {
          ...meter,
          houseNumber: house?.houseNumber,
          resident: house?.resident || null,
        };
      })
    );

    return {
      meters: metersWithDetails,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    };
  }

  async getMeterById(id: string) {
    const meter = await prisma.meter.findUnique({
      where: { id },
      select: {
        id: true,
        meterNumber: true,
        meterSerial: true,
        houseId: true,
        status: true,
        installationDate: true,
        previousReading: true,
        currentReading: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!meter) throw new AppError('Meter not found', 404);

    // Fetch related data including resident info
    const [house, readings] = await Promise.all([
      prisma.house.findUnique({
        where: { id: meter.houseId },
        include: {
          resident: {
            select: {
              id: true,
              fullName: true,
              accountNumber: true,
              phone: true,
              email: true,
            },
          },
        },
      }),
      prisma.meterReading.findMany({
        where: { meterId: id },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          billingMonth: true,
          previousReading: true,
          currentReading: true,
          unitsConsumed: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      ...meter,
      houseNumber: house?.houseNumber,
      resident: house?.resident || null,
      readings,
    };
  }

  async createMeter(data: {
    meterNumber: string;
    meterSerial: string;
    houseNumber: string;
    installationDate: string;
    notes?: string;
  }) {
    const existing = await prisma.meter.findFirst({
      where: { OR: [{ meterNumber: data.meterNumber }, { meterSerial: data.meterSerial }] },
    });
    if (existing) throw new AppError('Meter number or serial already exists', 409);

    // Lookup house by houseNumber
    const house = await prisma.house.findUnique({
      where: { houseNumber: data.houseNumber },
    });
    if (!house) throw new AppError('Invalid house number', 400);

    // Check if house already has a meter
    const existingMeter = await prisma.meter.findUnique({
      where: { houseId: house.id },
    });
    if (existingMeter) throw new AppError('This house already has a meter assigned', 409);

    const meter = await prisma.meter.create({
      data: {
        meterNumber: data.meterNumber,
        meterSerial: data.meterSerial,
        houseId: house.id,
        installationDate: new Date(data.installationDate),
        notes: data.notes,
      },
    });

    return {
      ...meter,
      houseNumber: house.houseNumber,
    };
  }

  async updateMeter(
    id: string,
    data: Partial<{
      meterNumber: string;
      meterSerial: string;
      status: 'ACTIVE' | 'FAULTY' | 'REPLACED';
      notes: string;
    }>
  ) {
    const meter = await prisma.meter.findUnique({ where: { id } });
    if (!meter) throw new AppError('Meter not found', 404);

    return prisma.meter.update({ where: { id }, data });
  }

  async deleteMeter(id: string) {
    const meter = await prisma.meter.findUnique({ where: { id } });
    if (!meter) throw new AppError('Meter not found', 404);

    // Check for active bills linked to this meter
    const activeBills = await prisma.bill.count({
      where: { meterId: id, status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
    });
    if (activeBills > 0) {
      throw new AppError(
        `Cannot delete meter: it has ${activeBills} active unpaid bill(s). Settle or delete those bills first.`,
        409
      );
    }

    // Delete meter readings first
    await prisma.meterReading.deleteMany({ where: { meterId: id } });
    await prisma.meter.delete({ where: { id } });
    return { message: 'Meter deleted successfully' };
  }

  async addReading(data: {
    meterId: string;
    billingMonth: string;
    currentReading: number;
    notes?: string;
    photoFile?: string;
    readBy: string;
  }) {
    const meter = await prisma.meter.findUnique({ where: { id: data.meterId } });
    if (!meter) throw new AppError('Meter not found', 404);

    if (meter.status !== 'ACTIVE') throw new AppError('Meter is not active', 400);

    // Check for duplicate reading with detailed error message
    const existing = await prisma.meterReading.findUnique({
      where: { meterId_billingMonth: { meterId: data.meterId, billingMonth: data.billingMonth } },
    });
    if (existing) {
      throw new AppError(
        `A reading for ${data.billingMonth} already exists for this meter. Please edit or delete the existing reading first.`,
        409
      );
    }

    if (data.currentReading < meter.currentReading) {
      throw new AppError('Current reading cannot be lower than previous reading', 400);
    }

    const previousReading = meter.currentReading;
    const unitsConsumed = data.currentReading - previousReading;

    let photoUrl: string | undefined;
    if (data.photoFile) {
      photoUrl = await uploadToCloudinary(data.photoFile, 'meter-readings');
    }

    const reading = await prisma.meterReading.create({
      data: {
        meterId: data.meterId,
        readBy: data.readBy,
        billingMonth: data.billingMonth,
        previousReading,
        currentReading: data.currentReading,
        unitsConsumed,
        notes: data.notes,
        photoUrl,
      },
    });

    // Update meter readings
    await prisma.meter.update({
      where: { id: data.meterId },
      data: { previousReading, currentReading: data.currentReading },
    });

    return reading;
  }

  async getReadingHistory(meterId: string) {
    return prisma.meterReading.findMany({
      where: { meterId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        billingMonth: true,
        previousReading: true,
        currentReading: true,
        unitsConsumed: true,
        photoUrl: true,
        notes: true,
        createdAt: true,
      },
    });
  }

  async getResidentMeter(residentId: string) {
    // Get resident's house
    const resident = await prisma.user.findUnique({
      where: { id: residentId },
      select: { houseId: true },
    });
    if (!resident || !resident.houseId) throw new AppError('Resident not found or has no house assigned', 404);

    const meter = await prisma.meter.findUnique({
      where: { houseId: resident.houseId },
      select: {
        id: true,
        meterNumber: true,
        meterSerial: true,
        status: true,
        currentReading: true,
        previousReading: true,
        createdAt: true,
      },
    });
    if (!meter) throw new AppError('Meter not found for this resident', 404);

    const readings = await prisma.meterReading.findMany({
      where: { meterId: meter.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    return { ...meter, readings };
  }

  async exportMetersCSV(): Promise<string> {
    const { meters } = await this.getAllMeters({ limit: 10000 });
    const headers = [
      'Meter Number', 'Serial', 'House Number', 'Resident Name', 'Account Number',
      'Phone', 'Status', 'Previous Reading', 'Current Reading', 'Installation Date', 'Created',
    ];
    const rows = (meters as any[]).map((m) => [
      m.meterNumber,
      m.meterSerial || '',
      m.houseNumber || '',
      m.resident?.fullName || '',
      m.resident?.accountNumber || '',
      m.resident?.phone || '',
      m.status,
      m.previousReading ?? 0,
      m.currentReading ?? 0,
      m.installationDate ? new Date(m.installationDate).toLocaleDateString('en-KE') : '',
      new Date(m.createdAt).toLocaleDateString('en-KE'),
    ]);
    return [headers, ...rows]
      .map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }
}

export const meterService = new MeterService();
