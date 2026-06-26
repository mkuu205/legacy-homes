"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditSearchSettingsController = void 0;
const audit_service_1 = require("../services/audit.service");
const search_service_1 = require("../services/search.service");
const settings_service_1 = require("../services/settings.service");
const logger_1 = require("../utils/logger");
class AuditSearchSettingsController {
    // ─── AUDIT LOGGING ───
    // Get audit logs
    async getAuditLogs(req, res) {
        try {
            const { userId, action, resource, startDate, endDate, skip = 0, take = 50 } = req.query;
            const logs = await audit_service_1.auditService.getAuditLogs({
                userId: userId,
                action: action,
                resource: resource,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                skip: parseInt(skip),
                take: parseInt(take),
            });
            res.json(logs);
        }
        catch (error) {
            logger_1.logger.error(`Error fetching audit logs: ${error}`);
            res.status(500).json({ error: "Failed to fetch audit logs" });
        }
    }
    // Get audit logs by user
    async getAuditLogsByUser(req, res) {
        try {
            const { userId } = req.params;
            const { skip = 0, take = 50 } = req.query;
            const logs = await audit_service_1.auditService.getAuditLogsByUser(userId, parseInt(skip), parseInt(take));
            res.json(logs);
        }
        catch (error) {
            logger_1.logger.error(`Error fetching user audit logs: ${error}`);
            res.status(500).json({ error: "Failed to fetch logs" });
        }
    }
    // Get resource audit trail
    async getResourceAuditTrail(req, res) {
        try {
            const { resourceId } = req.params;
            const trail = await audit_service_1.auditService.getResourceAuditTrail(resourceId);
            res.json(trail);
        }
        catch (error) {
            logger_1.logger.error(`Error fetching resource audit trail: ${error}`);
            res.status(500).json({ error: "Failed to fetch trail" });
        }
    }
    // Get audit statistics
    async getAuditStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const stats = await audit_service_1.auditService.getAuditStats(startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
            res.json(stats);
        }
        catch (error) {
            logger_1.logger.error(`Error getting audit stats: ${error}`);
            res.status(500).json({ error: "Failed to get stats" });
        }
    }
    // Search audit logs
    async searchAuditLogs(req, res) {
        try {
            const { query, skip = 0, take = 50 } = req.query;
            if (!query) {
                res.status(400).json({ error: "Search query is required" });
                return;
            }
            const logs = await audit_service_1.auditService.searchAuditLogs(query, parseInt(skip), parseInt(take));
            res.json(logs);
        }
        catch (error) {
            logger_1.logger.error(`Error searching audit logs: ${error}`);
            res.status(500).json({ error: "Failed to search logs" });
        }
    }
    // ─── ADVANCED SEARCH ───
    // Global search
    async globalSearch(req, res) {
        try {
            const { query, skip = 0, take = 50 } = req.query;
            if (!query) {
                res.status(400).json({ error: "Search query is required" });
                return;
            }
            const results = await search_service_1.searchService.globalSearch(query, parseInt(skip), parseInt(take));
            res.json(results);
        }
        catch (error) {
            logger_1.logger.error(`Error performing global search: ${error}`);
            res.status(500).json({ error: "Failed to search" });
        }
    }
    // Advanced search
    async advancedSearch(req, res) {
        try {
            const { type, query, status, startDate, endDate, skip = 0, take = 50 } = req.query;
            if (!type) {
                res.status(400).json({ error: "Search type is required" });
                return;
            }
            const results = await search_service_1.searchService.advancedSearch({
                type: type,
                query: query,
                status: status,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                skip: parseInt(skip),
                take: parseInt(take),
            });
            res.json(results);
        }
        catch (error) {
            logger_1.logger.error(`Error performing advanced search: ${error}`);
            res.status(500).json({ error: "Failed to search" });
        }
    }
    // ─── SYSTEM SETTINGS ───
    // Get all settings
    async getAllSettings(req, res) {
        try {
            const settings = await settings_service_1.settingsService.getAllSettings();
            res.json(settings);
        }
        catch (error) {
            logger_1.logger.error(`Error fetching settings: ${error}`);
            res.status(500).json({ error: "Failed to fetch settings" });
        }
    }
    // Get billing settings
    async getBillingSettings(req, res) {
        try {
            const settings = await settings_service_1.settingsService.getBillingSettings();
            res.json(settings);
        }
        catch (error) {
            logger_1.logger.error(`Error fetching billing settings: ${error}`);
            res.status(500).json({ error: "Failed to fetch settings" });
        }
    }
    // Update billing settings
    async updateBillingSettings(req, res) {
        try {
            const { unitRate, standingCharge, vatRate, billingCycle, dueDays } = req.body;
            await settings_service_1.settingsService.updateBillingSettings({
                unitRate,
                standingCharge,
                vatRate,
                billingCycle,
                dueDays,
            });
            res.json({ message: "Billing settings updated" });
        }
        catch (error) {
            logger_1.logger.error(`Error updating billing settings: ${error}`);
            res.status(500).json({ error: "Failed to update settings" });
        }
    }
    // Get notification settings
    async getNotificationSettings(req, res) {
        try {
            const settings = await settings_service_1.settingsService.getNotificationSettings();
            res.json(settings);
        }
        catch (error) {
            logger_1.logger.error(`Error fetching notification settings: ${error}`);
            res.status(500).json({ error: "Failed to fetch settings" });
        }
    }
    // Update notification settings
    async updateNotificationSettings(req, res) {
        try {
            const { emailNotifications, smsNotifications, inAppNotifications, paymentReminders, billingReminders } = req.body;
            await settings_service_1.settingsService.updateNotificationSettings({
                emailNotifications,
                smsNotifications,
                inAppNotifications,
                paymentReminders,
                billingReminders,
            });
            res.json({ message: "Notification settings updated" });
        }
        catch (error) {
            logger_1.logger.error(`Error updating notification settings: ${error}`);
            res.status(500).json({ error: "Failed to update settings" });
        }
    }
    // Get security settings
    async getSecuritySettings(req, res) {
        try {
            const settings = await settings_service_1.settingsService.getSecuritySettings();
            res.json(settings);
        }
        catch (error) {
            logger_1.logger.error(`Error fetching security settings: ${error}`);
            res.status(500).json({ error: "Failed to fetch settings" });
        }
    }
    // Update security settings
    async updateSecuritySettings(req, res) {
        try {
            const { passwordMinLength, sessionTimeout, maxLoginAttempts, twoFactorEnabled } = req.body;
            await settings_service_1.settingsService.updateSecuritySettings({
                passwordMinLength,
                sessionTimeout,
                maxLoginAttempts,
                twoFactorEnabled,
            });
            res.json({ message: "Security settings updated" });
        }
        catch (error) {
            logger_1.logger.error(`Error updating security settings: ${error}`);
            res.status(500).json({ error: "Failed to update settings" });
        }
    }
}
exports.AuditSearchSettingsController = AuditSearchSettingsController;
exports.default = new AuditSearchSettingsController();
//# sourceMappingURL=audit-search-settings.controller.js.map