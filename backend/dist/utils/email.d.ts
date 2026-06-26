interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
export declare const sendEmail: (options: EmailOptions) => Promise<void>;
export declare const sendOTPEmail: (email: string, name: string, otp: string) => Promise<void>;
export declare const sendPasswordResetEmail: (email: string, name: string, resetToken: string) => Promise<void>;
export declare const sendWelcomeEmail: (email: string, name: string, accountNumber: string) => Promise<void>;
export declare const sendBillNotificationEmail: (email: string, name: string, billNumber: string, amount: number, month: string, dueDate: string) => Promise<void>;
export declare const sendPaymentReceiptEmail: (email: string, name: string, amount: number, mpesaCode: string, billNumber: string, balance: number) => Promise<void>;
export declare const sendAccountSuspendedEmail: (email: string, name: string, reason?: string) => Promise<void>;
export declare const sendAccountActivatedEmail: (email: string, name: string) => Promise<void>;
export declare const sendAccountDeletedEmail: (email: string, name: string) => Promise<void>;
export declare const sendSupportTicketUpdateEmail: (email: string, name: string, ticketSubject: string, ticketId: string, replyMessage: string) => Promise<void>;
export {};
//# sourceMappingURL=email.d.ts.map