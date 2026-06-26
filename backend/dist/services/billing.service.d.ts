export declare class BillingService {
    generateMonthlyBills(billingMonth: string, force?: boolean): Promise<{
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
            dueDate: Date;
            totalAmount: number;
            amountPaid: number;
            balance: number;
            status: import("@prisma/client").$Enums.BillStatus;
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
            status: import("@prisma/client").$Enums.PaymentStatus;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethodType;
            provider: import("@prisma/client").$Enums.PaymentProviderType;
            billId: string;
            merchantReference: string | null;
            providerTransactionId: string | null;
            providerReference: string | null;
            providerOrderId: string | null;
            providerStatus: string | null;
            providerMessage: string | null;
            receiptNumber: string | null;
            confirmationCode: string | null;
            phoneNumber: string | null;
            maskedAccount: string | null;
            cardBrand: string | null;
            currency: string | null;
            amount: number;
            reconciliationStatus: import("@prisma/client").$Enums.PaymentReconciliationStatus;
            merchantRequestId: string | null;
            checkoutRequestId: string | null;
            callbackPayload: import("@prisma/client/runtime/library").JsonValue | null;
            providerPayload: import("@prisma/client/runtime/library").JsonValue | null;
            failureReason: string | null;
            verificationTimestamp: Date | null;
            verifiedBy: string | null;
        }[];
        id: string;
        createdAt: Date;
        billNumber: string;
        residentId: string;
        houseId: string;
        meterId: string;
        billingMonth: string;
        dueDate: Date;
        previousReading: number;
        currentReading: number;
        unitsConsumed: number;
        unitRate: number;
        totalAmount: number;
        amountPaid: number;
        balance: number;
        status: import("@prisma/client").$Enums.BillStatus;
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
            createdAt: Date;
            billNumber: string;
            meterId: string;
            billingMonth: string;
            billingPeriodStart: Date;
            billingPeriodEnd: Date;
            generatedAt: Date;
            dueDate: Date;
            unitsConsumed: number;
            unitRate: number;
            totalAmount: number;
            amountPaid: number;
            balance: number;
            status: import("@prisma/client").$Enums.BillStatus;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    markOverdueBills(): Promise<import("@prisma/client").Prisma.BatchPayload>;
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
            status: import("@prisma/client").$Enums.PaymentStatus;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethodType;
            provider: import("@prisma/client").$Enums.PaymentProviderType;
            billId: string;
            merchantReference: string | null;
            providerTransactionId: string | null;
            providerReference: string | null;
            providerOrderId: string | null;
            providerStatus: string | null;
            providerMessage: string | null;
            receiptNumber: string | null;
            confirmationCode: string | null;
            phoneNumber: string | null;
            maskedAccount: string | null;
            cardBrand: string | null;
            currency: string | null;
            amount: number;
            reconciliationStatus: import("@prisma/client").$Enums.PaymentReconciliationStatus;
            merchantRequestId: string | null;
            checkoutRequestId: string | null;
            callbackPayload: import("@prisma/client/runtime/library").JsonValue | null;
            providerPayload: import("@prisma/client/runtime/library").JsonValue | null;
            failureReason: string | null;
            verificationTimestamp: Date | null;
            verifiedBy: string | null;
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
    deleteBill(id: string): Promise<{
        message: string;
    }>;
    deleteBills(ids: string[]): Promise<{
        deleted: number;
    }>;
    deleteBillsByMonth(billingMonth: string): Promise<{
        deleted: number;
    }>;
    deleteAllUnpaidBills(): Promise<{
        deleted: number;
    }>;
    exportBillsCSV(query: any): Promise<string>;
}
export declare const billingService: BillingService;
//# sourceMappingURL=billing.service.d.ts.map