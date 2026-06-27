import { PrismaClient, AuditLog } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

export class AuditService {
  // Log an action
  async logAction(data: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          details: data.details,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });

      logger.info(`Audit log created: ${auditLog.id}`);
      return auditLog;
    } catch (error) {
      logger.error(`Error creating audit log: ${error}`);
      throw error;
    }
  }

  // Get audit logs
  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
  }): Promise<AuditLog[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          userId: filters?.userId,
          action: filters?.action,
          resource: filters?.resource,
          createdAt: {
            gte: filters?.startDate,
            lte: filters?.endDate,
          },
        },
        skip: Number.parseInt(String(filters?.skip || 0), 10),
        take: Number.parseInt(String(filters?.take || 100), 10),
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return logs;
    } catch (error) {
      logger.error(`Error fetching audit logs: ${error}`);
      throw error;
    }
  }

  // Get audit logs by user
  async getAuditLogsByUser(userId: string, skip = 0, take = 50): Promise<AuditLog[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      });

      return logs;
    } catch (error) {
      logger.error(`Error fetching user audit logs: ${error}`);
      throw error;
    }
  }

  // Get audit logs by resource
  async getAuditLogsByResource(resource: string, skip = 0, take = 50): Promise<AuditLog[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { resource },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      });

      return logs;
    } catch (error) {
      logger.error(`Error fetching resource audit logs: ${error}`);
      throw error;
    }
  }

  // Get audit logs by action
  async getAuditLogsByAction(action: string, skip = 0, take = 50): Promise<AuditLog[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { action },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      });

      return logs;
    } catch (error) {
      logger.error(`Error fetching action audit logs: ${error}`);
      throw error;
    }
  }

  // Get audit trail for a specific resource
  async getResourceAuditTrail(resourceId: string): Promise<AuditLog[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { resourceId },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return logs;
    } catch (error) {
      logger.error(`Error fetching resource audit trail: ${error}`);
      throw error;
    }
  }

  // Get audit statistics
  async getAuditStats(startDate?: Date, endDate?: Date): Promise<{
    totalLogs: number;
    actionCounts: Record<string, number>;
    resourceCounts: Record<string, number>;
    topUsers: Array<{ userId: string; count: number }>;
  }> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const actionCounts: Record<string, number> = {};
      const resourceCounts: Record<string, number> = {};
      const userCounts: Record<string, number> = {};

      logs.forEach((log) => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
        resourceCounts[log.resource] = (resourceCounts[log.resource] || 0) + 1;
        userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
      });

      const topUsers = Object.entries(userCounts)
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalLogs: logs.length,
        actionCounts,
        resourceCounts,
        topUsers,
      };
    } catch (error) {
      logger.error(`Error getting audit stats: ${error}`);
      throw error;
    }
  }

  // Search audit logs
  async searchAuditLogs(query: string, skip = 0, take = 50): Promise<AuditLog[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          OR: [
            { action: { contains: query, mode: "insensitive" } },
            { resource: { contains: query, mode: "insensitive" } },
            { resourceId: { contains: query, mode: "insensitive" } },
            { user: { fullName: { contains: query, mode: "insensitive" } } },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      });

      return logs;
    } catch (error) {
      logger.error(`Error searching audit logs: ${error}`);
      throw error;
    }
  }

  // Delete old audit logs (retention policy)
  async deleteOldAuditLogs(daysToKeep = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });

      logger.info(`Deleted ${result.count} old audit logs`);
      return result.count;
    } catch (error) {
      logger.error(`Error deleting old audit logs: ${error}`);
      throw error;
    }
  }
}

export const auditService = new AuditService();
