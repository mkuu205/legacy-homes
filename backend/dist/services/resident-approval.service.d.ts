export declare class ResidentApprovalService {
    getPendingApplications(skip?: number, take?: number): Promise<{
        assignedHouse: {
            id: string;
            houseNumber: string;
            occupancyStatus: import(".prisma/client").$Enums.HouseStatus;
        };
        id: string;
        createdAt: Date;
        houseId: string;
        fullName: string;
        email: string;
        phone: string;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        registrationStatus: import(".prisma/client").$Enums.RegistrationStatus;
        profilePicture: string;
        nationalId: string;
        accountNumber: string;
    }[]>;
    getApprovedResidents(skip?: number, take?: number): Promise<{
        assignedHouse: {
            id: string;
            houseNumber: string;
            occupancyStatus: import(".prisma/client").$Enums.HouseStatus;
            creationDate: Date;
            notes: string | null;
            isLocked: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        id: string;
        createdAt: Date;
        houseId: string;
        fullName: string;
        email: string;
        phone: string;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        accountNumber: string;
    }[]>;
    getRejectedResidents(skip?: number, take?: number): Promise<{
        id: string;
        createdAt: Date;
        fullName: string;
        email: string;
        phone: string;
        registrationStatus: import(".prisma/client").$Enums.RegistrationStatus;
        accountNumber: string;
    }[]>;
    approveResident(residentId: string, assignedHouseId?: string): Promise<{
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
    getApplicationCountByStatus(): Promise<{
        pending: number;
        approved: number;
        rejected: number;
        total: number;
    }>;
    bulkApproveResidents(residentIds: string[]): Promise<number>;
    bulkRejectResidents(residentIds: string[], reason: string): Promise<number>;
    assignHouseToResident(residentId: string, houseId: string): Promise<{
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
    unassignHouseFromResident(residentId: string): Promise<{
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
    rejectResident(residentId: string, reason: string): Promise<{
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
}
export declare const residentApprovalService: ResidentApprovalService;
//# sourceMappingURL=resident-approval.service.d.ts.map