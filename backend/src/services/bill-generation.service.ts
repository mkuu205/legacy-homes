import { prisma } from '@/config/prisma';
import { logger } from '@/utils/logger';
import {
  calculateDueDate,
  calculateDaysUntilDue,
  calculateOverdueDays,
  isBillOverdue,
  formatBillingPeriod,
} from '@/utils/timezone';
import { DateTime } from 'luxon';

export class BillGenerationService {
  /**
   * Generate bills for a billing month
   */
  async generateBillsForMonth(billingMonth: string) {
    try {
      const [year, month] = billingMonth.split('-');
      const startDate = DateTime.fromISO(`${year}-${month}-01`).setZone('Africa/Nairobi');
      const endDate = startDate.endOf('month');

      logger.info(`Generating bills for ${billingMonth}`);

      // Get all active meters with readings for this month
      const readings = await prisma.meterReading.findMany({
        where: {
          billingMonth,
        },
        include: {
          meter: {
            include: {
              house: {
                include: {
                  resident: true,
                },
              },
            },
          },
        },
      });

      const bills = [];

      for (const reading of readings) {
        const { meter, unitsConsumed, previousReading, currentReading } = reading;
        const { house } = meter;
        const { resident } = house;

        if (!resident) {
          logger.warn(`No resident for house ${house.id}`);
          continue;
        }

        // Calculate bill amount
        const unitRate = 250; // Default rate
        const totalAmount = unitsConsumed * unitRate;

        // Calculate due date (3 days after month end)
        const dueDate = calculateDueDate(billingMonth, 3);

        // Generate bill number
        const billNumber = this.generateBillNumber(house.houseNumber, billingMonth);

        // Create bill
        const bill = await prisma.bill.create({
          data: {
            billNumber,
            residentId: resident.id,
            houseId: house.id,
            meterId: meter.id,
            readingId: reading.id,
            billingMonth,
            billingPeriodStart: startDate.toJSDate(),
            billingPeriodEnd: endDate.toJSDate(),
            generatedAt: new Date(),
            dueDate: dueDate.toJSDate(),
            previousReading,
            currentReading,
            unitsConsumed,
            unitRate,
            totalAmount,
            balance: totalAmount,
            status: 'UNPAID',
          },
        });

        bills.push(bill);

        logger.info(`Bill generated: ${billNumber}`);
      }

      return {
        billsGenerated: bills.length,
        billingMonth,
        bills,
      };
    } catch (error) {
      logger.error('Bill generation error:', error);
      throw error;
    }
  }

  /**
   * Generate bill number
   */
  private generateBillNumber(houseNumber: string, billingMonth: string): string {
    return `BILL-${houseNumber}-${billingMonth}`;
  }

  /**
   * Get bill with calculated fields
   */
  async getBillWithCalculatedFields(billId: string) {
    try {
      const bill = await prisma.bill.findUnique({
        where: { id: billId },
        include: {
          resident: true,
          house: true,
          meter: true,
          reading: true,
          payments: true,
        },
      });

      if (!bill) {
        throw new Error('Bill not found');
      }

      // Calculate additional fields
      const daysUntilDue = calculateDaysUntilDue(bill.dueDate);
      const overdueDays = calculateOverdueDays(bill.dueDate);
      const isOverdue = isBillOverdue(bill.dueDate);

      return {
        ...bill,
        daysUntilDue,
        overdueDays,
        isOverdue,
        billingPeriodFormatted: formatBillingPeriod(bill.billingPeriodStart, bill.billingPeriodEnd),
      };
    } catch (error) {
      logger.error('Error fetching bill:', error);
      throw error;
    }
  }

  /**
   * Get all bills for a resident with calculated fields
   */
  async getResidentBillsWithCalculatedFields(residentId: string) {
    try {
      const bills = await prisma.bill.findMany({
        where: { residentId },
        include: {
          resident: true,
          house: true,
          meter: true,
          payments: true,
        },
        orderBy: { billingMonth: 'desc' },
      });

      return bills.map(bill => ({
        ...bill,
        daysUntilDue: calculateDaysUntilDue(bill.dueDate),
        overdueDays: calculateOverdueDays(bill.dueDate),
        isOverdue: isBillOverdue(bill.dueDate),
        billingPeriodFormatted: formatBillingPeriod(bill.billingPeriodStart, bill.billingPeriodEnd),
      }));
    } catch (error) {
      logger.error('Error fetching resident bills:', error);
      throw error;
    }
  }

  /**
   * Update bill status based on payments
   */
  async updateBillStatus(billId: string) {
    try {
      const bill = await prisma.bill.findUnique({
        where: { id: billId },
        include: { payments: true },
      });

      if (!bill) {
        throw new Error('Bill not found');
      }

      // Calculate total paid
      const totalPaid = bill.payments
        .filter(p => p.status === 'SUCCESSFUL')
        .reduce((sum, p) => sum + p.amount, 0);

      // Determine status
      let status;
      if (totalPaid >= bill.totalAmount) {
        status = 'PAID';
      } else if (totalPaid > 0) {
        status = 'PARTIAL';
      } else if (isBillOverdue(bill.dueDate)) {
        status = 'OVERDUE';
      } else {
        status = 'UNPAID';
      }

      // Update bill
      const updatedBill = await prisma.bill.update({
        where: { id: billId },
        data: {
          status,
          amountPaid: totalPaid,
          balance: Math.max(0, bill.totalAmount - totalPaid),
          paidAt: totalPaid >= bill.totalAmount ? new Date() : null,
        },
      });

      logger.info(`Bill status updated: ${billId} -> ${status}`);
      return updatedBill;
    } catch (error) {
      logger.error('Bill status update error:', error);
      throw error;
    }
  }

  /**
   * Get current bill for a resident
   */
  async getCurrentBillForResident(residentId: string) {
    try {
      const today = DateTime.now().setZone('Africa/Nairobi');
      const currentMonth = today.toFormat('yyyy-MM');

      const bill = await prisma.bill.findFirst({
        where: {
          residentId,
          billingMonth: currentMonth,
        },
        include: {
          resident: true,
          house: true,
          meter: true,
          payments: true,
        },
      });

      if (!bill) {
        return null;
      }

      return {
        ...bill,
        daysUntilDue: calculateDaysUntilDue(bill.dueDate),
        overdueDays: calculateOverdueDays(bill.dueDate),
        isOverdue: isBillOverdue(bill.dueDate),
        billingPeriodFormatted: formatBillingPeriod(bill.billingPeriodStart, bill.billingPeriodEnd),
      };
    } catch (error) {
      logger.error('Error fetching current bill:', error);
      throw error;
    }
  }

  /**
   * Get outstanding bills for a resident
   */
  async getOutstandingBillsForResident(residentId: string) {
    try {
      const bills = await prisma.bill.findMany({
        where: {
          residentId,
          status: {
            in: ['UNPAID', 'PARTIAL', 'OVERDUE'],
          },
        },
        include: {
          resident: true,
          house: true,
          meter: true,
          payments: true,
        },
        orderBy: { dueDate: 'asc' },
      });

      return bills.map(bill => ({
        ...bill,
        daysUntilDue: calculateDaysUntilDue(bill.dueDate),
        overdueDays: calculateOverdueDays(bill.dueDate),
        isOverdue: isBillOverdue(bill.dueDate),
        billingPeriodFormatted: formatBillingPeriod(bill.billingPeriodStart, bill.billingPeriodEnd),
      }));
    } catch (error) {
      logger.error('Error fetching outstanding bills:', error);
      throw error;
    }
  }
}
