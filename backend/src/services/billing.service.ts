import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { sendBillNotificationEmail } from '../utils/email';
import logger from '../utils/logger';
import PDFDocument from 'pdfkit';
import axios from 'axios';

const UNIT_RATE = 250; // KES per unit

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

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve({
            pdfBuffer,
            filename: `invoice-${bill.billNumber}.pdf`,
          });
        });
        doc.on('error', reject);

        // Company Header
        doc.fontSize(20).font('Helvetica-Bold').text('LEGACY HOMES', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Water Billing System', { align: 'center' });
        doc.fontSize(9).text('Nairobi, Kenya', { align: 'center' });
        doc.moveDown(0.5);

        // Invoice Title
        doc.fontSize(16).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
        doc.moveDown(0.5);

        // Invoice Details
        doc.fontSize(10).font('Helvetica');
        doc.text(`Invoice Number: ${bill.billNumber}`, 50);
        doc.text(`Billing Period: ${bill.billingMonth}`);
        doc.text(`Date Issued: ${new Date(bill.createdAt).toLocaleDateString('en-KE')}`);
        doc.text(`Due Date: ${new Date(bill.dueDate).toLocaleDateString('en-KE')}`);
        doc.moveDown(0.5);

        // Customer Information
        doc.fontSize(10).font('Helvetica-Bold').text('CUSTOMER INFORMATION');
        doc.fontSize(9).font('Helvetica');
        doc.text(`Name: ${bill.resident?.fullName || 'N/A'}`);
        doc.text(`Account Number: ${bill.resident?.accountNumber || 'N/A'}`);
        doc.text(`House Number: ${bill.houseNumber || 'N/A'}`);
        doc.text(`Meter Number: ${bill.meter?.meterNumber || 'N/A'}`);
        doc.text(`Phone: ${bill.resident?.phone || 'N/A'}`);
        doc.text(`Email: ${bill.resident?.email || 'N/A'}`);
        doc.moveDown(0.5);

        // Billing Details Table
        doc.fontSize(10).font('Helvetica-Bold').text('BILLING DETAILS');
        doc.moveDown(0.3);

        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 200;
        const col3 = 350;
        const col4 = 480;
        const rowHeight = 25;

        // Table Header
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Description', col1, tableTop);
        doc.text('Quantity', col2, tableTop);
        doc.text('Unit Price', col3, tableTop);
        doc.text('Amount', col4, tableTop);

        // Table Row 1: Previous Reading
        doc.fontSize(9).font('Helvetica');
        doc.text('Previous Reading', col1, tableTop + rowHeight);
        doc.text(`${bill.previousReading} m³`, col2, tableTop + rowHeight);

        // Table Row 2: Current Reading
        doc.text('Current Reading', col1, tableTop + rowHeight * 2);
        doc.text(`${bill.currentReading} m³`, col2, tableTop + rowHeight * 2);

        // Table Row 3: Units Consumed
        doc.text('Units Consumed', col1, tableTop + rowHeight * 3);
        doc.text(`${bill.unitsConsumed} m³`, col2, tableTop + rowHeight * 3);
        doc.text(`KES ${bill.unitRate}`, col3, tableTop + rowHeight * 3);
        doc.text(`KES ${(bill.unitsConsumed * bill.unitRate).toFixed(2)}`, col4, tableTop + rowHeight * 3);

        doc.moveDown(3);

        // Summary Section
        const summaryTop = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('SUMMARY', 50, summaryTop);

        doc.fontSize(9).font('Helvetica');
        doc.text(`Subtotal: KES ${bill.totalAmount.toFixed(2)}`, 300);
        doc.text(`Service Charges: KES 0.00`, 300);
        doc.moveDown(0.2);
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(`Total Amount Due: KES ${bill.totalAmount.toFixed(2)}`, 300);
        doc.fontSize(9).font('Helvetica');
        doc.text(`Amount Paid: KES ${bill.amountPaid.toFixed(2)}`, 300);
        doc.text(`Balance: KES ${bill.balance.toFixed(2)}`, 300);
        doc.moveDown(0.5);

        // Status
        doc.fontSize(10).font('Helvetica-Bold');
        const statusColor = bill.status === 'PAID' ? '#22c55e' : bill.status === 'OVERDUE' ? '#ef4444' : '#f59e0b';
        doc.text(`Status: ${bill.status}`, 300);

        doc.moveDown(1);

        // Payment Instructions
        doc.fontSize(9).font('Helvetica-Bold').text('PAYMENT INSTRUCTIONS');
        doc.fontSize(8).font('Helvetica');
        doc.text('Please make payment via M-Pesa or bank transfer using your account number.');
        doc.text('For inquiries, contact support@legacyhomes.co.ke');

        doc.moveDown(1);

        // Footer
        doc.fontSize(8).font('Helvetica');
        doc.text('This is an electronically generated invoice and is valid without a signature.', { align: 'center' });
        doc.text(`Generated on ${new Date().toLocaleString('en-KE')}`, { align: 'center' });

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

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve({
            pdfBuffer,
            filename: `receipt-${payment.paymentId}.pdf`,
          });
        });
        doc.on('error', reject);

        // Company Header
        doc.fontSize(20).font('Helvetica-Bold').text('LEGACY HOMES', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Water Billing System', { align: 'center' });
        doc.fontSize(9).text('Nairobi, Kenya', { align: 'center' });
        doc.moveDown(0.5);

        // Receipt Title
        doc.fontSize(16).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
        doc.moveDown(0.5);

        // Receipt Details
        doc.fontSize(10).font('Helvetica');
        doc.text(`Receipt Number: ${payment.paymentId}`, 50);
        doc.text(`Invoice Number: ${payment.bill.billNumber}`);
        doc.text(`Payment Date: ${new Date(payment.createdAt).toLocaleDateString('en-KE')}`);
        doc.text(`Payment Time: ${new Date(payment.createdAt).toLocaleTimeString('en-KE')}`);
        doc.moveDown(0.5);

        // Customer Information
        doc.fontSize(10).font('Helvetica-Bold').text('CUSTOMER INFORMATION');
        doc.fontSize(9).font('Helvetica');
        doc.text(`Name: ${payment.bill.resident?.fullName || 'N/A'}`);
        doc.text(`Account Number: ${payment.bill.resident?.accountNumber || 'N/A'}`);
        doc.text(`House Number: ${payment.bill.resident?.houseId || 'N/A'}`);
        doc.text(`Phone: ${payment.bill.resident?.phone || 'N/A'}`);
        doc.moveDown(0.5);

        // Payment Details
        doc.fontSize(10).font('Helvetica-Bold').text('PAYMENT DETAILS');
        doc.fontSize(9).font('Helvetica');
        doc.text(`Amount Paid: KES ${payment.amount.toFixed(2)}`);
        doc.text(`Payment Method: ${payment.mpesaReceiptCode ? 'M-Pesa' : 'Bank Transfer'}`);
        if (payment.mpesaReceiptCode) {
          doc.text(`M-Pesa Transaction Code: ${payment.mpesaReceiptCode}`);
        }
        doc.text(`Payment Status: ${payment.status}`);
        doc.moveDown(0.5);

        // Bill Summary
        doc.fontSize(10).font('Helvetica-Bold').text('BILL SUMMARY');
        doc.fontSize(9).font('Helvetica');
        doc.text(`Total Bill Amount: KES ${payment.bill.totalAmount.toFixed(2)}`);
        doc.text(`Amount Paid: KES ${payment.amount.toFixed(2)}`);
        doc.text(`Remaining Balance: KES ${payment.bill.balance.toFixed(2)}`);
        doc.moveDown(1);

        // Footer
        doc.fontSize(8).font('Helvetica');
        doc.text('Thank you for your payment!', { align: 'center' });
        doc.text('This is an electronically generated receipt and is valid without a signature.', { align: 'center' });
        doc.text(`Generated on ${new Date().toLocaleString('en-KE')}`, { align: 'center' });

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
