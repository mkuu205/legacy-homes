"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HouseController = void 0;
const house_service_1 = __importDefault(require("../services/house.service"));
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("../utils/logger"));
class HouseController {
    // Create house
    async createHouse(req, res) {
        try {
            const { houseNumber, occupancyStatus, notes } = req.body;
            if (!houseNumber) {
                res.status(400).json({ error: "House number is required" });
                return;
            }
            const house = await house_service_1.default.createHouse({
                houseNumber,
                occupancyStatus: occupancyStatus || client_1.HouseStatus.UNDER_CONSTRUCTION,
                notes,
            });
            res.status(201).json(house);
        }
        catch (error) {
            logger_1.default.error(`Error creating house: ${error}`);
            res.status(500).json({ error: "Failed to create house" });
        }
    }
    // Get all houses
    async getAllHouses(req, res) {
        try {
            const { occupancyStatus, isLocked, skip = 0, take = 100 } = req.query;
            const houses = await house_service_1.default.getAllHouses({
                occupancyStatus: occupancyStatus,
                isLocked: isLocked === "true",
                skip: parseInt(skip),
                take: parseInt(take),
            });
            res.json(houses);
        }
        catch (error) {
            logger_1.default.error(`Error fetching houses: ${error}`);
            res.status(500).json({ error: "Failed to fetch houses" });
        }
    }
    // Get house by ID
    async getHouseById(req, res) {
        try {
            const { id } = req.params;
            const house = await house_service_1.default.getHouseById(id);
            if (!house) {
                res.status(404).json({ error: "House not found" });
                return;
            }
            res.json(house);
        }
        catch (error) {
            logger_1.default.error(`Error fetching house: ${error}`);
            res.status(500).json({ error: "Failed to fetch house" });
        }
    }
    // Update house
    async updateHouse(req, res) {
        try {
            const { id } = req.params;
            const { occupancyStatus, notes, isLocked } = req.body;
            const house = await house_service_1.default.updateHouse(id, {
                occupancyStatus,
                notes,
                isLocked,
            });
            res.json(house);
        }
        catch (error) {
            logger_1.default.error(`Error updating house: ${error}`);
            res.status(500).json({ error: "Failed to update house" });
        }
    }
    // Lock house for billing
    async lockHouseForBilling(req, res) {
        try {
            const { id } = req.params;
            const house = await house_service_1.default.lockHouseForBilling(id);
            res.json(house);
        }
        catch (error) {
            logger_1.default.error(`Error locking house: ${error}`);
            res.status(500).json({ error: "Failed to lock house" });
        }
    }
    // Unlock house
    async unlockHouse(req, res) {
        try {
            const { id } = req.params;
            const house = await house_service_1.default.unlockHouse(id);
            res.json(house);
        }
        catch (error) {
            logger_1.default.error(`Error unlocking house: ${error}`);
            res.status(500).json({ error: "Failed to unlock house" });
        }
    }
    // Get vacant houses
    async getVacantHouses(req, res) {
        try {
            const houses = await house_service_1.default.getVacantHouses();
            res.json(houses);
        }
        catch (error) {
            logger_1.default.error(`Error fetching vacant houses: ${error}`);
            res.status(500).json({ error: "Failed to fetch vacant houses" });
        }
    }
    // Get occupied houses
    async getOccupiedHouses(req, res) {
        try {
            const houses = await house_service_1.default.getOccupiedHouses();
            res.json(houses);
        }
        catch (error) {
            logger_1.default.error(`Error fetching occupied houses: ${error}`);
            res.status(500).json({ error: "Failed to fetch occupied houses" });
        }
    }
    // Delete house
    async deleteHouse(req, res) {
        try {
            const { id } = req.params;
            await house_service_1.default.deleteHouse(id);
            res.json({ message: "House deleted successfully" });
        }
        catch (error) {
            logger_1.default.error(`Error deleting house: ${error}`);
            res.status(500).json({ error: "Failed to delete house" });
        }
    }
}
exports.HouseController = HouseController;
exports.default = new HouseController();
//# sourceMappingURL=house.controller.js.map