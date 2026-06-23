import { Bill } from "@prisma/client";
export declare class EnhancedBillingService {
    lockBill(billId: string): Promise<Bill>;
    unlockBill(billId: string): Promise<Bill>;
    createFinalBill(residentId: string, data: {
        totalAmount: number;
        reason: string;
    }): Promise<Bill>;
    getLockedBills(skip?: number, take?: number): Promise<Bill[]>;
    getUnpaidBillsForCollection(skip?: number, take?: number): Promise<Bill[]>;
    getOverdueBills(skip?: number, take?: number): Promise<Bill[]>;
    getResidentBillsForCollection(residentId: string): Promise<Bill[]>;
    getCollectionStats(): Promise<{
        totalUnpaid: number;
        totalOverdue: number;
        totalOutstanding: number;
        averageOutstandingAmount: number;
    }>;
    sendCollectionReminder(billId: string): Promise<void>;
    bulkLockBillsForCycle(billingMonth: string): Promise<number>;
    bulkUnlockBillsForCycle(billingMonth: string): Promise<number>;
    getCollectionPerformanceByMonth(months?: number): Promise<any[]>;
}
declare const _default: EnhancedBillingService;
export default _default;
//# sourceMappingURL=enhanced-billing.service.d.ts.map