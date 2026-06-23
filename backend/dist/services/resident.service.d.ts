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
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
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
            previousReading: number;
            currentReading: number;
            unitsConsumed: number;
            unitRate: number;
            totalAmount: number;
            amountPaid: number;
            balance: number;
            dueDate: Date;
            status: import(".prisma/client").$Enums.BillStatus;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        houseId: string;
        fullName: string;
        email: string;
        phone: string;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        registrationStatus: import(".prisma/client").$Enums.RegistrationStatus;
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
        role: import(".prisma/client").$Enums.Role;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        registrationStatus: import(".prisma/client").$Enums.RegistrationStatus;
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
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
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
        role: import(".prisma/client").$Enums.Role;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        registrationStatus: import(".prisma/client").$Enums.RegistrationStatus;
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
        recentPayments: {
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
        unreadNotifications: number;
        consumptionHistory: {
            createdAt: Date;
            billingMonth: string;
            unitsConsumed: number;
        }[];
    }>;
}
export declare const residentService: ResidentService;
//# sourceMappingURL=resident.service.d.ts.map