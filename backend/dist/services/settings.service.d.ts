import { SystemSetting } from "@prisma/client";
export declare class SettingsService {
    getAllSettings(): Promise<Record<string, string>>;
    getSetting(key: string): Promise<string | null>;
    updateSetting(key: string, value: string): Promise<SystemSetting>;
    updateSettings(settings: Record<string, string>): Promise<SystemSetting[]>;
    deleteSetting(key: string): Promise<void>;
    getBillingSettings(): Promise<{
        unitRate: number;
        standingCharge: number;
        vatRate: number;
        billingCycle: string;
        dueDays: number;
    }>;
    updateBillingSettings(data: {
        unitRate?: number;
        standingCharge?: number;
        vatRate?: number;
        billingCycle?: string;
        dueDays?: number;
    }): Promise<void>;
    getNotificationSettings(): Promise<{
        emailNotifications: boolean;
        smsNotifications: boolean;
        inAppNotifications: boolean;
        paymentReminders: boolean;
        billingReminders: boolean;
    }>;
    updateNotificationSettings(data: {
        emailNotifications?: boolean;
        smsNotifications?: boolean;
        inAppNotifications?: boolean;
        paymentReminders?: boolean;
        billingReminders?: boolean;
    }): Promise<void>;
    getSecuritySettings(): Promise<{
        passwordMinLength: number;
        sessionTimeout: number;
        maxLoginAttempts: number;
        twoFactorEnabled: boolean;
    }>;
    updateSecuritySettings(data: {
        passwordMinLength?: number;
        sessionTimeout?: number;
        maxLoginAttempts?: number;
        twoFactorEnabled?: boolean;
    }): Promise<void>;
}
export declare const settingsService: SettingsService;
//# sourceMappingURL=settings.service.d.ts.map