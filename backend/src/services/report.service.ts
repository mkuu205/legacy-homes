import { prisma } from '../config/prisma';
import { toMoneyNumber } from '../utils/money';
export class ReportService {
  async getBillingReport(query: { startMonth?: string; endMonth?: string }) {
    const where: any = {};
    if (query.startMonth) where.billingMonth = { gte: query.startMonth };
    if (query.endMonth) where.billingMonth = { ...where.billingMonth, lte: query.endMonth };

    const bills = await prisma.bill.findMany({
      where,
      select: {
        id: true,
        billNumber: true,
        billingMonth: true,
        totalAmount: true,
        amountPaid: true,
        balance: true,
        status: true,
        residentId: true,
        meterId: true,
        houseId: true,
        resident: { select: { fullName: true, accountNumber: true } },
        meter: { select: { meterNumber: true } },
        house: { select: { houseNumber: true } },
      },
      orderBy: { billingMonth: 'desc' },
    });

    const billsWithDetails = bills.map((bill) => ({
      ...bill,
      houseNumber: bill.house?.houseNumber,
    }));

    const summary = {
      total: bills.length,
      totalAmount: bills.reduce((s, b) => s + toMoneyNumber(b.totalAmount), 0),
      totalPaid: bills.reduce((s, b) => s + toMoneyNumber(b.amountPaid), 0),
      totalOutstanding: bills.reduce((s, b) => s + toMoneyNumber(b.balance), 0),
      byStatus: {
        PAID: bills.filter((b) => b.status === 'PAID').length,
        PARTIAL: bills.filter((b) => b.status === 'PARTIAL').length,
        UNPAID: bills.filter((b) => b.status === 'UNPAID').length,
        OVERDUE: bills.filter((b) => b.status === 'OVERDUE').length,
      },
    };

    return { bills: billsWithDetails, summary };
  }

  async getRevenueReport(query: { year?: string }) {
    const year = query.year || new Date().getFullYear().toString();
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);

    const payments = await prisma.payment.findMany({
      where: { status: 'SUCCESSFUL', createdAt: { gte: startDate, lte: endDate } },
      select: {
        id: true,
        amount: true,
        status: true,
        residentId: true,
        createdAt: true,
        resident: {
          select: {
            fullName: true,
            assignedHouse: { select: { houseNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const paymentsWithResident = payments.map((payment) => ({
      ...payment,
      resident: {
        fullName: payment.resident?.fullName,
        houseNumber: payment.resident?.assignedHouse?.houseNumber,
      },
    }));

    // Group by month
    const byMonth: Record<string, number> = {};
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${m.toString().padStart(2, '0')}`;
      byMonth[key] = 0;
    }
    payments.forEach((p) => {
      const key = `${p.createdAt.getFullYear()}-${(p.createdAt.getMonth() + 1).toString().padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + toMoneyNumber(p.amount);
    });

    const totalRevenue = payments.reduce((s, p) => s + toMoneyNumber(p.amount), 0);

    return { payments: paymentsWithResident, byMonth, totalRevenue, year };
  }

  async getOverdueReport() {
    const overdueBills = await prisma.bill.findMany({
      where: { status: 'OVERDUE' },
      select: {
        id: true,
        billNumber: true,
        totalAmount: true,
        balance: true,
        dueDate: true,
        residentId: true,
        meterId: true,
        houseId: true,
        resident: {
          select: { fullName: true, email: true, phone: true, accountNumber: true },
        },
        meter: { select: { meterNumber: true } },
        house: { select: { houseNumber: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const billsWithDetails = overdueBills.map((bill) => ({
      ...bill,
      houseNumber: bill.house?.houseNumber,
    }));

    const totalOutstanding = overdueBills.reduce((s, b) => s + toMoneyNumber(b.balance), 0);
    return { bills: billsWithDetails, total: overdueBills.length, totalOutstanding };
  }

  async getConsumptionReport(query: { billingMonth?: string }) {
    const where: any = {};
    if (query.billingMonth) where.billingMonth = query.billingMonth;

    const readings = await prisma.meterReading.findMany({
      where,
      select: {
        id: true,
        meterId: true,
        billingMonth: true,
        unitsConsumed: true,
        createdAt: true,
        meter: {
          select: {
            meterNumber: true,
            house: {
              select: {
                houseNumber: true,
                resident: { select: { fullName: true, accountNumber: true } },
              },
            },
          },
        },
      },
      orderBy: { unitsConsumed: 'desc' },
    });

    const readingsWithDetails = readings.map((reading) => ({
      ...reading,
      meter: { meterNumber: reading.meter?.meterNumber },
      resident: reading.meter?.house?.resident,
      houseNumber: reading.meter?.house?.houseNumber,
    }));

    const totalUnits = readings.reduce((s, r) => s + r.unitsConsumed, 0);
    const avgUnits = readings.length > 0 ? totalUnits / readings.length : 0;

    return { readings: readingsWithDetails, totalUnits, avgUnits, count: readings.length };
  }

  async getAdminDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalResidents,
      activeResidents,
      totalBills,
      paidBills,
      unpaidBills,
      overdueBills,
      monthlyRevenue,
      lastMonthRevenue,
      pendingPayments,
      successfulPayments,
      openTickets,
      totalMeters,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'RESIDENT' } }),
      prisma.user.count({ where: { role: 'RESIDENT', accountStatus: 'ACTIVE' } }),
      prisma.bill.count(),
      prisma.bill.count({ where: { status: 'PAID' } }),
      prisma.bill.count({ where: { status: { in: ['UNPAID', 'PARTIAL'] } } }),
      prisma.bill.count({ where: { status: 'OVERDUE' } }),
      prisma.payment.aggregate({
        where: { status: 'SUCCESSFUL', createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'SUCCESSFUL', createdAt: { gte: lastMonth, lte: endOfLastMonth } },
        _sum: { amount: true },
      }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'SUCCESSFUL' } }),
      prisma.ticket.count({ where: { status: { in: ['OPEN', 'PENDING'] } } }),
      prisma.meter.count({ where: { status: 'ACTIVE' } }),
    ]);

    // Monthly revenue trend (last 6 months). One bounded read replaces the
    // previous six sequential aggregates; grouping remains in application
    // memory so the response shape and timezone semantics stay unchanged.
    const trendWindows = Array.from({ length: 6 }, (_, index) => {
      const offset = 5 - index;
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
      return { createdAt: { gte: start, lte: end } };
    });
    const trendPayments = await prisma.payment.findMany({
      where: { status: 'SUCCESSFUL', OR: trendWindows },
      select: { amount: true, createdAt: true },
    });
    const revenueByMonth = new Map<string, number>();
    trendPayments.forEach((payment) => {
      const key = `${payment.createdAt.getFullYear()}-${payment.createdAt.getMonth()}`;
      revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + toMoneyNumber(payment.amount));
    });

    const revenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      revenueTrend.push({
        month: d.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }),
        revenue: revenueByMonth.get(key) || 0,
      });
    }

    const currentRevenue = toMoneyNumber(monthlyRevenue._sum.amount);
    const prevRevenue = toMoneyNumber(lastMonthRevenue._sum.amount);
    const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    return {
      totalResidents,
      activeResidents,
      totalBills,
      paidBills,
      unpaidBills,
      overdueBills,
      monthlyRevenue: currentRevenue,
      lastMonthRevenue: prevRevenue,
      revenueGrowth: revenueGrowth.toFixed(2),
      pendingPayments,
      successfulPayments,
      openTickets,
      totalMeters,
      revenueTrend,
    };
  }
}

export const reportService = new ReportService();
