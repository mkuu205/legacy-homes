import { Router } from "express";
import controller from "../controllers/audit-search-settings.controller";
import { authMiddleware } from "../middleware/auth";

const router: import("express").Router = Router();

// All routes require authentication
router.use(authMiddleware);

// ─── AUDIT LOGGING ROUTES ───
router.get("/audit/logs", controller.getAuditLogs.bind(controller));
router.get("/audit/user/:userId", controller.getAuditLogsByUser.bind(controller));
router.get("/audit/resource/:resourceId", controller.getResourceAuditTrail.bind(controller));
router.get("/audit/stats", controller.getAuditStats.bind(controller));
router.get("/audit/search", controller.searchAuditLogs.bind(controller));

// ─── SEARCH ROUTES ───
router.get("/search/global", controller.globalSearch.bind(controller));
router.get("/search/advanced", controller.advancedSearch.bind(controller));

// ─── SETTINGS ROUTES ───
router.get("/settings/all", controller.getAllSettings.bind(controller));

// Billing settings
router.get("/settings/billing", controller.getBillingSettings.bind(controller));
router.put("/settings/billing", controller.updateBillingSettings.bind(controller));

// Notification settings
router.get("/settings/notifications", controller.getNotificationSettings.bind(controller));
router.put("/settings/notifications", controller.updateNotificationSettings.bind(controller));

// Security settings
router.get("/settings/security", controller.getSecuritySettings.bind(controller));
router.put("/settings/security", controller.updateSecuritySettings.bind(controller));

export default router;
