import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class PaymentController {
    initiatePayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    handleCallback(req: Request, res: Response, next: NextFunction): Promise<void>;
    checkStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getMyPayments(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const paymentController: PaymentController;
//# sourceMappingURL=payment.controller.d.ts.map