import { Request, Response } from "express";
import { auditService } from "../services/audit.service";
import { searchService } from "../services/search.service";
import { settingsService } from "../services/settings.service";
import { logger } from "../utils/logger";

export class AuditSearchSettingsController {
  // ─── AUDIT LOGGING ───

  // Get audit logs
  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { userId, action, resource, startDate, endDate, skip = 0, take = 50 } = req.query;

      const logs = await auditService.getAuditLogs({
        userId: userId as string,
        action: action as string,
        resource: resource as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        skip: parseInt(skip as string),
        take: parseInt(take as string),
      });

      res.json(logs);
    } catch (error) {
      logger.error(`Error fetching audit logs: ${error}`);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  }

  // Get audit logs by user
  async getAuditLogsByUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { skip = 0, take = 50 } = req.query;

      const logs = await auditService.getAuditLogsByUser(
        userId as string,
        parseInt(skip as string),
        parseInt(take as string)
      );

      res.json(logs);
    } catch (error) {
      logger.error(`Error fetching user audit logs: ${error}`);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  }

  // Get resource audit trail
  async getResourceAuditTrail(req: Request, res: Response): Promise<void> {
    try {
      const { resourceId } = req.params;

      const trail = await auditService.getResourceAuditTrail(resourceId as string);

      res.json(trail);
    } catch (error) {
      logger.error(`Error fetching resource audit trail: ${error}`);
      res.status(500).json({ error: "Failed to fetch trail" });
    }
  }

  // Get audit statistics
  async getAuditStats(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const stats = await auditService.getAuditStats(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json(stats);
    } catch (error) {
      logger.error(`Error getting audit stats: ${error}`);
      res.status(500).json({ error: "Failed to get stats" });
    }
  }

  // Search audit logs
  async searchAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { query, skip = 0, take = 50 } = req.query;

      if (!query) {
        res.status(400).json({ error: "Search query is required" });
        return;
      }

      const logs = await auditService.searchAuditLogs(
        query as string,
        parseInt(skip as string),
        parseInt(take as string)
      );

      res.json(logs);
    } catch (error) {
      logger.error(`Error searching audit logs: ${error}`);
      res.status(500).json({ error: "Failed to search logs" });
    }
  }

  // ─── ADVANCED SEARCH ───

  // Global search
  async globalSearch(req: Request, res: Response): Promise<void> {
    try {
      const { query, skip = 0, take = 50 } = req.query;

      if (!query) {
        res.status(400).json({ error: "Search query is required" });
        return;
      }

      const results = await searchService.globalSearch(
        query as string,
        parseInt(skip as string),
        parseInt(take as string)
      );

      res.json(results);
    } catch (error) {
      logger.error(`Error performing global search: ${error}`);
      res.status(500).json({ error: "Failed to search" });
    }
  }

  // Advanced search
  async advancedSearch(req: Request, res: Response): Promise<void> {
    try {
      const { type, query, status, startDate, endDate, skip = 0, take = 50 } = req.query;

      if (!type) {
        res.status(400).json({ error: "Search type is required" });
        return;
      }

      const results = await searchService.advancedSearch({
        type: type as any,
        query: query as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        skip: parseInt(skip as string),
        take: parseInt(take as string),
      });

      res.json(results);
    } catch (error) {
      logger.error(`Error performing advanced search: ${error}`);
      res.status(500).json({ error: "Failed to search" });
    }
  }

  // ─── SYSTEM SETTINGS ───

  // Get all settings
  async getAllSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await settingsService.getAllSettings();

      res.json(settings);
    } catch (error) {
      logger.error(`Error fetching settings: ${error}`);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  }

  // Get billing settings
  async getBillingSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await settingsService.getBillingSettings();

      res.json(settings);
    } catch (error) {
      logger.error(`Error fetching billing settings: ${error}`);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  }

  // Update billing settings
  async updateBillingSettings(req: Request, res: Response): Promise<void> {
    try {
      const { unitRate, standingCharge, vatRate, billingCycle, dueDays } = req.body;

      await settingsService.updateBillingSettings({
        unitRate,
        standingCharge,
        vatRate,
        billingCycle,
        dueDays,
      });

      res.json({ message: "Billing settings updated" });
    } catch (error) {
      logger.error(`Error updating billing settings: ${error}`);
      res.status(500).json({ error: "Failed to update settings" });
    }
  }

  // Get notification settings
  async getNotificationSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await settingsService.getNotificationSettings();

      res.json(settings);
    } catch (error) {
      logger.error(`Error fetching notification settings: ${error}`);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  }

  // Update notification settings
  async updateNotificationSettings(req: Request, res: Response): Promise<void> {
    try {
      const { emailNotifications, smsNotifications, inAppNotifications, paymentReminders, billingReminders } = req.body;

      await settingsService.updateNotificationSettings({
        emailNotifications,
        smsNotifications,
        inAppNotifications,
        paymentReminders,
        billingReminders,
      });

      res.json({ message: "Notification settings updated" });
    } catch (error) {
      logger.error(`Error updating notification settings: ${error}`);
      res.status(500).json({ error: "Failed to update settings" });
    }
  }

  // Get security settings
  async getSecuritySettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await settingsService.getSecuritySettings();

      res.json(settings);
    } catch (error) {
      logger.error(`Error fetching security settings: ${error}`);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  }

  // Update security settings
  async updateSecuritySettings(req: Request, res: Response): Promise<void> {
    try {
      const { passwordMinLength, sessionTimeout, maxLoginAttempts, twoFactorEnabled } = req.body;

      await settingsService.updateSecuritySettings({
        passwordMinLength,
        sessionTimeout,
        maxLoginAttempts,
        twoFactorEnabled,
      });

      res.json({ message: "Security settings updated" });
    } catch (error) {
      logger.error(`Error updating security settings: ${error}`);
      res.status(500).json({ error: "Failed to update settings" });
    }
  }
}

export default new AuditSearchSettingsController();
