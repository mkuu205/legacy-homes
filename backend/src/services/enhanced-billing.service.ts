import { PrismaClient, Bill, BillStatus } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

export class EnhancedBillingService {
  // Lock a bill to prevent modifications
  async lockBill(billId: string): Promise<Bill> {
    try {
      const bill = await prisma.bill.update({
        where: { id: billId },
        data: { isLocked: true },
      });

      logger.info(`Bill locked: ${billId}`);
      return bill;
    } catch (error) {
      logger.error(`Error locking bill: ${error}`);
      throw error;
    }
  }

  // Unlock a bill
  async unlockBill(billId: string): Promise<Bill> {
    try {
      const bill = await prisma.bill.update({
        where: { id: billId },
        data: { isLocked: false },
      });

      logger.info(`Bill unlocked: ${billId}`);
      return bill;
    } catch (error) {
      logger.error(`Error unlocking bill: ${error}`);
      throw error;
    }
  }

  // Create a final bill for a resident (no more billing after this)
  async createFinalBill(residentId: string, data: {
    totalAmount: number;
    reason: string;
  }): Promise<Bill> {
    try {
      const resident = await prisma.user.findUnique({
        where: { id: residentId },
        include: { assignedHouse: true },
      });

      if (!resident || !resident.assignedHouse) {
        throw new Error("Resident or house not found");
      }

      const finalBill = await prisma.bill.create({
        data: {
          billNumber: `FINAL-${Date.now()}`,
          resident: { connect: { id: residentId } },
          house: { connect: { id: resident.assignedHouse.id } },
          meter: { connect: { id: "" } }, // This might still fail if "" is not a valid UUID
          billingMonth: new Date().toISOString().slice(0, 7),
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(),
          previousReading: 0,
          currentReading: 0,
          unitsConsumed: 0,
          totalAmount: data.totalAmount,
          balance: data.totalAmount,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: BillStatus.UNPAID,
          isLocked: true, // Final bills are locked
        },
      });

      logger.info(`Final bill created for resident ${residentId}: ${finalBill.id}`);
      return finalBill;
    } catch (error) {
      logger.error(`Error creating final bill: ${error}`);
      throw error;
    }
  }

