import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { sendBillNotificationEmail } from '../utils/email';
import { notificationService } from './notification.service';
import logger from '../utils/logger';
import PDFDocument from 'pdfkit';
import axios from 'axios';

/** Fallback hardcoded rate — only used when the DB has no UNIT_RATE setting yet. */
const DEFAULT_UNIT_RATE = 250; // KES per unit

/** Read the water tariff from system_settings; fall back to DEFAULT_UNIT_RATE. */
async function getUnitRate(): Promise<number> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'UNIT_RATE' } });
    if (setting) {
      const parsed = parseFloat(setting.value);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // ignore — fall through to default
  }
  return DEFAULT_UNIT_RATE;
}

const generateBillNumber = (): string => {
  const prefix = 'BILL';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${timestamp}-${random}`;
};

export class BillingService {
  async generateMonthlyBills(billingMonth: string, force = false) {
    // Duplicate prevention: check if bills already exist for this month
    const existingCount = await prisma.bill.count({ where: { billingMonth } });
    if (existingCount > 0 && !force) {
      throw new AppError(`DUPLICATE:Bills for ${billingMonth} already exist (${existingCount} bills). Use force=true to regenerate.`, 409);
    }

    // Force regenerate: delete existing unpaid/overdue bills for this month first
    if (existingCount > 0 && force) {
      const existingBills = await prisma.bill.findMany({
        where: { billingMonth, status: { in: ['UNPAID', 'OVERDUE'] } },
        select: { id: true, readingId: true },
      });
      const billIds = existingBills.map((b) => b.id);
      // Delete associated payments first
      await prisma.payment.deleteMany({ where: { billId: { in: billIds } } });
      // Unlink readings from bills so they can be re-processed
      await prisma.meterReading.updateMany({
        where: { id: { in: existingBills.map((b) => b.readingId).filter(Boolean) as string[] } },
        data: { billId: null },
      });
      await prisma.bill.deleteMany({ where: { id: { in: billIds } } });
      logger.info(`Force regenerate: deleted ${billIds.length} existing unpaid bills for ${billingMonth}`);
    }

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

      const UNIT_RATE = await getUnitRate();
      const totalAmount = reading.unitsConsumed * UNIT_RATE;
      const billNumber = generateBillNumber();

      const bill = await prisma.bill.create({
        data: {
          billNumber,
          resident: { connect: { id: house.resident.id } },
          meter: { connect: { id: reading.meterId } },
          house: { connect: { id: meter.houseId } },
          reading: { connect: { id: reading.id } },
          billingMonth,
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(),
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
        await Promise.all([
          sendBillNotificationEmail(
            house.resident.email,
            house.resident.fullName,
            bill.billNumber,
            bill.totalAmount,
            billingMonth,
            dueDate.toLocaleDateString('en-KE')
          ),
          notificationService.sendBillGeneratedNotification(
            house.resident.id,
            bill.billNumber,
            bill.totalAmount
          )
        ]);
      } catch (err) {
        logger.error(`Failed to send bill notifications for ${bill.billNumber}:`, err);
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

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve({ pdfBuffer: Buffer.concat(chunks), filename: `invoice-${bill.billNumber}.pdf` }));
        doc.on('error', reject);

        const pageW = doc.page.width;
        const marginL = 50;
        const marginR = 50;
        const contentW = pageW - marginL - marginR;

        // ── Header band ──────────────────────────────────────────────────────
        doc.rect(marginL, 40, contentW, 70).fill('#0a3d62');
        doc.fill('#ffffff').fontSize(22).font('Helvetica-Bold')
          .text('LEGACY HOMES', marginL + 16, 52, { width: contentW - 32 });
        doc.fill('#a8d8ea').fontSize(10).font('Helvetica')
          .text('Water Billing System  •  Nairobi, Kenya  •  support@legacyhomes.co.ke', marginL + 16, 78, { width: contentW - 32 });

        // ── INVOICE label + status badge ─────────────────────────────────────
        doc.fill('#0a3d62').fontSize(18).font('Helvetica-Bold').text('INVOICE', marginL, 128);
        const statusBgColor = bill.status === 'PAID' ? '#22c55e' : bill.status === 'OVERDUE' ? '#ef4444' : '#f59e0b';
        const badgeX = pageW - marginR - 90;
        doc.rect(badgeX, 124, 90, 24).fill(statusBgColor);
        doc.fill('#ffffff').fontSize(10).font('Helvetica-Bold')
          .text(bill.status, badgeX, 130, { width: 90, align: 'center' });

        doc.moveTo(marginL, 158).lineTo(pageW - marginR, 158).lineWidth(1).stroke('#cccccc');

        // ── Two-column meta block ─────────────────────────────────────────────
        const colA = marginL;
        const colB = marginL + contentW / 2 + 10;
        let y = 168;

        const labelVal = (label: string, value: string, x: number, cy: number) => {
          doc.fill('#888888').fontSize(8).font('Helvetica').text(label.toUpperCase(), x, cy);
          doc.fill('#1a1a1a').fontSize(10).font('Helvetica-Bold').text(value, x, cy + 12);
        };

        labelVal('Invoice Number', bill.billNumber, colA, y);
        labelVal('Billing Period', bill.billingMonth, colB, y);
        y += 38;
        labelVal('Date Issued', new Date(bill.createdAt).toLocaleDateString('en-KE'), colA, y);
        labelVal('Due Date', new Date(bill.dueDate).toLocaleDateString('en-KE'), colB, y);

        doc.moveTo(marginL, y + 36).lineTo(pageW - marginR, y + 36).lineWidth(0.5).stroke('#dddddd');
        y += 48;

        // ── Customer Information ──────────────────────────────────────────────
        doc.fill('#0a3d62').fontSize(11).font('Helvetica-Bold').text('BILL TO', colA, y);
        y += 18;
        doc.fill('#1a1a1a').fontSize(10).font('Helvetica-Bold').text(bill.resident?.fullName || 'N/A', colA, y);
        y += 14;
        doc.fill('#444444').fontSize(9).font('Helvetica');
        doc.text(`Account: ${bill.resident?.accountNumber || 'N/A'}`, colA, y); y += 13;
        doc.text(`House: ${bill.houseNumber || 'N/A'}  |  Meter: ${(bill as any).meter?.meterNumber || 'N/A'}`, colA, y); y += 13;
        doc.text(`Phone: ${bill.resident?.phone || 'N/A'}`, colA, y); y += 13;
        doc.text(`Email: ${bill.resident?.email || 'N/A'}`, colA, y);

        y += 28;
        doc.moveTo(marginL, y).lineTo(pageW - marginR, y).lineWidth(0.5).stroke('#dddddd');
        y += 14;

        // ── Billing Details Table ─────────────────────────────────────────────
        doc.fill('#0a3d62').fontSize(11).font('Helvetica-Bold').text('BILLING DETAILS', colA, y);
        y += 18;

        // Table header row
        const tCols = [colA, colA + 200, colA + 320, colA + 420];
        doc.rect(marginL, y, contentW, 22).fill('#0a3d62');
        doc.fill('#ffffff').fontSize(9).font('Helvetica-Bold');
        doc.text('Description', tCols[0] + 4, y + 6);
        doc.text('Reading (m³)', tCols[1], y + 6);
        doc.text('Rate (KES)', tCols[2], y + 6);
        doc.text('Amount (KES)', tCols[3], y + 6);
        y += 22;

        // Table rows
        const tableRow = (desc: string, reading: string, rate: string, amount: string, shade: boolean, cy: number) => {
          if (shade) doc.rect(marginL, cy, contentW, 20).fill('#f0f4f8');
          doc.fill('#1a1a1a').fontSize(9).font('Helvetica');
          doc.text(desc, tCols[0] + 4, cy + 5);
          doc.text(reading, tCols[1], cy + 5);
          doc.text(rate, tCols[2], cy + 5);
          doc.text(amount, tCols[3], cy + 5);
          return cy + 20;
        };

        y = tableRow('Previous Reading', `${bill.previousReading}`, '—', '—', false, y);
        y = tableRow('Current Reading', `${bill.currentReading}`, '—', '—', true, y);
        y = tableRow('Units Consumed', `${bill.unitsConsumed}`, `${bill.unitRate.toFixed(2)}`, `${(bill.unitsConsumed * bill.unitRate).toFixed(2)}`, false, y);

        // Bottom border of table
        doc.moveTo(marginL, y).lineTo(pageW - marginR, y).lineWidth(1).stroke('#0a3d62');
        y += 16;

        // ── Summary box ───────────────────────────────────────────────────────
        const sumX = colA + contentW / 2;
        const sumW = contentW / 2;
        doc.rect(sumX, y, sumW, 80).fill('#f8fafc').stroke('#dddddd');
        doc.fill('#444444').fontSize(9).font('Helvetica');
        doc.text('Water Charges:', sumX + 10, y + 10);
        doc.text(`KES ${bill.totalAmount.toFixed(2)}`, sumX + sumW - 10, y + 10, { align: 'right', width: sumW - 20 });
        doc.text('Service Charges:', sumX + 10, y + 26);
        doc.text('KES 0.00', sumX + sumW - 10, y + 26, { align: 'right', width: sumW - 20 });
        doc.moveTo(sumX + 10, y + 44).lineTo(sumX + sumW - 10, y + 44).lineWidth(0.5).stroke('#aaaaaa');
        doc.fill('#0a3d62').fontSize(11).font('Helvetica-Bold');
        doc.text('Total Due:', sumX + 10, y + 50);
        doc.text(`KES ${bill.totalAmount.toFixed(2)}`, sumX + sumW - 10, y + 50, { align: 'right', width: sumW - 20 });
        doc.fill('#444444').fontSize(9).font('Helvetica');
        doc.text(`Amount Paid: KES ${bill.amountPaid.toFixed(2)}`, sumX + 10, y + 66);
        doc.text(`Balance: KES ${bill.balance.toFixed(2)}`, sumX + sumW - 10, y + 66, { align: 'right', width: sumW - 20 });
        y += 96;

        // ── Payment Instructions ──────────────────────────────────────────────
        doc.rect(marginL, y, contentW, 54).fill('#fffbeb').stroke('#fde68a');
        doc.fill('#92400e').fontSize(10).font('Helvetica-Bold').text('PAYMENT INSTRUCTIONS', marginL + 10, y + 8);
        doc.fill('#78350f').fontSize(8.5).font('Helvetica');
        doc.text('Pay via M-Pesa Paybill or bank transfer using your Account Number as the reference.', marginL + 10, y + 22, { width: contentW - 20 });
        doc.text('For inquiries: support@legacyhomes.co.ke  |  Tel: +254 700 000 000', marginL + 10, y + 36, { width: contentW - 20 });
        y += 66;

        // ── Footer ────────────────────────────────────────────────────────────
        doc.rect(marginL, y, contentW, 30).fill('#0a3d62');
        doc.fill('#a8d8ea').fontSize(7.5).font('Helvetica')
          .text(
            `This is an electronically generated invoice and is valid without a signature.  Generated on ${new Date().toLocaleString('en-KE')}`,
            marginL + 10, y + 10, { width: contentW - 20, align: 'center' }
          );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateReceiptPDF(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        bill: {
          include: {
            resident: true,
            meter: true,
          },
        },
      },
    });
    if (!payment) throw new AppError('Payment not found', 404);

    // Fetch house number for the resident
    const house = payment.bill.resident?.houseId
      ? await prisma.house.findUnique({ where: { id: payment.bill.resident.houseId }, select: { houseNumber: true } })
      : null;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve({ pdfBuffer: Buffer.concat(chunks), filename: `receipt-${payment.id}.pdf` }));
        doc.on('error', reject);

        const pageW = doc.page.width;
        const marginL = 50;
        const marginR = 50;
        const contentW = pageW - marginL - marginR;

        // ── Header band ──────────────────────────────────────────────────────
        doc.rect(marginL, 40, contentW, 70).fill('#0a3d62');
        doc.fill('#ffffff').fontSize(22).font('Helvetica-Bold')
          .text('LEGACY HOMES', marginL + 16, 52, { width: contentW - 32 });
        doc.fill('#a8d8ea').fontSize(10).font('Helvetica')
          .text('Water Billing System  •  Nairobi, Kenya  •  support@legacyhomes.co.ke', marginL + 16, 78, { width: contentW - 32 });

        // ── PAYMENT RECEIPT label + PAID badge ───────────────────────────────
        doc.fill('#0a3d62').fontSize(18).font('Helvetica-Bold').text('PAYMENT RECEIPT', marginL, 128);
        const badgeX = pageW - marginR - 90;
        doc.rect(badgeX, 124, 90, 24).fill('#22c55e');
        doc.fill('#ffffff').fontSize(10).font('Helvetica-Bold')
          .text('PAID', badgeX, 130, { width: 90, align: 'center' });

        doc.moveTo(marginL, 158).lineTo(pageW - marginR, 158).lineWidth(1).stroke('#cccccc');

        // ── Two-column meta block ─────────────────────────────────────────────
        const colA = marginL;
        const colB = marginL + contentW / 2 + 10;
        let y = 168;

        const labelVal = (label: string, value: string, x: number, cy: number) => {
          doc.fill('#888888').fontSize(8).font('Helvetica').text(label.toUpperCase(), x, cy);
          doc.fill('#1a1a1a').fontSize(10).font('Helvetica-Bold').text(value, x, cy + 12);
        };

        labelVal('Receipt Number', payment.id, colA, y);
        labelVal('Invoice Number', payment.bill.billNumber, colB, y);
        y += 38;
        labelVal('Payment Date', new Date(payment.createdAt).toLocaleDateString('en-KE'), colA, y);
        labelVal('Payment Time', new Date(payment.createdAt).toLocaleTimeString('en-KE'), colB, y);

        doc.moveTo(marginL, y + 36).lineTo(pageW - marginR, y + 36).lineWidth(0.5).stroke('#dddddd');
        y += 48;

        // ── Customer Information ──────────────────────────────────────────────
        doc.fill('#0a3d62').fontSize(11).font('Helvetica-Bold').text('CUSTOMER', colA, y);
        y += 18;
        doc.fill('#1a1a1a').fontSize(10).font('Helvetica-Bold').text(payment.bill.resident?.fullName || 'N/A', colA, y);
        y += 14;
        doc.fill('#444444').fontSize(9).font('Helvetica');
        doc.text(`Account: ${payment.bill.resident?.accountNumber || 'N/A'}`, colA, y); y += 13;
        doc.text(`House: ${house?.houseNumber || 'N/A'}  |  Phone: ${payment.bill.resident?.phone || 'N/A'}`, colA, y);

        y += 28;
        doc.moveTo(marginL, y).lineTo(pageW - marginR, y).lineWidth(0.5).stroke('#dddddd');
        y += 14;

        // ── Payment Details Table ─────────────────────────────────────────────
        doc.fill('#0a3d62').fontSize(11).font('Helvetica-Bold').text('PAYMENT DETAILS', colA, y);
        y += 18;

        const tCols = [colA, colA + 320];
        doc.rect(marginL, y, contentW, 22).fill('#0a3d62');
        doc.fill('#ffffff').fontSize(9).font('Helvetica-Bold');
        doc.text('Description', tCols[0] + 4, y + 6);
        doc.text('Value', tCols[1], y + 6);
        y += 22;

        const detailRow = (label: string, value: string, shade: boolean, cy: number) => {
          if (shade) doc.rect(marginL, cy, contentW, 20).fill('#f0f4f8');
          doc.fill('#444444').fontSize(9).font('Helvetica').text(label, tCols[0] + 4, cy + 5);
          doc.fill('#1a1a1a').fontSize(9).font('Helvetica-Bold').text(value, tCols[1], cy + 5);
          return cy + 20;
        };

        y = detailRow('Amount Paid', `KES ${payment.amount.toFixed(2)}`, false, y);
        y = detailRow('Payment Method', payment.confirmationCode ? 'M-Pesa' : 'Bank Transfer', true, y);
        if (payment.confirmationCode) {
          y = detailRow('M-Pesa Transaction Code', payment.confirmationCode, false, y);
        }
        y = detailRow('Payment Status', payment.status, payment.confirmationCode ? true : false, y);
        doc.moveTo(marginL, y).lineTo(pageW - marginR, y).lineWidth(1).stroke('#0a3d62');
        y += 16;

        // ── Bill Summary box ──────────────────────────────────────────────────
        const sumX = colA + contentW / 2;
        const sumW = contentW / 2;
        doc.rect(sumX, y, sumW, 80).fill('#f0fdf4').stroke('#86efac');
        doc.fill('#444444').fontSize(9).font('Helvetica');
        doc.text('Total Bill Amount:', sumX + 10, y + 10);
        doc.text(`KES ${payment.bill.totalAmount.toFixed(2)}`, sumX + sumW - 10, y + 10, { align: 'right', width: sumW - 20 });
        doc.text('Amount Paid:', sumX + 10, y + 26);
        doc.text(`KES ${payment.amount.toFixed(2)}`, sumX + sumW - 10, y + 26, { align: 'right', width: sumW - 20 });
        doc.moveTo(sumX + 10, y + 44).lineTo(sumX + sumW - 10, y + 44).lineWidth(0.5).stroke('#aaaaaa');
        doc.fill('#15803d').fontSize(11).font('Helvetica-Bold');
        doc.text('Remaining Balance:', sumX + 10, y + 50);
        doc.text(`KES ${payment.bill.balance.toFixed(2)}`, sumX + sumW - 10, y + 50, { align: 'right', width: sumW - 20 });
        doc.fill('#16a34a').fontSize(9).font('Helvetica-Bold')
          .text('Thank you for your payment!', sumX + 10, y + 66, { width: sumW - 20, align: 'center' });
        y += 96;

        // ── Footer ────────────────────────────────────────────────────────────
        doc.rect(marginL, y, contentW, 30).fill('#0a3d62');
        doc.fill('#a8d8ea').fontSize(7.5).font('Helvetica')
          .text(
            `This is an electronically generated receipt and is valid without a signature.  Generated on ${new Date().toLocaleString('en-KE')}`,
            marginL + 10, y + 10, { width: contentW - 20, align: 'center' }
          );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ─── Delete single bill ───────────────────────────────────────────────────
  async deleteBill(id: string) {
    const bill = await prisma.bill.findUnique({ where: { id } });
    if (!bill) throw new AppError('Bill not found', 404);
    await prisma.payment.deleteMany({ where: { billId: id } });
    await prisma.bill.delete({ where: { id } });
    return { message: 'Bill deleted successfully' };
  }

  // ─── Delete multiple bills ────────────────────────────────────────────────
  async deleteBills(ids: string[]) {
    await prisma.payment.deleteMany({ where: { billId: { in: ids } } });
    const result = await prisma.bill.deleteMany({ where: { id: { in: ids } } });
    return { deleted: result.count };
  }

  // ─── Delete bills by month ────────────────────────────────────────────────
  async deleteBillsByMonth(billingMonth: string) {
    const bills = await prisma.bill.findMany({ where: { billingMonth }, select: { id: true } });
    const ids = bills.map((b) => b.id);
    await prisma.payment.deleteMany({ where: { billId: { in: ids } } });
    const result = await prisma.bill.deleteMany({ where: { billingMonth } });
    return { deleted: result.count };
  }

  // ─── Delete all unpaid bills ──────────────────────────────────────────────
  async deleteAllUnpaidBills() {
    const bills = await prisma.bill.findMany({
      where: { status: { in: ['UNPAID', 'OVERDUE'] } },
      select: { id: true },
    });
    const ids = bills.map((b) => b.id);
    await prisma.payment.deleteMany({ where: { billId: { in: ids } } });
    const result = await prisma.bill.deleteMany({ where: { status: { in: ['UNPAID', 'OVERDUE'] } } });
    return { deleted: result.count };
  }

  // ─── Export bills as CSV ──────────────────────────────────────────────────
  async exportBillsCSV(query: any): Promise<string> {
    const { bills } = await this.getAllBills({ ...query, limit: 10000 });
    const headers = ['Bill Number', 'Resident', 'Account', 'House', 'Billing Month', 'Units', 'Unit Rate', 'Total', 'Paid', 'Balance', 'Status', 'Due Date', 'Created'];
    const rows = bills.map((b: any) => [
      b.billNumber, b.resident?.fullName || '', b.resident?.accountNumber || '',
      b.houseNumber || '', b.billingMonth, b.unitsConsumed || '', b.unitRate || '',
      b.totalAmount, b.amountPaid, b.balance, b.status,
      new Date(b.dueDate).toLocaleDateString('en-KE'),
      new Date(b.createdAt).toLocaleDateString('en-KE'),
    ]);
    return [headers, ...rows].map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  }
}
export const billingService = new BillingService();
