import { PrismaClient, House, RegistrationStatus, HouseStatus } from "@prisma/client";
import logger from "../utils/logger";

const prisma = new PrismaClient();

export class HouseService {
  // Create a new house
  async createHouse(data: {
    houseNumber: string;
    occupancyStatus?: HouseStatus;
    notes?: string;
  }): Promise<House> {
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
          occupancyStatus: data.occupancyStatus || HouseStatus.UNDER_CONSTRUCTION,
          notes: data.notes,
        },
      });

      logger.info(`House created: ${house.id}`);
      return house;
    } catch (error) {
      logger.error(`Error creating house: ${error}`);
      throw error;
    }
  }

  // Get all houses with optional filtering
  async getAllHouses(filters?: {
    occupancyStatus?: HouseStatus;
    isLocked?: boolean;
    skip?: number;
    take?: number;
  }): Promise<House[]> {
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
    } catch (error) {
      logger.error(`Error fetching houses: ${error}`);
      throw error;
    }
  }

  // Get house by ID
  async getHouseById(houseId: string): Promise<House | null> {
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
    } catch (error) {
      logger.error(`Error fetching house: ${error}`);
      throw error;
    }
  }

  // Update house
  async updateHouse(
    houseId: string,
    data: {
      occupancyStatus?: HouseStatus;
      notes?: string;
      isLocked?: boolean;
    }
  ): Promise<House> {
    try {
      const house = await prisma.house.update({
        where: { id: houseId },
        data,
      });

      logger.info(`House updated: ${houseId}`);
      return house;
    } catch (error) {
      logger.error(`Error updating house: ${error}`);
      throw error;
    }
  }

  // Lock house for billing cycle
  async lockHouseForBilling(houseId: string): Promise<House> {
    try {
      const house = await prisma.house.update({
        where: { id: houseId },
        data: { isLocked: true },
      });

      logger.info(`House locked for billing: ${houseId}`);
      return house;
    } catch (error) {
      logger.error(`Error locking house: ${error}`);
      throw error;
    }
  }

  // Unlock house after billing
  async unlockHouse(houseId: string): Promise<House> {
    try {
      const house = await prisma.house.update({
        where: { id: houseId },
        data: { isLocked: false },
      });

      logger.info(`House unlocked: ${houseId}`);
      return house;
    } catch (error) {
      logger.error(`Error unlocking house: ${error}`);
      throw error;
    }
  }

  // Get houses by occupancy status
  async getHousesByStatus(status: HouseStatus): Promise<House[]> {
    try {
      const houses = await prisma.house.findMany({
        where: { occupancyStatus: status },
        include: {
          resident: true,
          meter: true,
        },
      });

      return houses;
    } catch (error) {
      logger.error(`Error fetching houses by status: ${error}`);
      throw error;
    }
  }

  // Get vacant houses
  async getVacantHouses(): Promise<House[]> {
    return this.getHousesByStatus(HouseStatus.VACANT);
  }

  // Get occupied houses
  async getOccupiedHouses(): Promise<House[]> {
    return this.getHousesByStatus(HouseStatus.OCCUPIED);
  }

  // Delete house
  async deleteHouse(houseId: string): Promise<void> {
    try {
      await prisma.house.delete({
        where: { id: houseId },
      });

      logger.info(`House deleted: ${houseId}`);
    } catch (error) {
      logger.error(`Error deleting house: ${error}`);
      throw error;
    }
  }
}

export default new HouseService();
