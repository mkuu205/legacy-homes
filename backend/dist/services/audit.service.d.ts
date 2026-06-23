import { AuditLog } from "@prisma/client";
export declare class AuditService {
    logAction(data: {
        userId: string;
        action: string;
        resource: string;
        resourceId?: string;
        details?: any;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<AuditLog>;
    getAuditLogs(filters?: {
        userId?: string;
        action?: string;
        resource?: string;
        startDate?: Date;
        endDate?: Date;
        skip?: number;
        take?: number;
    }): Promise<AuditLog[]>;
    getAuditLogsByUser(userId: string, skip?: number, take?: number): Promise<AuditLog[]>;
    getAuditLogsByResource(resource: string, skip?: number, take?: number): Promise<AuditLog[]>;
    getAuditLogsByAction(action: string, skip?: number, take?: number): Promise<AuditLog[]>;
    getResourceAuditTrail(resourceId: string): Promise<AuditLog[]>;
    getAuditStats(startDate?: Date, endDate?: Date): Promise<{
        totalLogs: number;
        actionCounts: Record<string, number>;
        resourceCounts: Record<string, number>;
        topUsers: Array<{
            userId: string;
            count: number;
        }>;
    }>;
    searchAuditLogs(query: string, skip?: number, take?: number): Promise<AuditLog[]>;
    deleteOldAuditLogs(daysToKeep?: number): Promise<number>;
}
export declare const auditService: AuditService;
//# sourceMappingURL=audit.service.d.ts.map