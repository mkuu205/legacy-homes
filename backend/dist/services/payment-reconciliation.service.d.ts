import { Payment, PaymentReconciliationStatus } from "@prisma/client";
export declare class PaymentReconciliationService {
    reconcilePayment(paymentId: string, status: PaymentReconciliationStatus): Promise<Payment>;
    getUnreconciledPayments(skip?: number, take?: number): Promise<Payment[]>;
    getMismatchedPayments(skip?: number, take?: number): Promise<Payment[]>;
    getOrphanedPayments(skip?: number, take?: number): Promise<Payment[]>;
    getReconciliationStats(): Promise<{
        totalPayments: number;
        reconciled: number;
        pending: number;
        mismatched: number;
        orphaned: number;
        reconciliationRate: number;
    }>;
    autoReconcilePayments(): Promise<number>;
    generateReconciliationReport(startDate?: Date, endDate?: Date): Promise<any>;
    bulkReconcilePayments(paymentIds: string[], status: PaymentReconciliationStatus): Promise<number>;
}
declare const _default: PaymentReconciliationService;
export default _default;
//# sourceMappingURL=payment-reconciliation.service.d.ts.map