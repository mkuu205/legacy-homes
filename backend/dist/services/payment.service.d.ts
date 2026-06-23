export declare class PaymentService {
    private payHeroBaseUrl;
    initiateSTKPush(data: {
        billId: string;
        residentId: string;
        amount: number;
        phoneNumber: string;
    }): Promise<{
        success: boolean;
        paymentId: string;
        checkoutRequestId: any;
        message: string;
    }>;
    handleCallback(payload: any, signature: string): Promise<{
        received: boolean;
    }>;
    private reconcilePayment;
    checkPaymentStatus(paymentId: string, userId: string): Promise<{
        status: string;
        failureReason: string;
        bill: {
            billNumber: string;
            balance: number;
            status: import(".prisma/client").$Enums.BillStatus;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        residentId: string;
        paymentId: string;
        billId: string;
        amount: number;
        phoneNumber: string;
        mpesaReceiptCode: string | null;
        payHeroReference: string | null;
        checkoutRequestId: string | null;
        reconciliationStatus: import(".prisma/client").$Enums.PaymentReconciliationStatus;
    }>;
    getResidentPayments(residentId: string, query: any): Promise<{
        payments: ({
            bill: {
                id: string;
                isLocked: boolean;
                createdAt: Date;
                updatedAt: Date;
                billNumber: string;
                residentId: string;
                houseId: string;
                meterId: string;
                readingId: string | null;
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
            };
        } & {
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
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getAllPayments(query: any): Promise<{
        payments: ({
            bill: {
                id: string;
                isLocked: boolean;
                createdAt: Date;
                updatedAt: Date;
                billNumber: string;
                residentId: string;
                houseId: string;
                meterId: string;
                readingId: string | null;
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
            };
            resident: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                houseId: string | null;
                fullName: string;
                email: string;
                phone: string;
                passwordHash: string;
                role: import(".prisma/client").$Enums.Role;
                accountStatus: import(".prisma/client").$Enums.AccountStatus;
                registrationStatus: import(".prisma/client").$Enums.RegistrationStatus;
                profilePicture: string | null;
                nationalId: string | null;
                accountNumber: string;
                emailVerified: boolean;
            };
        } & {
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
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getPaymentStats(): Promise<{
        total: number;
        successful: number;
        pending: number;
        failed: number;
    }>;
}
export declare const paymentService: PaymentService;
//# sourceMappingURL=payment.service.d.ts.map