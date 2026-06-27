export declare class MeterService {
    getAllMeters(query: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
    }): Promise<{
        meters: {
            houseNumber: string;
            resident: {
                id: string;
                fullName: string;
                email: string;
                phone: string;
                accountNumber: string;
            };
            id: string;
            createdAt: Date;
            houseId: string;
            previousReading: number;
            currentReading: number;
            status: import("@prisma/client").$Enums.MeterStatus;
            meterNumber: string;
            meterSerial: string;
            installationDate: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getMeterById(id: string): Promise<{
        houseNumber: string;
        resident: {
            id: string;
            fullName: string;
            email: string;
            phone: string;
            accountNumber: string;
        };
        readings: {
            id: string;
            createdAt: Date;
            billingMonth: string;
            previousReading: number;
            currentReading: number;
            unitsConsumed: number;
        }[];
        id: string;
        notes: string;
        createdAt: Date;
        updatedAt: Date;
        houseId: string;
        previousReading: number;
        currentReading: number;
        status: import("@prisma/client").$Enums.MeterStatus;
        meterNumber: string;
        meterSerial: string;
        installationDate: Date;
    }>;
    createMeter(data: {
        meterNumber: string;
        meterSerial: string;
        houseNumber: string;
        installationDate: string;
        notes?: string;
    }): Promise<{
        houseNumber: string;
        id: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        houseId: string;
        previousReading: number;
        currentReading: number;
        status: import("@prisma/client").$Enums.MeterStatus;
        meterNumber: string;
        meterSerial: string;
        installationDate: Date;
    }>;
    updateMeter(id: string, data: Partial<{
        meterNumber: string;
        meterSerial: string;
        status: 'ACTIVE' | 'FAULTY' | 'REPLACED';
        notes: string;
    }>): Promise<{
        id: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        houseId: string;
        previousReading: number;
        currentReading: number;
        status: import("@prisma/client").$Enums.MeterStatus;
        meterNumber: string;
        meterSerial: string;
        installationDate: Date;
    }>;
    deleteMeter(id: string): Promise<{
        message: string;
    }>;
    addReading(data: {
        meterId: string;
        billingMonth: string;
        currentReading: number;
        notes?: string;
        photoFile?: string;
        readBy: string;
    }): Promise<{
        id: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        meterId: string;
        billingMonth: string;
        previousReading: number;
        currentReading: number;
        unitsConsumed: number;
        billId: string | null;
        readBy: string;
        photoUrl: string | null;
    }>;
    getReadingHistory(meterId: string): Promise<{
        id: string;
        notes: string;
        createdAt: Date;
        billingMonth: string;
        previousReading: number;
        currentReading: number;
        unitsConsumed: number;
        photoUrl: string;
    }[]>;
    getResidentMeter(residentId: string): Promise<{
        readings: {
            id: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            meterId: string;
            billingMonth: string;
            previousReading: number;
            currentReading: number;
            unitsConsumed: number;
            billId: string | null;
            readBy: string;
            photoUrl: string | null;
        }[];
        id: string;
        createdAt: Date;
        previousReading: number;
        currentReading: number;
        status: import("@prisma/client").$Enums.MeterStatus;
        meterNumber: string;
        meterSerial: string;
    }>;
    exportMetersCSV(): Promise<string>;
}
export declare const meterService: MeterService;
//# sourceMappingURL=meter.service.d.ts.map