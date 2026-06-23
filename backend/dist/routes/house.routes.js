"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const house_controller_1 = __importDefault(require("../controllers/house.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// House management routes
router.post("/", house_controller_1.default.createHouse.bind(house_controller_1.default));
router.get("/", house_controller_1.default.getAllHouses.bind(house_controller_1.default));
router.get("/vacant", house_controller_1.default.getVacantHouses.bind(house_controller_1.default));
router.get("/occupied", house_controller_1.default.getOccupiedHouses.bind(house_controller_1.default));
router.get("/:id", house_controller_1.default.getHouseById.bind(house_controller_1.default));
router.put("/:id", house_controller_1.default.updateHouse.bind(house_controller_1.default));
router.post("/:id/lock", house_controller_1.default.lockHouseForBilling.bind(house_controller_1.default));
router.post("/:id/unlock", house_controller_1.default.unlockHouse.bind(house_controller_1.default));
router.delete("/:id", house_controller_1.default.deleteHouse.bind(house_controller_1.default));
exports.default = router;
//# sourceMappingURL=house.routes.js.map