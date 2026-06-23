declare global {
    namespace Express {
        interface NotificationService {
            sendBillGeneratedNotification(residentId: string, billNumber: string, totalAmount: number): Promise<void>;
            sendPaymentSuccessNotification(residentId: string, paymentAmount: number, mpesaCode?: string): Promise<void>;
        }
    }
}
export declare class NotificationService {
    sendBroadcast(data: {
        title: string;
        message: string;
        type: string;
        channels: string[];
        sentBy: string;
        targetAll?: boolean;
        targetGroup?: string;
        targetResidentIds?: string[];
    }): Promise<{
        notification: {
            message: string;
            id: string;
            createdAt: Date;
            title: string;
            type: import(".prisma/client").$Enums.NotificationType;
            channels: import(".prisma/client").$Enums.NotificationChannel[];
            sentBy: string | null;
            targetAll: boolean;
            targetGroup: string | null;
        };
        sent: number;
    }>;
    private deliverNotification;
    getResidentNotifications(userId: string, query: {
        page?: number | string;
        limit?: number | string;
    }): Promise<{
        notifications: ({
            notification: {
                message: string;
                id: string;
                createdAt: Date;
                title: string;
                type: import(".prisma/client").$Enums.NotificationType;
                channels: import(".prisma/client").$Enums.NotificationChannel[];
                sentBy: string | null;
                targetAll: boolean;
                targetGroup: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.NotificationStatus;
            userId: string;
            notificationId: string;
            channel: import(".prisma/client").$Enums.NotificationChannel;
            readAt: Date | null;
            deliveredAt: Date | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
        unread: number;
    }>;
    markAsRead(userId: string, notificationId: string): Promise<{
        message: string;
    }>;
    markAllAsRead(userId: string): Promise<{
        message: string;
    }>;
    getAllNotifications(query: {
        page?: number | string;
        limit?: number | string;
    }): Promise<{
        notifications: ({
            _count: {
                userNotifications: number;
            };
        } & {
            message: string;
            id: string;
            createdAt: Date;
            title: string;
            type: import(".prisma/client").$Enums.NotificationType;
            channels: import(".prisma/client").$Enums.NotificationChannel[];
            sentBy: string | null;
            targetAll: boolean;
            targetGroup: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    deleteAllResidentNotifications(userId: string): Promise<{
        message: string;
    }>;
    adminDeleteAllNotifications(): Promise<{
        message: string;
    }>;
    sendBillGeneratedNotification(residentId: string, billNumber: string, totalAmount: number): Promise<void>;
    sendPaymentSuccessNotification(residentId: string, paymentAmount: number, mpesaCode?: string): Promise<void>;
    markAsUnread(userId: string, notificationId: string): Promise<{
        message: string;
    }>;
    deleteOne(userId: string, notificationId: string): Promise<{
        message: string;
    }>;
    getNotificationLogs(query: any): Promise<{
        logs: {
            message: string;
            id: string;
            createdAt: Date;
            title: string;
            type: import(".prisma/client").$Enums.NotificationType;
            channels: import(".prisma/client").$Enums.NotificationChannel[];
            sentBy: string | null;
            targetAll: boolean;
            targetGroup: string | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
}
export declare const notificationService: NotificationService;
//# sourceMappingURL=notification.service.d.ts.map