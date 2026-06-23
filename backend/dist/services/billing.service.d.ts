export declare class BillingService {
    generateMonthlyBills(billingMonth: string): Promise<{
        generated: number;
        bills: any[];
    }>;
    getAllBills(query: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        billingMonth?: string;
        residentId?: string;
    }): Promise<{
        bills: {
            resident: {
                fullName: string;
                email: string;
                accountNumber: string;
            };
            meter: {
                meterNumber: string;
            };
            houseNumber: string;
            id: string;
            createdAt: Date;
            billNumber: string;
            residentId: string;
            houseId: string;
            meterId: string;
            billingMonth: string;
            totalAmount: number;
            amountPaid: number;
            balance: number;
            dueDate: Date;
            status: import(".prisma/client").$Enums.BillStatus;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getBillById(id: string): Promise<{
        resident: {
            id: string;
            fullName: string;
            email: string;
            phone: string;
            accountNumber: string;
        };
        meter: {
            meterNumber: string;
            meterSerial: string;
        };
        houseNumber: string;
        payments: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            residentId: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            paymentId: string;
            billId: string;
            amount: number;
            phoneNumber: string;
            mpesaReceiptCode: string | null;
            payHeroReference: string | null;
            checkoutRequestId: string | null;
            reconciliationStatus: import(".prisma/client").$Enums.PaymentReconciliationStatus;
            failureReason: string | null;
        }[];
        id: string;
        createdAt: Date;
        billNumber: string;
        residentId: string;
        houseId: string;
        meterId: string;
        billingMonth: string;
        previousReading: number;
        currentReading: number;
        unitsConsumed: number;
        unitRate: number;
        totalAmount: number;
        amountPaid: number;
        balance: number;
        dueDate: Date;
        status: import(".prisma/client").$Enums.BillStatus;
    }>;
    getResidentBills(residentId: string, query: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<{
        bills: {
            meter: {
                meterNumber: string;
            };
            id: string;
            billNumber: string;
            meterId: string;
            billingMonth: string;
            totalAmount: number;
            amountPaid: number;
            balance: number;
            dueDate: Date;
            status: import(".prisma/client").$Enums.BillStatus;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    markOverdueBills(): Promise<import(".prisma/client").Prisma.BatchPayload>;
    getResidentStatement(residentId: string): Promise<{
        resident: {
            houseNumber: string;
            houseId: string;
            fullName: string;
            email: string;
            phone: string;
            accountNumber: string;
        };
        bills: {
            meterNumber: string;
            id: string;
            billNumber: string;
            meterId: string;
            billingMonth: string;
            totalAmount: number;
        }[];
        payments: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            residentId: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            paymentId: string;
            billId: string;
            amount: number;
            phoneNumber: string;
            mpesaReceiptCode: string | null;
            payHeroReference: string | null;
            checkoutRequestId: string | null;
            reconciliationStatus: import(".prisma/client").$Enums.PaymentReconciliationStatus;
            failureReason: string | null;
        }[];
        summary: {
            totalBilled: number;
            totalPaid: number;
            outstanding: number;
        };
    }>;
    getBillingStats(): Promise<{
        totalBills: number;
        paidBills: number;
        unpaidBills: number;
        overdueBills: number;
        monthlyRevenue: number;
        collectionRate: string | number;
    }>;
    generateInvoicePDF(billId: string): Promise<unknown>;
    generateReceiptPDF(paymentId: string): Promise<unknown>;
}
export declare const billingService: BillingService;
//# sourceMappingURL=billing.service.d.ts.map