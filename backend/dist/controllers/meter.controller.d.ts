import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class MeterController {
    getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteMeter(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    addReading(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getReadingHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getMyMeter(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    exportCSV(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const meterController: MeterController;
//# sourceMappingURL=meter.controller.d.ts.map