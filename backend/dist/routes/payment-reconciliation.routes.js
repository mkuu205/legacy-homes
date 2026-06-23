"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_reconciliation_controller_1 = __importDefault(require("../controllers/payment-reconciliation.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// Payment reconciliation routes
router.get("/unreconciled", payment_reconciliation_controller_1.default.getUnreconciledPayments.bind(payment_reconciliation_controller_1.default));
router.get("/mismatched", payment_reconciliation_controller_1.default.getMismatchedPayments.bind(payment_reconciliation_controller_1.default));
router.get("/orphaned", payment_reconciliation_controller_1.default.getOrphanedPayments.bind(payment_reconciliation_controller_1.default));
router.get("/stats", payment_reconciliation_controller_1.default.getReconciliationStats.bind(payment_reconciliation_controller_1.default));
router.get("/report", payment_reconciliation_controller_1.default.generateReconciliationReport.bind(payment_reconciliation_controller_1.default));
router.post("/:paymentId/reconcile", payment_reconciliation_controller_1.default.reconcilePayment.bind(payment_reconciliation_controller_1.default));
router.post("/auto-reconcile", payment_reconciliation_controller_1.default.autoReconcilePayments.bind(payment_reconciliation_controller_1.default));
router.post("/bulk-reconcile", payment_reconciliation_controller_1.default.bulkReconcilePayments.bind(payment_reconciliation_controller_1.default));
exports.default = router;
//# sourceMappingURL=payment-reconciliation.routes.js.map