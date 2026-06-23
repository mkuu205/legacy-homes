export declare const generateOTP: () => string;
export declare const hashOTP: (otp: string) => Promise<string>;
export declare const verifyOTP: (otp: string, hash: string) => Promise<boolean>;
export declare const getOTPExpiry: (minutes?: number) => Date;
//# sourceMappingURL=otp.d.ts.map