"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HouseService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("../utils/logger"));
const prisma = new client_1.PrismaClient();
class HouseService {
    // Create a new house
    async createHouse(data) {
        try {
            const existingHouse = await prisma.house.findUnique({
                where: { houseNumber: data.houseNumber },
            });
            if (existingHouse) {
                throw new Error("House number already exists");
            }
            const house = await prisma.house.create({
                data: {
                    houseNumber: data.houseNumber,
                    occupancyStatus: data.occupancyStatus || client_1.HouseStatus.UNDER_CONSTRUCTION,
                    notes: data.notes,
                },
            });
            logger_1.default.info(`House created: ${house.id}`);
            return house;
        }
        catch (error) {
            logger_1.default.error(`Error creating house: ${error}`);
            throw error;
        }
    }
    // Get all houses with optional filtering
    async getAllHouses(filters) {
        try {
            const houses = await prisma.house.findMany({
                where: {
                    occupancyStatus: filters?.occupancyStatus,
                    isLocked: filters?.isLocked,
                },
                skip: Number.parseInt(String(filters?.skip || 0), 10),
                take: Number.parseInt(String(filters?.take || 100), 10),
                include: {
                    resident: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            phone: true,
                            registrationStatus: true,
                        },
                    },
                    meter: {
                        select: {
                            id: true,
                            meterNumber: true,
                            status: true,
                        },
                    },
                },
            });
            return houses;
        }
        catch (error) {
            logger_1.default.error(`Error fetching houses: ${error}`);
            throw error;
        }
    }
    // Get house by ID
    async getHouseById(houseId) {
        try {
            const house = await prisma.house.findUnique({
                where: { id: houseId },
                include: {
                    resident: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            phone: true,
                            registrationStatus: true,
                            accountStatus: true,
                        },
                    },
                    meter: true,
                    bills: {
                        take: 5,
                        orderBy: { createdAt: "desc" },
                    },
                },
            });
            return house;
        }
        catch (error) {
            logger_1.default.error(`Error fetching house: ${error}`);
            throw error;
        }
    }
    // Update house
    async updateHouse(houseId, data) {
        try {
            const house = await prisma.house.update({
                where: { id: houseId },
                data,
            });
            logger_1.default.info(`House updated: ${houseId}`);
            return house;
        }
        catch (error) {
            logger_1.default.error(`Error updating house: ${error}`);
            throw error;
        }
    }
    // Lock house for billing cycle
    async lockHouseForBilling(houseId) {
        try {
            const house = await prisma.house.update({
                where: { id: houseId },
                data: { isLocked: true },
            });
            logger_1.default.info(`House locked for billing: ${houseId}`);
            return house;
        }
        catch (error) {
            logger_1.default.error(`Error locking house: ${error}`);
            throw error;
        }
    }
    // Unlock house after billing
    async unlockHouse(houseId) {
        try {
            const house = await prisma.house.update({
                where: { id: houseId },
                data: { isLocked: false },
            });
            logger_1.default.info(`House unlocked: ${houseId}`);
            return house;
        }
        catch (error) {
            logger_1.default.error(`Error unlocking house: ${error}`);
            throw error;
        }
    }
    // Get houses by occupancy status
    async getHousesByStatus(status) {
        try {
            const houses = await prisma.house.findMany({
                where: { occupancyStatus: status },
                include: {
                    resident: true,
                    meter: true,
                },
            });
            return houses;
        }
        catch (error) {
            logger_1.default.error(`Error fetching houses by status: ${error}`);
            throw error;
        }
    }
    // Get vacant houses
    async getVacantHouses() {
        return this.getHousesByStatus(client_1.HouseStatus.VACANT);
    }
    // Get occupied houses
    async getOccupiedHouses() {
        return this.getHousesByStatus(client_1.HouseStatus.OCCUPIED);
    }
    // Delete house
    async deleteHouse(houseId) {
        try {
            await prisma.house.delete({
                where: { id: houseId },
            });
            logger_1.default.info(`House deleted: ${houseId}`);
        }
        catch (error) {
            logger_1.default.error(`Error deleting house: ${error}`);
            throw error;
        }
    }
}
exports.HouseService = HouseService;
exports.default = new HouseService();
//# sourceMappingURL=house.service.js.map