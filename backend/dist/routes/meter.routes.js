"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const meter_controller_1 = require("../controllers/meter.controller");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: '/tmp/uploads/', limits: { fileSize: 5 * 1024 * 1024 } });
// Resident routes
router.get('/my-meter', auth_1.authenticate, meter_controller_1.meterController.getMyMeter.bind(meter_controller_1.meterController));
// Admin/Officer routes
router.get('/export/csv', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), meter_controller_1.meterController.exportCSV.bind(meter_controller_1.meterController));
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), meter_controller_1.meterController.getAll.bind(meter_controller_1.meterController));
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), meter_controller_1.meterController.create.bind(meter_controller_1.meterController));
router.get('/:id', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), meter_controller_1.meterController.getById.bind(meter_controller_1.meterController));
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), meter_controller_1.meterController.update.bind(meter_controller_1.meterController));
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), meter_controller_1.meterController.deleteMeter.bind(meter_controller_1.meterController));
router.get('/:id/readings', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), meter_controller_1.meterController.getReadingHistory.bind(meter_controller_1.meterController));
router.post('/:id/readings', auth_1.authenticate, (0, auth_1.authorize)('SUPER_ADMIN'), upload.single('photo'), meter_controller_1.meterController.addReading.bind(meter_controller_1.meterController));
exports.default = router;
//# sourceMappingURL=meter.routes.js.map