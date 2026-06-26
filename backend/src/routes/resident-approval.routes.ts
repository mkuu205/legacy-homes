import { Router } from "express";
import residentApprovalController from "../controllers/resident-approval.controller";
import { authMiddleware } from "../middleware/auth";

const router: import("express").Router = Router();

// All routes require authentication
router.use(authMiddleware);

// Resident approval routes
router.get("/applications/pending", residentApprovalController.getPendingApplications.bind(residentApprovalController));
router.get("/applications/approved", residentApprovalController.getApprovedResidents.bind(residentApprovalController));
router.get("/applications/rejected", residentApprovalController.getRejectedResidents.bind(residentApprovalController));
router.get("/applications/counts", residentApprovalController.getApplicationCounts.bind(residentApprovalController));

router.post("/:residentId/approve", residentApprovalController.approveResident.bind(residentApprovalController));
router.post("/:residentId/reject", residentApprovalController.rejectResident.bind(residentApprovalController));
router.post("/:residentId/assign-house", residentApprovalController.assignHouseToResident.bind(residentApprovalController));
router.post("/:residentId/unassign-house", residentApprovalController.unassignHouseFromResident.bind(residentApprovalController));

router.post("/bulk/approve", residentApprovalController.bulkApproveResidents.bind(residentApprovalController));
router.post("/bulk/reject", residentApprovalController.bulkRejectResidents.bind(residentApprovalController));

export default router;
