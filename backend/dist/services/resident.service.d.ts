export declare class ResidentService {
    getAllResidents(query: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
    }): Promise<{
        residents: {
            houseNumber: string;
            id: string;
            createdAt: Date;
            houseId: string;
            fullName: string;
            email: string;
            phone: string;
            accountStatus: import("@prisma/client").$Enums.AccountStatus;
            profilePicture: string;
            nationalId: string;
            accountNumber: string;
            emailVerified: boolean;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getResidentById(id: string): Promise<{
        houseNumber: string;
        bills: {
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
            billingPeriodStart: Date;
            billingPeriodEnd: Date;
            generatedAt: Date;
            dueDate: Date;
            paidAt: Date | null;
            previousReading: number;
            currentReading: number;
            unitsConsumed: number;
            unitRate: number;
            totalAmount: number;
            amountPaid: number;
            balance: number;
            status: import("@prisma/client").$Enums.BillStatus;
            paymentProvider: import("@prisma/client").$Enums.PaymentProviderType | null;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethodType | null;
            paymentId: string | null;
            daysUntilDue: number | null;
            overdueDays: number | null;
            isOverdue: boolean | null;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        houseId: string;
        fullName: string;
        email: string;
        phone: string;
        accountStatus: import("@prisma/client").$Enums.AccountStatus;
        registrationStatus: import("@prisma/client").$Enums.RegistrationStatus;
        profilePicture: string;
        nationalId: string;
        accountNumber: string;
    }>;
    updateResident(id: string, data: Partial<{
        fullName: string;
        phone: string;
        nationalId: string;
    }>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        houseId: string | null;
        fullName: string;
        email: string;
        phone: string;
        passwordHash: string;
        role: import("@prisma/client").$Enums.Role;
        accountStatus: import("@prisma/client").$Enums.AccountStatus;
        registrationStatus: import("@prisma/client").$Enums.RegistrationStatus;
        profilePicture: string | null;
        nationalId: string | null;
        accountNumber: string;
        emailVerified: boolean;
    }>;
    updateProfile(userId: string, data: {
        fullName?: string;
        phone?: string;
        nationalId?: string;
    }): Promise<{
        houseNumber: string;
        id: string;
        houseId: string;
        fullName: string;
        email: string;
        phone: string;
        accountStatus: import("@prisma/client").$Enums.AccountStatus;
        profilePicture: string;
        nationalId: string;
        accountNumber: string;
    }>;
    updateProfilePicture(userId: string, filePath: string): Promise<{
        id: string;
        profilePicture: string;
    }>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        message: string;
    }>;
    updateAccountStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        houseId: string | null;
        fullName: string;
        email: string;
        phone: string;
        passwordHash: string;
        role: import("@prisma/client").$Enums.Role;
        accountStatus: import("@prisma/client").$Enums.AccountStatus;
        registrationStatus: import("@prisma/client").$Enums.RegistrationStatus;
        profilePicture: string | null;
        nationalId: string | null;
        accountNumber: string;
        emailVerified: boolean;
    }>;
    deleteResident(id: string): Promise<{
        message: string;
    }>;
    adminResetPassword(id: string, newPassword: string): Promise<{
        message: string;
    }>;
    getResidentDashboard(userId: string): Promise<{
        user: {
            houseNumber: string;
            id: string;
            houseId: string;
            fullName: string;
            email: string;
            phone: string;
            profilePicture: string;
            accountNumber: string;
        };
        currentBill: {
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
            billingPeriodStart: Date;
            billingPeriodEnd: Date;
            generatedAt: Date;
            dueDate: Date;
            paidAt: Date | null;
            previousReading: number;
            currentReading: number;
            unitsConsumed: number;
            unitRate: number;
            totalAmount: number;
            amountPaid: number;
            balance: number;
            status: import("@prisma/client").$Enums.BillStatus;
            paymentProvider: import("@prisma/client").$Enums.PaymentProviderType | null;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethodType | null;
            paymentId: string | null;
            daysUntilDue: number | null;
            overdueDays: number | null;
            isOverdue: boolean | null;
        };
        recentPayments: {
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
        unreadNotifications: number;
        consumptionHistory: {
            createdAt: Date;
            billingMonth: string;
            unitsConsumed: number;
        }[];
    }>;
    createResident(data: {
        fullName: string;
        email: string;
        phone: string;
        houseNumber: string;
        password: string;
        nationalId?: string;
    }): Promise<{
        houseNumber: string;
        id: string;
        createdAt: Date;
        houseId: string;
        fullName: string;
        email: string;
        phone: string;
        accountStatus: import("@prisma/client").$Enums.AccountStatus;
        accountNumber: string;
    }>;
    exportResidentsCSV(query: {
        status?: string;
        search?: string;
    }): Promise<string>;
}
export declare const residentService: ResidentService;
//# sourceMappingURL=resident.service.d.ts.map