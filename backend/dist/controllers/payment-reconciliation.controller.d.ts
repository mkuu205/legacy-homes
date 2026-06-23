import { Request, Response } from "express";
export declare class PaymentReconciliationController {
    getUnreconciledPayments(req: Request, res: Response): Promise<void>;
    getMismatchedPayments(req: Request, res: Response): Promise<void>;
    getOrphanedPayments(req: Request, res: Response): Promise<void>;
    getReconciliationStats(req: Request, res: Response): Promise<void>;
    reconcilePayment(req: Request, res: Response): Promise<void>;
    autoReconcilePayments(req: Request, res: Response): Promise<void>;
    generateReconciliationReport(req: Request, res: Response): Promise<void>;
    bulkReconcilePayments(req: Request, res: Response): Promise<void>;
}
declare const _default: PaymentReconciliationController;
export default _default;
//# sourceMappingURL=payment-reconciliation.controller.d.ts.map