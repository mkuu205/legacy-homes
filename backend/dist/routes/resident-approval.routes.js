"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const resident_approval_controller_1 = __importDefault(require("../controllers/resident-approval.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// Resident approval routes
router.get("/applications/pending", resident_approval_controller_1.default.getPendingApplications.bind(resident_approval_controller_1.default));
router.get("/applications/approved", resident_approval_controller_1.default.getApprovedResidents.bind(resident_approval_controller_1.default));
router.get("/applications/rejected", resident_approval_controller_1.default.getRejectedResidents.bind(resident_approval_controller_1.default));
router.get("/applications/counts", resident_approval_controller_1.default.getApplicationCounts.bind(resident_approval_controller_1.default));
router.post("/:residentId/approve", resident_approval_controller_1.default.approveResident.bind(resident_approval_controller_1.default));
router.post("/:residentId/reject", resident_approval_controller_1.default.rejectResident.bind(resident_approval_controller_1.default));
router.post("/:residentId/assign-house", resident_approval_controller_1.default.assignHouseToResident.bind(resident_approval_controller_1.default));
router.post("/:residentId/unassign-house", resident_approval_controller_1.default.unassignHouseFromResident.bind(resident_approval_controller_1.default));
router.post("/bulk/approve", resident_approval_controller_1.default.bulkApproveResidents.bind(resident_approval_controller_1.default));
router.post("/bulk/reject", resident_approval_controller_1.default.bulkRejectResidents.bind(resident_approval_controller_1.default));
exports.default = router;
//# sourceMappingURL=resident-approval.routes.js.map