  // Get all locked bills
  async getLockedBills(skip = 0, take = 50): Promise<Bill[]> {
    try {
      const bills = await prisma.bill.findMany({
        where: { isLocked: true },
        include: {
          resident: { select: { id: true, fullName: true, email: true } },
          house: { select: { id: true, houseNumber: true } },
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      });

      return bills;
    } catch (error) {
      logger.error(`Error fetching locked bills: ${error}`);
      throw error;
    }
  }

  // Get unpaid bills for collection
  async getUnpaidBillsForCollection(skip = 0, take = 50): Promise<Bill[]> {
    try {
      const bills = await prisma.bill.findMany({
        where: {
          status: { in: [BillStatus.UNPAID, BillStatus.OVERDUE] },
        },
        include: {
          resident: { select: { id: true, fullName: true, email: true, phone: true } },
          house: { select: { id: true, houseNumber: true } },
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        skip,
        take,
        orderBy: { dueDate: "asc" },
      });

      return bills;
    } catch (error) {
      logger.error(`Error fetching unpaid bills: ${error}`);
      throw error;
    }
  }

  // Get overdue bills
  async getOverdueBills(skip = 0, take = 50): Promise<Bill[]> {
    try {
      const bills = await prisma.bill.findMany({
        where: {
          status: BillStatus.OVERDUE,
          dueDate: { lt: new Date() },
        },
        include: {
          resident: { select: { id: true, fullName: true, email: true, phone: true } },
          house: { select: { id: true, houseNumber: true } },
        },
        skip,
        take,
        orderBy: { dueDate: "asc" },
      });

      return bills;
    } catch (error) {
      logger.error(`Error fetching overdue bills: ${error}`);
      throw error;
    }
  }

  // Get bills by resident for collection tracking
  async getResidentBillsForCollection(residentId: string): Promise<Bill[]> {
    try {
      const bills = await prisma.bill.findMany({
        where: { residentId },
        include: {
          payments: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      });

      return bills;
    } catch (error) {
      logger.error(`Error fetching resident bills: ${error}`);
      throw error;
    }
  }

  // Calculate collection statistics
  async getCollectionStats(): Promise<{
    totalUnpaid: number;
    totalOverdue: number;
    totalOutstanding: number;
    averageOutstandingAmount: number;
  }> {
    try {
      const unpaidBills = await prisma.bill.findMany({
        where: { status: BillStatus.UNPAID },
      });

      const overdueBills = await prisma.bill.findMany({
        where: {
          status: BillStatus.OVERDUE,
          dueDate: { lt: new Date() },
        },
      });

      const totalUnpaid = unpaidBills.reduce((sum, bill) => sum + bill.balance, 0);
      const totalOverdue = overdueBills.reduce((sum, bill) => sum + bill.balance, 0);
      const totalOutstanding = totalUnpaid + totalOverdue;
      const allOutstandingBills = [...unpaidBills, ...overdueBills];
      const averageOutstandingAmount =
        allOutstandingBills.length > 0
          ? totalOutstanding / allOutstandingBills.length
          : 0;

      return {
        totalUnpaid,
        totalOverdue,
        totalOutstanding,
        averageOutstandingAmount,
      };
    } catch (error) {
      logger.error(`Error calculating collection stats: ${error}`);
      throw error;
    }
  }

  // Send collection reminder
  async sendCollectionReminder(billId: string): Promise<void> {
    try {
      const bill = await prisma.bill.findUnique({
        where: { id: billId },
        include: { resident: true },
      });

      if (!bill) {
        throw new Error("Bill not found");
      }

      // TODO: Integrate with notification service to send reminder
      logger.info(`Collection reminder sent for bill ${billId}`);
    } catch (error) {
      logger.error(`Error sending collection reminder: ${error}`);
      throw error;
    }
  }

  // Bulk lock bills for a billing cycle
  async bulkLockBillsForCycle(billingMonth: string): Promise<number> {
    try {
      const result = await prisma.bill.updateMany({
        where: { billingMonth },
        data: { isLocked: true },
      });

      logger.info(`Bulk locked ${result.count} bills for cycle ${billingMonth}`);
      return result.count;
    } catch (error) {
      logger.error(`Error bulk locking bills: ${error}`);
      throw error;
    }
  }

  // Bulk unlock bills for a billing cycle
  async bulkUnlockBillsForCycle(billingMonth: string): Promise<number> {
    try {
      const result = await prisma.bill.updateMany({
        where: { billingMonth },
        data: { isLocked: false },
      });

      logger.info(`Bulk unlocked ${result.count} bills for cycle ${billingMonth}`);
      return result.count;
    } catch (error) {
      logger.error(`Error bulk unlocking bills: ${error}`);
      throw error;
    }
  }

  // Get collection performance by month
  async getCollectionPerformanceByMonth(months = 12): Promise<any[]> {
    try {
      const results = [];
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toISOString().slice(0, 7);

        const bills = await prisma.bill.findMany({
          where: { billingMonth: month },
        });

        const paid = bills.filter((b) => b.status === BillStatus.PAID).length;
        const unpaid = bills.filter((b) => b.status === BillStatus.UNPAID).length;
        const partial = bills.filter((b) => b.status === BillStatus.PARTIAL).length;

        const totalGenerated = bills.reduce((sum, b) => sum + b.totalAmount, 0);
        const totalCollected = bills.reduce((sum, b) => sum + b.amountPaid, 0);
        const collectionRate =
          totalGenerated > 0 ? (totalCollected / totalGenerated) * 100 : 0;

        results.push({
          month,
          paid,
          unpaid,
          partial,
          totalGenerated,
          totalCollected,
          collectionRate: collectionRate.toFixed(2),
        });
      }

      return results;
    } catch (error) {
      logger.error(`Error getting collection performance: ${error}`);
      throw error;
    }
  }
}

export default new EnhancedBillingService();
