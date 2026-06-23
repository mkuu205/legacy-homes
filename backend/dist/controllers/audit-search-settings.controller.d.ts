import { Request, Response } from "express";
export declare class AuditSearchSettingsController {
    getAuditLogs(req: Request, res: Response): Promise<void>;
    getAuditLogsByUser(req: Request, res: Response): Promise<void>;
    getResourceAuditTrail(req: Request, res: Response): Promise<void>;
    getAuditStats(req: Request, res: Response): Promise<void>;
    searchAuditLogs(req: Request, res: Response): Promise<void>;
    globalSearch(req: Request, res: Response): Promise<void>;
    advancedSearch(req: Request, res: Response): Promise<void>;
    getAllSettings(req: Request, res: Response): Promise<void>;
    getBillingSettings(req: Request, res: Response): Promise<void>;
    updateBillingSettings(req: Request, res: Response): Promise<void>;
    getNotificationSettings(req: Request, res: Response): Promise<void>;
    updateNotificationSettings(req: Request, res: Response): Promise<void>;
    getSecuritySettings(req: Request, res: Response): Promise<void>;
    updateSecuritySettings(req: Request, res: Response): Promise<void>;
}
declare const _default: AuditSearchSettingsController;
export default _default;
//# sourceMappingURL=audit-search-settings.controller.d.ts.map