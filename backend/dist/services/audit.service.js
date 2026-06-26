"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class AuditService {
    // Log an action
    async logAction(data) {
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
            logger_1.logger.info(`Audit log created: ${auditLog.id}`);
            return auditLog;
        }
        catch (error) {
            logger_1.logger.error(`Error creating audit log: ${error}`);
            throw error;
        }
    }
    // Get audit logs
    async getAuditLogs(filters) {
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
        }
        catch (error) {
            logger_1.logger.error(`Error fetching audit logs: ${error}`);
            throw error;
        }
    }
    // Get audit logs by user
    async getAuditLogsByUser(userId, skip = 0, take = 50) {
        try {
            const logs = await prisma.auditLog.findMany({
                where: { userId },
                skip,
                take,
                orderBy: { createdAt: "desc" },
            });
            return logs;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching user audit logs: ${error}`);
            throw error;
        }
    }
    // Get audit logs by resource
    async getAuditLogsByResource(resource, skip = 0, take = 50) {
        try {
            const logs = await prisma.auditLog.findMany({
                where: { resource },
                skip,
                take,
                orderBy: { createdAt: "desc" },
            });
            return logs;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching resource audit logs: ${error}`);
            throw error;
        }
    }
    // Get audit logs by action
    async getAuditLogsByAction(action, skip = 0, take = 50) {
        try {
            const logs = await prisma.auditLog.findMany({
                where: { action },
                skip,
                take,
                orderBy: { createdAt: "desc" },
            });
            return logs;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching action audit logs: ${error}`);
            throw error;
        }
    }
    // Get audit trail for a specific resource
    async getResourceAuditTrail(resourceId) {
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
        }
        catch (error) {
            logger_1.logger.error(`Error fetching resource audit trail: ${error}`);
            throw error;
        }
    }
    // Get audit statistics
    async getAuditStats(startDate, endDate) {
        try {
            const logs = await prisma.auditLog.findMany({
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
            });
            const actionCounts = {};
            const resourceCounts = {};
            const userCounts = {};
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
        }
        catch (error) {
            logger_1.logger.error(`Error getting audit stats: ${error}`);
            throw error;
        }
    }
    // Search audit logs
    async searchAuditLogs(query, skip = 0, take = 50) {
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
        }
        catch (error) {
            logger_1.logger.error(`Error searching audit logs: ${error}`);
            throw error;
        }
    }
    // Delete old audit logs (retention policy)
    async deleteOldAuditLogs(daysToKeep = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const result = await prisma.auditLog.deleteMany({
                where: {
                    createdAt: { lt: cutoffDate },
                },
            });
            logger_1.logger.info(`Deleted ${result.count} old audit logs`);
            return result.count;
        }
        catch (error) {
            logger_1.logger.error(`Error deleting old audit logs: ${error}`);
            throw error;
        }
    }
}
exports.AuditService = AuditService;
exports.auditService = new AuditService();
//# sourceMappingURL=audit.service.js.map