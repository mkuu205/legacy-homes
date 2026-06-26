import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class BillingController {
    generateMonthlyBills(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    checkDuplicateBills(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getMyBills(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getStatement(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    markOverdue(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    downloadInvoice(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    downloadReceipt(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteBill(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteBills(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteBillsByMonth(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteAllUnpaidBills(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    exportCSV(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const billingController: BillingController;
//# sourceMappingURL=billing.controller.d.ts.map