"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("../utils/logger"));
const prisma = new client_1.PrismaClient();
class CollectionService {
    // Create collection task for a bill
    async createCollectionTask(billId, data) {
        try {
            const bill = await prisma.bill.findUnique({
                where: { id: billId },
                include: { resident: true, house: true },
            });
            if (!bill) {
                throw new Error("Bill not found");
            }
            // TODO: Create collection task in a new CollectionTask model
            logger_1.default.info(`Collection task created for bill ${billId}`);
            return { billId, ...data };
        }
        catch (error) {
            logger_1.default.error(`Error creating collection task: ${error}`);
            throw error;
        }
    }
    // Get collection performance metrics
    async getCollectionMetrics() {
        try {
            const allBills = await prisma.bill.findMany();
            const totalBillsGenerated = allBills.length;
            const totalBillsCollected = allBills.filter((b) => b.status === client_1.BillStatus.PAID).length;
            const totalAmountGenerated = allBills.reduce((sum, b) => sum + b.totalAmount, 0);
            const totalAmountCollected = allBills.reduce((sum, b) => sum + b.amountPaid, 0);
            const collectionRate = totalAmountGenerated > 0
                ? (totalAmountCollected / totalAmountGenerated) * 100
                : 0;
            // Calculate average days to collect (for paid bills)
            const paidBills = allBills.filter((b) => b.status === client_1.BillStatus.PAID);
            let averageDaysToCollect = 0;
            if (paidBills.length > 0) {
                const totalDays = paidBills.reduce((sum, bill) => {
                    const daysToCollect = Math.floor((bill.updatedAt.getTime() - bill.createdAt.getTime()) / (1000 * 60 * 60 * 24));
                    return sum + daysToCollect;
                }, 0);
                averageDaysToCollect = totalDays / paidBills.length;
            }
            return {
                totalBillsGenerated,
                totalBillsCollected,
                totalAmountGenerated,
                totalAmountCollected,
                collectionRate: parseFloat(collectionRate.toFixed(2)),
                averageDaysToCollect: Math.round(averageDaysToCollect),
            };
        }
        catch (error) {
            logger_1.default.error(`Error getting collection metrics: ${error}`);
            throw error;
        }
    }
    // Get top debtors
    async getTopDebtors(limit = 10) {
        try {
            const residents = await prisma.user.findMany({
                where: { role: "RESIDENT" },
                include: {
                    bills: {
                        where: { status: { in: [client_1.BillStatus.UNPAID, client_1.BillStatus.OVERDUE] } },
                    },
                },
            });
            const debtors = residents
                .map((resident) => {
                const totalDebt = resident.bills.reduce((sum, bill) => sum + bill.balance, 0);
                return {
                    residentId: resident.id,
                    fullName: resident.fullName,
                    email: resident.email,
                    phone: resident.phone,
                    totalDebt,
                    billCount: resident.bills.length,
                };
            })
                .filter((d) => d.totalDebt > 0)
                .sort((a, b) => b.totalDebt - a.totalDebt)
                .slice(0, limit);
            return debtors;
        }
        catch (error) {
            logger_1.default.error(`Error getting top debtors: ${error}`);
            throw error;
        }
    }
    // Get collection by resident
    async getResidentCollectionStatus(residentId) {
        try {
            const bills = await prisma.bill.findMany({
                where: { residentId },
                include: { payments: { orderBy: { createdAt: "desc" } } },
                orderBy: { createdAt: "desc" },
            });
            const totalGenerated = bills.reduce((sum, b) => sum + b.totalAmount, 0);
            const totalPaid = bills.reduce((sum, b) => sum + b.amountPaid, 0);
            const totalOutstanding = totalGenerated - totalPaid;
            const paymentHistory = bills
                .filter((b) => b.payments.length > 0)
                .map((b) => ({
                billId: b.id,
                billNumber: b.billNumber,
                amount: b.totalAmount,
                paid: b.amountPaid,
                payments: b.payments,
            }));
            return {
                totalGenerated,
                totalPaid,
                totalOutstanding,
                paymentHistory,
            };
        }
        catch (error) {
            logger_1.default.error(`Error getting resident collection status: ${error}`);
            throw error;
        }
    }
    // Send collection notice
    async sendCollectionNotice(billId, noticeType) {
        try {
            const bill = await prisma.bill.findUnique({
                where: { id: billId },
                include: { resident: true },
            });
            if (!bill) {
                throw new Error("Bill not found");
            }
            // TODO: Integrate with notification service
            logger_1.default.info(`${noticeType} collection notice sent for bill ${billId}`);
        }
        catch (error) {
            logger_1.default.error(`Error sending collection notice: ${error}`);
            throw error;
        }
    }
    // Get collection timeline
    async getCollectionTimeline(billId) {
        try {
            const bill = await prisma.bill.findUnique({
                where: { id: billId },
                include: {
                    payments: { orderBy: { createdAt: "asc" } },
                },
            });
            if (!bill) {
                throw new Error("Bill not found");
            }
            const timeline = [
                {
                    date: bill.createdAt,
                    event: "Bill Generated",
                    amount: bill.totalAmount,
                    status: "GENERATED",
                },
                {
                    date: bill.dueDate,
                    event: "Due Date",
                    amount: bill.balance,
                    status: "DUE",
                },
                ...bill.payments.map((p) => ({
                    date: p.createdAt,
                    event: "Payment Received",
                    amount: p.amount,
                    status: p.status,
                })),
            ];
            return timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
        }
        catch (error) {
            logger_1.default.error(`Error getting collection timeline: ${error}`);
            throw error;
        }
    }
    // Bulk send collection reminders
    async bulkSendCollectionReminders(billIds) {
        try {
            let count = 0;
            for (const billId of billIds) {
                await this.sendCollectionNotice(billId, 'FIRST');
                count++;
            }
            logger_1.default.info(`Bulk collection reminders sent for ${count} bills`);
            return count;
        }
        catch (error) {
            logger_1.default.error(`Error bulk sending collection reminders: ${error}`);
            throw error;
        }
    }
    // Get collection efficiency score
    async getCollectionEfficiencyScore() {
        try {
            const metrics = await this.getCollectionMetrics();
            // Score based on collection rate (0-100)
            const score = Math.min(metrics.collectionRate, 100);
            return parseFloat(score.toFixed(2));
        }
        catch (error) {
            logger_1.default.error(`Error calculating collection efficiency score: ${error}`);
            throw error;
        }
    }
}
exports.CollectionService = CollectionService;
exports.default = new CollectionService();
//# sourceMappingURL=collection.service.js.map