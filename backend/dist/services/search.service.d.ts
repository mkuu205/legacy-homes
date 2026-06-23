export declare class SearchService {
    globalSearch(query: string, skip?: number, take?: number): Promise<{
        residents: {
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
            houseId: string;
            fullName: string;
            email: string;
            phone: string;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
            registrationStatus: import(".prisma/client").$Enums.RegistrationStatus;
            accountNumber: string;
        }[];
        bills: {
            resident: {
                id: string;
                fullName: string;
                email: string;
            };
            house: {
                id: string;
                houseNumber: string;
            };
            id: string;
            createdAt: Date;
            billNumber: string;
            residentId: string;
            houseId: string;
            billingMonth: string;
            totalAmount: number;
            status: import(".prisma/client").$Enums.BillStatus;
        }[];
        tickets: {
            resident: {
                id: string;
                fullName: string;
                email: string;
            };
            id: string;
            createdAt: Date;
            residentId: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            ticketId: string;
            subject: string;
        }[];
        meters: {
            house: {
                id: string;
                houseNumber: string;
            };
            id: string;
            createdAt: Date;
            houseId: string;
            status: import(".prisma/client").$Enums.MeterStatus;
            meterNumber: string;
            meterSerial: string;
        }[];
    }>;
    searchResidents(query: string, skip?: number, take?: number): Promise<{
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
        houseId: string;
        fullName: string;
        email: string;
        phone: string;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        registrationStatus: import(".prisma/client").$Enums.RegistrationStatus;
        accountNumber: string;
    }[]>;
    searchBills(query: string, skip?: number, take?: number): Promise<{
        resident: {
            id: string;
            fullName: string;
            email: string;
        };
        house: {
            id: string;
            houseNumber: string;
        };
        id: string;
        createdAt: Date;
        billNumber: string;
        residentId: string;
        houseId: string;
        billingMonth: string;
        totalAmount: number;
        status: import(".prisma/client").$Enums.BillStatus;
    }[]>;
    searchTickets(query: string, skip?: number, take?: number): Promise<{
        resident: {
            id: string;
            fullName: string;
            email: string;
        };
        id: string;
        createdAt: Date;
        residentId: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        ticketId: string;
        subject: string;
    }[]>;
    searchMeters(query: string, skip?: number, take?: number): Promise<{
        house: {
            id: string;
            houseNumber: string;
        };
        id: string;
        createdAt: Date;
        houseId: string;
        status: import(".prisma/client").$Enums.MeterStatus;
        meterNumber: string;
        meterSerial: string;
    }[]>;
    advancedSearch(filters: {
        type: 'residents' | 'bills' | 'tickets' | 'meters';
        query?: string;
        status?: string;
        startDate?: Date;
        endDate?: Date;
        skip?: number;
        take?: number;
    }): Promise<{
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
        houseId: string;
        fullName: string;
        email: string;
        phone: string;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        registrationStatus: import(".prisma/client").$Enums.RegistrationStatus;
        accountNumber: string;
    }[] | {
        resident: {
            id: string;
            fullName: string;
            email: string;
        };
        house: {
            id: string;
            houseNumber: string;
        };
        id: string;
        createdAt: Date;
        billNumber: string;
        residentId: string;
        houseId: string;
        billingMonth: string;
        totalAmount: number;
        status: import(".prisma/client").$Enums.BillStatus;
    }[] | {
        resident: {
            id: string;
            fullName: string;
            email: string;
        };
        id: string;
        createdAt: Date;
        residentId: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        ticketId: string;
        subject: string;
    }[] | {
        house: {
            id: string;
            houseNumber: string;
        };
        id: string;
        createdAt: Date;
        houseId: string;
        status: import(".prisma/client").$Enums.MeterStatus;
        meterNumber: string;
        meterSerial: string;
    }[]>;
}
export declare const searchService: SearchService;
//# sourceMappingURL=search.service.d.ts.map