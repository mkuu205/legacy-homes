interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
export declare const sendEmail: (options: EmailOptions) => Promise<void>;
export declare const sendOTPEmail: (email: string, name: string, otp: string) => Promise<void>;
export declare const sendPasswordResetEmail: (email: string, name: string, resetToken: string) => Promise<void>;
export declare const sendBillNotificationEmail: (email: string, name: string, billNumber: string, amount: number, month: string, dueDate: string) => Promise<void>;
export {};
//# sourceMappingURL=email.d.ts.map