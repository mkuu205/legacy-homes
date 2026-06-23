import { Request, Response } from "express";
import houseService from "../services/house.service";
import { HouseStatus } from "@prisma/client";
import logger from "../utils/logger";

export class HouseController {
  // Create house
  async createHouse(req: Request, res: Response): Promise<void> {
    try {
      const { houseNumber, occupancyStatus, notes } = req.body;

      if (!houseNumber) {
        res.status(400).json({ error: "House number is required" });
        return;
      }

      const house = await houseService.createHouse({
        houseNumber,
        occupancyStatus: occupancyStatus || HouseStatus.UNDER_CONSTRUCTION,
        notes,
      });

      res.status(201).json(house);
    } catch (error) {
      logger.error(`Error creating house: ${error}`);
      res.status(500).json({ error: "Failed to create house" });
    }
  }

  // Get all houses
  async getAllHouses(req: Request, res: Response): Promise<void> {
    try {
      const { occupancyStatus, isLocked, skip = 0, take = 100 } = req.query;

      const houses = await houseService.getAllHouses({
        occupancyStatus: occupancyStatus as HouseStatus,
        isLocked: isLocked === "true",
        skip: parseInt(skip as string),
        take: parseInt(take as string),
      });

      res.json(houses);
    } catch (error) {
      logger.error(`Error fetching houses: ${error}`);
      res.status(500).json({ error: "Failed to fetch houses" });
    }
  }

  // Get house by ID
  async getHouseById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const house = await houseService.getHouseById(id as string);

      if (!house) {
        res.status(404).json({ error: "House not found" });
        return;
      }

      res.json(house);
    } catch (error) {
      logger.error(`Error fetching house: ${error}`);
      res.status(500).json({ error: "Failed to fetch house" });
    }
  }

  // Update house
  async updateHouse(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { occupancyStatus, notes, isLocked } = req.body;

      const house = await houseService.updateHouse(id as string, {
        occupancyStatus,
        notes,
        isLocked,
      });

      res.json(house);
    } catch (error) {
      logger.error(`Error updating house: ${error}`);
      res.status(500).json({ error: "Failed to update house" });
    }
  }

  // Lock house for billing
  async lockHouseForBilling(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const house = await houseService.lockHouseForBilling(id as string);

      res.json(house);
    } catch (error) {
      logger.error(`Error locking house: ${error}`);
      res.status(500).json({ error: "Failed to lock house" });
    }
  }

  // Unlock house
  async unlockHouse(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const house = await houseService.unlockHouse(id as string);

      res.json(house);
    } catch (error) {
      logger.error(`Error unlocking house: ${error}`);
      res.status(500).json({ error: "Failed to unlock house" });
    }
  }

  // Get vacant houses
  async getVacantHouses(req: Request, res: Response): Promise<void> {
    try {
      const houses = await houseService.getVacantHouses();

      res.json(houses);
    } catch (error) {
      logger.error(`Error fetching vacant houses: ${error}`);
      res.status(500).json({ error: "Failed to fetch vacant houses" });
    }
  }

  // Get occupied houses
  async getOccupiedHouses(req: Request, res: Response): Promise<void> {
    try {
      const houses = await houseService.getOccupiedHouses();

      res.json(houses);
    } catch (error) {
      logger.error(`Error fetching occupied houses: ${error}`);
      res.status(500).json({ error: "Failed to fetch occupied houses" });
    }
  }

  // Delete house
  async deleteHouse(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await houseService.deleteHouse(id as string);

      res.json({ message: "House deleted successfully" });
    } catch (error) {
      logger.error(`Error deleting house: ${error}`);
      res.status(500).json({ error: "Failed to delete house" });
    }
  }
}

export default new HouseController();
