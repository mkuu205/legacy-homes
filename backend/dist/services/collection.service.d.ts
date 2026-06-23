export declare class CollectionService {
    createCollectionTask(billId: string, data: {
        priority: 'HIGH' | 'MEDIUM' | 'LOW';
        assignedTo?: string;
        notes?: string;
    }): Promise<any>;
    getCollectionMetrics(): Promise<{
        totalBillsGenerated: number;
        totalBillsCollected: number;
        totalAmountGenerated: number;
        totalAmountCollected: number;
        collectionRate: number;
        averageDaysToCollect: number;
    }>;
    getTopDebtors(limit?: number): Promise<any[]>;
    getResidentCollectionStatus(residentId: string): Promise<{
        totalGenerated: number;
        totalPaid: number;
        totalOutstanding: number;
        paymentHistory: any[];
    }>;
    sendCollectionNotice(billId: string, noticeType: 'FIRST' | 'SECOND' | 'FINAL'): Promise<void>;
    getCollectionTimeline(billId: string): Promise<any[]>;
    bulkSendCollectionReminders(billIds: string[]): Promise<number>;
    getCollectionEfficiencyScore(): Promise<number>;
}
declare const _default: CollectionService;
export default _default;
//# sourceMappingURL=collection.service.d.ts.map