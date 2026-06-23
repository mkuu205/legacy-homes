import { Request, Response } from "express";
export declare class ResidentApprovalController {
    getPendingApplications(req: Request, res: Response): Promise<void>;
    getApprovedResidents(req: Request, res: Response): Promise<void>;
    getRejectedResidents(req: Request, res: Response): Promise<void>;
    approveResident(req: Request, res: Response): Promise<void>;
    rejectResident(req: Request, res: Response): Promise<void>;
    assignHouseToResident(req: Request, res: Response): Promise<void>;
    unassignHouseFromResident(req: Request, res: Response): Promise<void>;
    getApplicationCounts(req: Request, res: Response): Promise<void>;
    bulkApproveResidents(req: Request, res: Response): Promise<void>;
    bulkRejectResidents(req: Request, res: Response): Promise<void>;
}
declare const _default: ResidentApprovalController;
export default _default;
//# sourceMappingURL=resident-approval.controller.d.ts.map