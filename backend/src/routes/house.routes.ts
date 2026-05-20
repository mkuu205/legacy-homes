import { Router } from "express";
import houseController from "../controllers/house.controller";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// House management routes
router.post("/", houseController.createHouse.bind(houseController));
router.get("/", houseController.getAllHouses.bind(houseController));
router.get("/vacant", houseController.getVacantHouses.bind(houseController));
router.get("/occupied", houseController.getOccupiedHouses.bind(houseController));
router.get("/:id", houseController.getHouseById.bind(houseController));
router.put("/:id", houseController.updateHouse.bind(houseController));
router.post("/:id/lock", houseController.lockHouseForBilling.bind(houseController));
router.post("/:id/unlock", houseController.unlockHouse.bind(houseController));
router.delete("/:id", houseController.deleteHouse.bind(houseController));

export default router;
