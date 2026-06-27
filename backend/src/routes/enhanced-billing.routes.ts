import { Router } from "express";
import enhancedBillingController from "../controllers/enhanced-billing.controller";
import { authMiddleware } from "../middleware/auth";

const router: import("express").Router = Router();

// All routes require authentication
router.use(authMiddleware);

// Enhanced billing routes
router.post("/:billId/lock", enhancedBillingController.lockBill.bind(enhancedBillingController));
router.post("/:billId/unlock", enhancedBillingController.unlockBill.bind(enhancedBillingController));
router.post("/:residentId/final-bill", enhancedBillingController.createFinalBill.bind(enhancedBillingController));

router.get("/locked", enhancedBillingController.getLockedBills.bind(enhancedBillingController));
router.get("/unpaid-collection", enhancedBillingController.getUnpaidBillsForCollection.bind(enhancedBillingController));
router.get("/overdue", enhancedBillingController.getOverdueBills.bind(enhancedBillingController));
router.get("/stats", enhancedBillingController.getCollectionStats.bind(enhancedBillingController));
router.get("/performance", enhancedBillingController.getCollectionPerformanceByMonth.bind(enhancedBillingController));

router.post("/bulk/lock-cycle", enhancedBillingController.bulkLockBillsForCycle.bind(enhancedBillingController));
router.post("/bulk/unlock-cycle", enhancedBillingController.bulkUnlockBillsForCycle.bind(enhancedBillingController));

// Collection routes
router.get("/collection/metrics", enhancedBillingController.getCollectionMetrics.bind(enhancedBillingController));
router.get("/collection/top-debtors", enhancedBillingController.getTopDebtors.bind(enhancedBillingController));
router.get("/collection/efficiency-score", enhancedBillingController.getCollectionEfficiencyScore.bind(enhancedBillingController));
router.get("/collection/:residentId/status", enhancedBillingController.getResidentCollectionStatus.bind(enhancedBillingController));
router.get("/collection/:billId/timeline", enhancedBillingController.getCollectionTimeline.bind(enhancedBillingController));

export default router;
