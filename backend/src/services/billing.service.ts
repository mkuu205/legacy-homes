import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { sendBillNotificationEmail } from '../utils/email';
import logger from '../utils/logger';

const UNIT_RATE = 250; // KES per unit

const generateBillNumber = (): string => {
  const prefix = 'BILL';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${timestamp}-${random}`;
};

export class BillingService {
  async generateMonthlyBills(billingMonth: string) {
    const readings = await prisma.meterReading.findMany({
      where: { billingMonth, billId: null },
      select: {
        id: true,
        meterId: true,
        billingMonth: true,
        previousReading: true,
        currentReading: true,
        unitsConsumed: true,
      },
    });

    if (readings.length === 0) {
      throw new AppError(`No unprocessed readings found for ${billingMonth}`, 400);
    }

    const bills = [];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    for (const reading of readings) {
      const meter = await prisma.meter.findUnique({
        where: { id: reading.meterId },
        select: { houseId: true },
      });

      if (!meter) continue;

      const house = await prisma.house.findUnique({
        where: { id: meter.houseId },
        select: {
          resident: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      });

      if (!house || !house.resident) continue;

      const totalAmount = reading.unitsConsumed * UNIT_RATE;
      const billNumber = generateBillNumber();

      const bill = await prisma.bill.create({
        data: {
          billNumber,
          residentId: house.resident.id,
          meterId: reading.meterId,
          houseId: meter.houseId,
          readingId: reading.id,
          billingMonth,
          previousReading: reading.previousReading,
          currentReading: reading.currentReading,
          unitsConsumed: reading.unitsConsumed,
          unitRate: UNIT_RATE,
          totalAmount,
          amountPaid: 0,
          balance: totalAmount,
          dueDate,
          status: 'UNPAID',
        },
      });

      bills.push(bill);

      try {
        await sendBillNotificationEmail(
          house.resident.email,
          house.resident.fullName,
          bill.billNumber,
          bill.totalAmount,
          billingMonth,
          dueDate.toLocaleDateString('en-KE')
        );
      } catch (err) {
        logger.error(`Failed to send bill email for ${bill.billNumber}:`, err);
      }
    }

    return {
      generated: bills.length,
      bills,
    };
  }

  async getAllBills(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    billingMonth?: string;
    residentId?: string;
  }) {
    const pageNum = Number.parseInt(String(query?.page || 1), 10);
    const limitNum = Number.parseInt(String(query?.limit || 20), 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (query.status) {
      const statuses = String(query.status)
        .split(',')
        .map((status) => status.trim())
        .filter(Boolean);

      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = {
          in: statuses,
        };
      }
    }

    if (query.billingMonth) where.billingMonth = query.billingMonth;
    if (query.residentId) where.residentId = query.residentId;

    if (query.search) {
      where.OR = [
        {
          billNumber: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          resident: {
            fullName: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        },
        {
          resident: {
            accountNumber: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          billNumber: true,
          billingMonth: true,
          totalAmount: true,
          amountPaid: true,
          balance: true,
          status: true,
          dueDate: true,
          createdAt: true,
          residentId: true,
          meterId: true,
          houseId: true,
        },
      }),
      prisma.bill.count({ where }),
    ]);

    const billsWithDetails = await Promise.all(
      bills.map(async (bill) => {
        const [resident, meter, house] = await Promise.all([
          prisma.user.findUnique({
            where: { id: bill.residentId },
            select: {
              fullName: true,
              email: true,
              accountNumber: true,
            },
          }),
          prisma.meter.findUnique({
            where: { id: bill.meterId },
            select: {
              meterNumber: true,
            },
          }),
          prisma.house.findUnique({
            where: { id: bill.houseId },
            select: {
              houseNumber: true,
            },
          }),
        ]);

        return {
          ...bill,
          resident,
          meter,
          houseNumber: house?.houseNumber,
        };
      })
    );

    return {
      bills: billsWithDetails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async getBillById(id: string) {
    const bill = await prisma.bill.findUnique({
      where: { id },
      select: {
        id: true,
        billNumber: true,
        billingMonth: true,
        totalAmount: true,
        amountPaid: true,
        balance: true,
        status: true,
        dueDate: true,
        previousReading: true,
        currentReading: true,
        unitsConsumed: true,
        unitRate: true,
        createdAt: true,
        residentId: true,
        meterId: true,
        houseId: true,
      },
    });

    if (!bill) {
      throw new AppError('Bill not found', 404);
    }

    const [resident, meter, house, payments] = await Promise.all([
      prisma.user.findUnique({
        where: { id: bill.residentId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          accountNumber: true,
        },
      }),
      prisma.meter.findUnique({
        where: { id: bill.meterId },
        select: {
          meterNumber: true,
          meterSerial: true,
        },
      }),
      prisma.house.findUnique({
        where: { id: bill.houseId },
        select: {
          houseNumber: true,
        },
      }),
      prisma.payment.findMany({
        where: { billId: id },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      ...bill,
      resident,
      meter,
      houseNumber: house?.houseNumber,
      payments,
    };
  }

  async getResidentBills(
    residentId: string,
    query: {
      page?: number;
      limit?: number;
      status?: string;
    }
  ) {
    const pageNum = Number.parseInt(String(query?.page || 1), 10);
    const limitNum = Number.parseInt(String(query?.limit || 12), 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      residentId,
    };

    if (query.status) {
      const statuses = String(query.status)
        .split(',')
        .map((status) => status.trim())
        .filter(Boolean);

      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = {
          in: statuses,
        };
      }
    }

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          billNumber: true,
          billingMonth: true,
          totalAmount: true,
          amountPaid: true,
          balance: true,
          status: true,
          dueDate: true,
          meterId: true,
        },
      }),
      prisma.bill.count({
        where,
      }),
    ]);

    const billsWithMeter = await Promise.all(
      bills.map(async (bill) => {
        const meter = await prisma.meter.findUnique({
          where: {
            id: bill.meterId,
          },
          select: {
            meterNumber: true,
          },
        });

        return {
          ...bill,
          meter,
        };
      })
    );

    return {
      bills: billsWithMeter,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async markOverdueBills() {
    const now = new Date();

    const result = await prisma.bill.updateMany({
      where: {
        status: 'UNPAID',
        dueDate: {
          lt: now,
        },
      },
      data: {
        status: 'OVERDUE',
      },
    });

    logger.info(`Marked ${result.count} bills as overdue`);

    return result;
  }

  async getResidentStatement(residentId: string) {
    const [resident, bills, payments] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: residentId,
        },
        select: {
          fullName: true,
          email: true,
          accountNumber: true,
          phone: true,
          houseId: true,
        },
      }),
      prisma.bill.findMany({
        where: {
          residentId,
        },
        orderBy: {
          billingMonth: 'desc',
        },
        select: {
          id: true,
          billNumber: true,
          billingMonth: true,
          totalAmount: true,
          meterId: true,
        },
      }),
      prisma.payment.findMany({
        where: {
          residentId,
          status: 'SUCCESSFUL',
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    if (!resident) {
      throw new AppError('Resident not found', 404);
    }

    const [house, metersInfo] = await Promise.all([
      resident.houseId
        ? prisma.house.findUnique({
            where: {
              id: resident.houseId,
            },
          })
        : null,
      Promise.all(
        bills.map((bill) =>
          prisma.meter.findUnique({
            where: {
              id: bill.meterId,
            },
            select: {
              meterNumber: true,
            },
          })
        )
      ),
    ]);

    const billsWithMeter = bills.map((bill, idx) => ({
      ...bill,
      meterNumber: metersInfo[idx]?.meterNumber,
    }));

    const totalBilled = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const outstanding = totalBilled - totalPaid;

    return {
      resident: {
        ...resident,
        houseNumber: house?.houseNumber,
      },
      bills: billsWithMeter,
      payments,
      summary: {
        totalBilled,
        totalPaid,
        outstanding,
      },
    };
  }

  async getBillingStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalBills, paidBills, unpaidBills, overdueBills, monthlyRevenue] =
      await Promise.all([
        prisma.bill.count(),
        prisma.bill.count({
          where: {
            status: 'PAID',
          },
        }),
        prisma.bill.count({
          where: {
            status: 'UNPAID',
          },
        }),
        prisma.bill.count({
          where: {
            status: 'OVERDUE',
          },
        }),
        prisma.payment.aggregate({
          where: {
            status: 'SUCCESSFUL',
            createdAt: {
              gte: startOfMonth,
            },
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

    return {
      totalBills,
      paidBills,
      unpaidBills,
      overdueBills,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      collectionRate:
        totalBills > 0
          ? ((paidBills / totalBills) * 100).toFixed(2)
          : 0,
    };
  }

  async generateInvoicePDF(billId: string) {
    const bill = await this.getBillById(billId);
    if (!bill) throw new AppError('Bill not found', 404);

    // In a real implementation, you would use a library like pdfkit or puppeteer
    // For now, we'll return a placeholder text as a Buffer to simulate a PDF
    const content = `
      LEGACY HOMES WATER BILL
      -----------------------
      Bill Number: ${bill.billNumber}
      Resident: ${bill.resident?.fullName}
      Account: ${bill.resident?.accountNumber}
      House: ${bill.houseNumber}
      Month: ${bill.billingMonth}
      Units: ${bill.unitsConsumed}
      Rate: KES ${bill.unitRate}
      Total: KES ${bill.totalAmount}
      Balance: KES ${bill.balance}
      Due Date: ${new Date(bill.dueDate).toLocaleDateString()}
      Status: ${bill.status}
    `;

    return {
      pdfBuffer: Buffer.from(content),
      filename: `invoice-${bill.billNumber}.pdf`,
    };
  }
}

export const billingService = new BillingService();
