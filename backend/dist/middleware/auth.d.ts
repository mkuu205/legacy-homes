import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '../utils/jwt';
export type AuthRequest = Request & {
    user?: JWTPayload;
    file?: any;
    files?: any;
};
export declare const authMiddleware: (req: AuthRequest, _res: Response, next: NextFunction) => void;
export declare const authenticate: (req: AuthRequest, _res: Response, next: NextFunction) => void;
export declare const authorize: (...roles: string[]) => (req: AuthRequest, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map