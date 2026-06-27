import { Router } from "express";
import paymentReconciliationController from "../controllers/payment-reconciliation.controller";
import { authMiddleware } from "../middleware/auth";

const router: import("express").Router = Router();

// All routes require authentication
router.use(authMiddleware);

// Payment reconciliation routes
router.get("/unreconciled", paymentReconciliationController.getUnreconciledPayments.bind(paymentReconciliationController));
router.get("/mismatched", paymentReconciliationController.getMismatchedPayments.bind(paymentReconciliationController));
router.get("/orphaned", paymentReconciliationController.getOrphanedPayments.bind(paymentReconciliationController));
router.get("/stats", paymentReconciliationController.getReconciliationStats.bind(paymentReconciliationController));
router.get("/report", paymentReconciliationController.generateReconciliationReport.bind(paymentReconciliationController));

router.post("/:paymentId/reconcile", paymentReconciliationController.reconcilePayment.bind(paymentReconciliationController));
router.post("/auto-reconcile", paymentReconciliationController.autoReconcilePayments.bind(paymentReconciliationController));
router.post("/bulk-reconcile", paymentReconciliationController.bulkReconcilePayments.bind(paymentReconciliationController));

export default router;
