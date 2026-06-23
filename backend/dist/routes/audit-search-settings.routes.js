"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_search_settings_controller_1 = __importDefault(require("../controllers/audit-search-settings.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// ─── AUDIT LOGGING ROUTES ───
router.get("/audit/logs", audit_search_settings_controller_1.default.getAuditLogs.bind(audit_search_settings_controller_1.default));
router.get("/audit/user/:userId", audit_search_settings_controller_1.default.getAuditLogsByUser.bind(audit_search_settings_controller_1.default));
router.get("/audit/resource/:resourceId", audit_search_settings_controller_1.default.getResourceAuditTrail.bind(audit_search_settings_controller_1.default));
router.get("/audit/stats", audit_search_settings_controller_1.default.getAuditStats.bind(audit_search_settings_controller_1.default));
router.get("/audit/search", audit_search_settings_controller_1.default.searchAuditLogs.bind(audit_search_settings_controller_1.default));
// ─── SEARCH ROUTES ───
router.get("/search/global", audit_search_settings_controller_1.default.globalSearch.bind(audit_search_settings_controller_1.default));
router.get("/search/advanced", audit_search_settings_controller_1.default.advancedSearch.bind(audit_search_settings_controller_1.default));
// ─── SETTINGS ROUTES ───
router.get("/settings/all", audit_search_settings_controller_1.default.getAllSettings.bind(audit_search_settings_controller_1.default));
// Billing settings
router.get("/settings/billing", audit_search_settings_controller_1.default.getBillingSettings.bind(audit_search_settings_controller_1.default));
router.put("/settings/billing", audit_search_settings_controller_1.default.updateBillingSettings.bind(audit_search_settings_controller_1.default));
// Notification settings
router.get("/settings/notifications", audit_search_settings_controller_1.default.getNotificationSettings.bind(audit_search_settings_controller_1.default));
router.put("/settings/notifications", audit_search_settings_controller_1.default.updateNotificationSettings.bind(audit_search_settings_controller_1.default));
// Security settings
router.get("/settings/security", audit_search_settings_controller_1.default.getSecuritySettings.bind(audit_search_settings_controller_1.default));
router.put("/settings/security", audit_search_settings_controller_1.default.updateSecuritySettings.bind(audit_search_settings_controller_1.default));
exports.default = router;
//# sourceMappingURL=audit-search-settings.routes.js.map