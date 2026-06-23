import { House, HouseStatus } from "@prisma/client";
export declare class HouseService {
    createHouse(data: {
        houseNumber: string;
        occupancyStatus?: HouseStatus;
        notes?: string;
    }): Promise<House>;
    getAllHouses(filters?: {
        occupancyStatus?: HouseStatus;
        isLocked?: boolean;
        skip?: number;
        take?: number;
    }): Promise<House[]>;
    getHouseById(houseId: string): Promise<House | null>;
    updateHouse(houseId: string, data: {
        occupancyStatus?: HouseStatus;
        notes?: string;
        isLocked?: boolean;
    }): Promise<House>;
    lockHouseForBilling(houseId: string): Promise<House>;
    unlockHouse(houseId: string): Promise<House>;
    getHousesByStatus(status: HouseStatus): Promise<House[]>;
    getVacantHouses(): Promise<House[]>;
    getOccupiedHouses(): Promise<House[]>;
    deleteHouse(houseId: string): Promise<void>;
}
declare const _default: HouseService;
export default _default;
//# sourceMappingURL=house.service.d.ts.map