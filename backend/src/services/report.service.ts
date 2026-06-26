import prisma from '../config/prisma';

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
      },
      orderBy: { billingMonth: 'desc' },
    });

    // Fetch resident and meter info for each bill
    const billsWithDetails = await Promise.all(
      bills.map(async (bill) => {
        const [resident, meter, house] = await Promise.all([
          prisma.user.findUnique({
            where: { id: bill.residentId },
            select: { fullName: true, accountNumber: true },
          }),
          prisma.meter.findUnique({
            where: { id: bill.meterId },
            select: { meterNumber: true },
          }),
          prisma.house.findUnique({
            where: { id: bill.houseId },
            select: { houseNumber: true },
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

    const summary = {
      total: bills.length,
      totalAmount: bills.reduce((s, b) => s + b.totalAmount, 0),
      totalPaid: bills.reduce((s, b) => s + b.amountPaid, 0),
      totalOutstanding: bills.reduce((s, b) => s + b.balance, 0),
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
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch resident info for each payment
    const paymentsWithResident = await Promise.all(
      payments.map(async (p) => {
        const resident = await prisma.user.findUnique({
          where: { id: p.residentId },
          select: { fullName: true, houseId: true },
        });
        const house = resident?.houseId
          ? await prisma.house.findUnique({ where: { id: resident.houseId } })
          : null;
        return {
          ...p,
          resident: { fullName: resident?.fullName, houseNumber: house?.houseNumber },
        };
      })
    );

    // Group by month
    const byMonth: Record<string, number> = {};
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${m.toString().padStart(2, '0')}`;
      byMonth[key] = 0;
    }
    payments.forEach((p) => {
      const key = `${p.createdAt.getFullYear()}-${(p.createdAt.getMonth() + 1).toString().padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + p.amount;
    });

    const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);

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
      },
      orderBy: { dueDate: 'asc' },
    });

    // Fetch resident and meter info
    const billsWithDetails = await Promise.all(
      overdueBills.map(async (bill) => {
        const [resident, meter, house] = await Promise.all([
          prisma.user.findUnique({
            where: { id: bill.residentId },
            select: { fullName: true, email: true, phone: true, accountNumber: true },
          }),
          prisma.meter.findUnique({
            where: { id: bill.meterId },
            select: { meterNumber: true },
          }),
          prisma.house.findUnique({
            where: { id: bill.houseId },
            select: { houseNumber: true },
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

    const totalOutstanding = overdueBills.reduce((s, b) => s + b.balance, 0);
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
      },
      orderBy: { unitsConsumed: 'desc' },
    });

    // Fetch meter and resident info for each reading
    const readingsWithDetails = await Promise.all(
      readings.map(async (reading) => {
        const meter = await prisma.meter.findUnique({
          where: { id: reading.meterId },
          select: { meterNumber: true, houseId: true },
        });
        const house = meter?.houseId
          ? await prisma.house.findUnique({ where: { id: meter.houseId } })
          : null;
        const resident = house?.id
          ? await prisma.user.findUnique({
              where: { houseId: house.id },
              select: { fullName: true, accountNumber: true },
            })
          : null;
        return {
          ...reading,
          meter: { meterNumber: meter?.meterNumber },
          resident,
          houseNumber: house?.houseNumber,
        };
      })
    );

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

    // Monthly revenue trend (last 6 months)
    const revenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const rev = await prisma.payment.aggregate({
        where: { status: 'SUCCESSFUL', createdAt: { gte: d, lte: end } },
        _sum: { amount: true },
      });
      revenueTrend.push({
        month: d.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }),
        revenue: rev._sum.amount || 0,
      });
    }

    const currentRevenue = monthlyRevenue._sum.amount || 0;
    const prevRevenue = lastMonthRevenue._sum.amount || 0;
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
