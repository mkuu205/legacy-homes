import { PrismaClient, SystemSetting } from "@prisma/client";
import logger from "../utils/logger";

const prisma = new PrismaClient();

export class SettingsService {
  // Get all settings
  async getAllSettings(): Promise<Record<string, string>> {
    try {
      const settings = await prisma.systemSetting.findMany();

      const result: Record<string, string> = {};
      settings.forEach((setting) => {
        result[setting.key] = setting.value;
      });

      return result;
    } catch (error) {
      logger.error(`Error fetching settings: ${error}`);
      throw error;
    }
  }

  // Get setting by key
  async getSetting(key: string): Promise<string | null> {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key },
      });

      return setting?.value || null;
    } catch (error) {
      logger.error(`Error fetching setting: ${error}`);
      throw error;
    }
  }

  // Update setting
  async updateSetting(key: string, value: string): Promise<SystemSetting> {
    try {
      const setting = await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });

      logger.info(`Setting updated: ${key}`);
      return setting;
    } catch (error) {
      logger.error(`Error updating setting: ${error}`);
      throw error;
    }
  }

  // Update multiple settings
  async updateSettings(settings: Record<string, string>): Promise<SystemSetting[]> {
    try {
      const results = [];
      for (const [key, value] of Object.entries(settings)) {
        const setting = await this.updateSetting(key, value);
        results.push(setting);
      }

      logger.info(`${results.length} settings updated`);
      return results;
    } catch (error) {
      logger.error(`Error updating settings: ${error}`);
      throw error;
    }
  }

  // Delete setting
  async deleteSetting(key: string): Promise<void> {
    try {
      await prisma.systemSetting.delete({
        where: { key },
      });

      logger.info(`Setting deleted: ${key}`);
    } catch (error) {
      logger.error(`Error deleting setting: ${error}`);
      throw error;
    }
  }

  // Get billing settings
  async getBillingSettings(): Promise<{
    unitRate: number;
    standingCharge: number;
    vatRate: number;
    billingCycle: string;
    dueDays: number;
  }> {
    try {
      const [unitRate, standingCharge, vatRate, billingCycle, dueDays] = await Promise.all([
        this.getSetting('UNIT_RATE'),
        this.getSetting('STANDING_CHARGE'),
        this.getSetting('VAT_RATE'),
        this.getSetting('BILLING_CYCLE'),
        this.getSetting('DUE_DAYS'),
      ]);

      return {
        unitRate: parseFloat(unitRate || '250'),
        standingCharge: parseFloat(standingCharge || '0'),
        vatRate: parseFloat(vatRate || '16'),
        billingCycle: billingCycle || 'MONTHLY',
        dueDays: parseInt(dueDays || '30'),
      };
    } catch (error) {
      logger.error(`Error fetching billing settings: ${error}`);
      throw error;
    }
  }

  // Update billing settings
  async updateBillingSettings(data: {
    unitRate?: number;
    standingCharge?: number;
    vatRate?: number;
    billingCycle?: string;
    dueDays?: number;
  }): Promise<void> {
    try {
      const settings: Record<string, string> = {};

      if (data.unitRate !== undefined) settings['UNIT_RATE'] = data.unitRate.toString();
      if (data.standingCharge !== undefined) settings['STANDING_CHARGE'] = data.standingCharge.toString();
      if (data.vatRate !== undefined) settings['VAT_RATE'] = data.vatRate.toString();
      if (data.billingCycle) settings['BILLING_CYCLE'] = data.billingCycle;
      if (data.dueDays !== undefined) settings['DUE_DAYS'] = data.dueDays.toString();

      await this.updateSettings(settings);

      logger.info('Billing settings updated');
    } catch (error) {
      logger.error(`Error updating billing settings: ${error}`);
      throw error;
    }
  }

  // Get notification settings
  async getNotificationSettings(): Promise<{
    emailNotifications: boolean;
    smsNotifications: boolean;
    inAppNotifications: boolean;
    paymentReminders: boolean;
    billingReminders: boolean;
  }> {
    try {
      const [email, sms, inApp, paymentReminders, billingReminders] = await Promise.all([
        this.getSetting('EMAIL_NOTIFICATIONS_ENABLED'),
        this.getSetting('SMS_NOTIFICATIONS_ENABLED'),
        this.getSetting('IN_APP_NOTIFICATIONS_ENABLED'),
        this.getSetting('PAYMENT_REMINDERS_ENABLED'),
        this.getSetting('BILLING_REMINDERS_ENABLED'),
      ]);

      return {
        emailNotifications: email === 'true',
        smsNotifications: sms === 'true',
        inAppNotifications: inApp === 'true',
        paymentReminders: paymentReminders === 'true',
        billingReminders: billingReminders === 'true',
      };
    } catch (error) {
      logger.error(`Error fetching notification settings: ${error}`);
      throw error;
    }
  }

  // Update notification settings
  async updateNotificationSettings(data: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    inAppNotifications?: boolean;
    paymentReminders?: boolean;
    billingReminders?: boolean;
  }): Promise<void> {
    try {
      const settings: Record<string, string> = {};

      if (data.emailNotifications !== undefined) settings['EMAIL_NOTIFICATIONS_ENABLED'] = data.emailNotifications.toString();
      if (data.smsNotifications !== undefined) settings['SMS_NOTIFICATIONS_ENABLED'] = data.smsNotifications.toString();
      if (data.inAppNotifications !== undefined) settings['IN_APP_NOTIFICATIONS_ENABLED'] = data.inAppNotifications.toString();
      if (data.paymentReminders !== undefined) settings['PAYMENT_REMINDERS_ENABLED'] = data.paymentReminders.toString();
      if (data.billingReminders !== undefined) settings['BILLING_REMINDERS_ENABLED'] = data.billingReminders.toString();

      await this.updateSettings(settings);

      logger.info('Notification settings updated');
    } catch (error) {
      logger.error(`Error updating notification settings: ${error}`);
      throw error;
    }
  }

  // Get security settings
  async getSecuritySettings(): Promise<{
    passwordMinLength: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    twoFactorEnabled: boolean;
  }> {
    try {
      const [pwdLength, sessionTimeout, maxAttempts, twoFactor] = await Promise.all([
        this.getSetting('PASSWORD_MIN_LENGTH'),
        this.getSetting('SESSION_TIMEOUT_MINUTES'),
        this.getSetting('MAX_LOGIN_ATTEMPTS'),
        this.getSetting('TWO_FACTOR_ENABLED'),
      ]);

      return {
        passwordMinLength: parseInt(pwdLength || '8'),
        sessionTimeout: parseInt(sessionTimeout || '30'),
        maxLoginAttempts: parseInt(maxAttempts || '5'),
        twoFactorEnabled: twoFactor === 'true',
      };
    } catch (error) {
      logger.error(`Error fetching security settings: ${error}`);
      throw error;
    }
  }

  // Update security settings
  async updateSecuritySettings(data: {
    passwordMinLength?: number;
    sessionTimeout?: number;
    maxLoginAttempts?: number;
    twoFactorEnabled?: boolean;
  }): Promise<void> {
    try {
      const settings: Record<string, string> = {};

      if (data.passwordMinLength !== undefined) settings['PASSWORD_MIN_LENGTH'] = data.passwordMinLength.toString();
      if (data.sessionTimeout !== undefined) settings['SESSION_TIMEOUT_MINUTES'] = data.sessionTimeout.toString();
      if (data.maxLoginAttempts !== undefined) settings['MAX_LOGIN_ATTEMPTS'] = data.maxLoginAttempts.toString();
      if (data.twoFactorEnabled !== undefined) settings['TWO_FACTOR_ENABLED'] = data.twoFactorEnabled.toString();

      await this.updateSettings(settings);

      logger.info('Security settings updated');
    } catch (error) {
      logger.error(`Error updating security settings: ${error}`);
      throw error;
    }
  }
}

export const settingsService = new SettingsService();
