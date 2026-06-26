import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class PaymentController {
    initiatePayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    handleTumaCallback(req: Request, res: Response, next: NextFunction): Promise<void>;
    handlePayHeroCallback(req: Request, res: Response, next: NextFunction): Promise<void>;
    handlePesapalIpn(req: Request, res: Response, next: NextFunction): Promise<void>;
    checkStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getMyPayments(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deletePayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    bulkDelete(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    clearMyPaymentHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    retryVerification(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    exportCSV(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const paymentController: PaymentController;
//# sourceMappingURL=payment.controller.d.ts.map