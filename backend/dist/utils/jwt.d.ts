export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
}
export declare const generateAccessToken: (payload: JWTPayload) => string;
export declare const generateRefreshToken: (payload: JWTPayload) => string;
export declare const verifyAccessToken: (token: string) => JWTPayload;
export declare const verifyRefreshToken: (token: string) => JWTPayload;
export declare const hashToken: (token: string) => string;
export declare const generateAccountNumber: () => string;
//# sourceMappingURL=jwt.d.ts.map