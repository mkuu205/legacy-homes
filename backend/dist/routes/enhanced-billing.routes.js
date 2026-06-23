"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const enhanced_billing_controller_1 = __importDefault(require("../controllers/enhanced-billing.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// Enhanced billing routes
router.post("/:billId/lock", enhanced_billing_controller_1.default.lockBill.bind(enhanced_billing_controller_1.default));
router.post("/:billId/unlock", enhanced_billing_controller_1.default.unlockBill.bind(enhanced_billing_controller_1.default));
router.post("/:residentId/final-bill", enhanced_billing_controller_1.default.createFinalBill.bind(enhanced_billing_controller_1.default));
router.get("/locked", enhanced_billing_controller_1.default.getLockedBills.bind(enhanced_billing_controller_1.default));
router.get("/unpaid-collection", enhanced_billing_controller_1.default.getUnpaidBillsForCollection.bind(enhanced_billing_controller_1.default));
router.get("/overdue", enhanced_billing_controller_1.default.getOverdueBills.bind(enhanced_billing_controller_1.default));
router.get("/stats", enhanced_billing_controller_1.default.getCollectionStats.bind(enhanced_billing_controller_1.default));
router.get("/performance", enhanced_billing_controller_1.default.getCollectionPerformanceByMonth.bind(enhanced_billing_controller_1.default));
router.post("/bulk/lock-cycle", enhanced_billing_controller_1.default.bulkLockBillsForCycle.bind(enhanced_billing_controller_1.default));
router.post("/bulk/unlock-cycle", enhanced_billing_controller_1.default.bulkUnlockBillsForCycle.bind(enhanced_billing_controller_1.default));
// Collection routes
router.get("/collection/metrics", enhanced_billing_controller_1.default.getCollectionMetrics.bind(enhanced_billing_controller_1.default));
router.get("/collection/top-debtors", enhanced_billing_controller_1.default.getTopDebtors.bind(enhanced_billing_controller_1.default));
router.get("/collection/efficiency-score", enhanced_billing_controller_1.default.getCollectionEfficiencyScore.bind(enhanced_billing_controller_1.default));
router.get("/collection/:residentId/status", enhanced_billing_controller_1.default.getResidentCollectionStatus.bind(enhanced_billing_controller_1.default));
router.get("/collection/:billId/timeline", enhanced_billing_controller_1.default.getCollectionTimeline.bind(enhanced_billing_controller_1.default));
exports.default = router;
//# sourceMappingURL=enhanced-billing.routes.js.map