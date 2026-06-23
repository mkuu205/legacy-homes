export declare class ReportService {
    getBillingReport(query: {
        startMonth?: string;
        endMonth?: string;
    }): Promise<{
        bills: {
            resident: {
                fullName: string;
                accountNumber: string;
            };
            meter: {
                meterNumber: string;
            };
            houseNumber: string;
            id: string;
            billNumber: string;
            residentId: string;
            houseId: string;
            meterId: string;
            billingMonth: string;
            totalAmount: number;
            amountPaid: number;
            balance: number;
            status: import(".prisma/client").$Enums.BillStatus;
        }[];
        summary: {
            total: number;
            totalAmount: number;
            totalPaid: number;
            totalOutstanding: number;
            byStatus: {
                PAID: number;
                PARTIAL: number;
                UNPAID: number;
                OVERDUE: number;
            };
        };
    }>;
    getRevenueReport(query: {
        year?: string;
    }): Promise<{
        payments: {
            resident: {
                fullName: string;
                houseNumber: string;
            };
            id: string;
            createdAt: Date;
            residentId: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            paymentId: string;
            amount: number;
        }[];
        byMonth: Record<string, number>;
        totalRevenue: number;
        year: string;
    }>;
    getOverdueReport(): Promise<{
        bills: {
            resident: {
                fullName: string;
                email: string;
                phone: string;
                accountNumber: string;
            };
            meter: {
                meterNumber: string;
            };
            houseNumber: string;
            id: string;
            billNumber: string;
            residentId: string;
            houseId: string;
            meterId: string;
            totalAmount: number;
            balance: number;
            dueDate: Date;
        }[];
        total: number;
        totalOutstanding: number;
    }>;
    getConsumptionReport(query: {
        billingMonth?: string;
    }): Promise<{
        readings: {
            meter: {
                meterNumber: string;
            };
            resident: {
                fullName: string;
                accountNumber: string;
            };
            houseNumber: string;
            id: string;
            createdAt: Date;
            meterId: string;
            billingMonth: string;
            unitsConsumed: number;
        }[];
        totalUnits: number;
        avgUnits: number;
        count: number;
    }>;
    getAdminDashboardStats(): Promise<{
        totalResidents: number;
        activeResidents: number;
        totalBills: number;
        paidBills: number;
        unpaidBills: number;
        overdueBills: number;
        monthlyRevenue: number;
        lastMonthRevenue: number;
        revenueGrowth: string;
        pendingPayments: number;
        successfulPayments: number;
        openTickets: number;
        totalMeters: number;
        revenueTrend: any[];
    }>;
}
export declare const reportService: ReportService;
//# sourceMappingURL=report.service.d.ts.map