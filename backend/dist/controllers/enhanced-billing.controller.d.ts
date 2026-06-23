import { Request, Response } from "express";
export declare class EnhancedBillingController {
    lockBill(req: Request, res: Response): Promise<void>;
    unlockBill(req: Request, res: Response): Promise<void>;
    createFinalBill(req: Request, res: Response): Promise<void>;
    getLockedBills(req: Request, res: Response): Promise<void>;
    getUnpaidBillsForCollection(req: Request, res: Response): Promise<void>;
    getOverdueBills(req: Request, res: Response): Promise<void>;
    getCollectionStats(req: Request, res: Response): Promise<void>;
    getCollectionPerformanceByMonth(req: Request, res: Response): Promise<void>;
    bulkLockBillsForCycle(req: Request, res: Response): Promise<void>;
    bulkUnlockBillsForCycle(req: Request, res: Response): Promise<void>;
    getCollectionMetrics(req: Request, res: Response): Promise<void>;
    getTopDebtors(req: Request, res: Response): Promise<void>;
    getResidentCollectionStatus(req: Request, res: Response): Promise<void>;
    getCollectionTimeline(req: Request, res: Response): Promise<void>;
    getCollectionEfficiencyScore(req: Request, res: Response): Promise<void>;
}
declare const _default: EnhancedBillingController;
export default _default;
//# sourceMappingURL=enhanced-billing.controller.d.ts.map