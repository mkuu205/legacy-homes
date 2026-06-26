import { logger } from '@/utils/logger';
import { formatDateForDisplay } from '@/utils/timezone';

export class SMSService {
  /**
   * Send bill generated SMS
   */
  async sendBillGeneratedSMS(
    phoneNumber: string,
    billNumber: string,
    totalAmount: number,
    dueDate: Date
  ): Promise<void> {
    try {
      const message = `Legacy Homes: Your bill ${billNumber} for KES ${totalAmount.toLocaleString()} is ready. Due: ${formatDateForDisplay(dueDate)}. Pay now at legacyhomes.local`;
      await this.sendSMS(phoneNumber, message);
      logger.info(`Bill generated SMS sent to ${phoneNumber}`);
    } catch (error) {
      logger.error('Error sending bill generated SMS:', error);
      throw error;
    }
  }

  /**
   * Send payment successful SMS
   */
  async sendPaymentSuccessfulSMS(
    phoneNumber: string,
    amount: number,
    billNumber: string,
    receiptNumber: string
  ): Promise<void> {
    try {
      const message = `Legacy Homes: Payment of KES ${amount.toLocaleString()} received for bill ${billNumber}. Receipt: ${receiptNumber}. Thank you!`;
      await this.sendSMS(phoneNumber, message);
      logger.info(`Payment successful SMS sent to ${phoneNumber}`);
    } catch (error) {
      logger.error('Error sending payment successful SMS:', error);
      throw error;
    }
  }

  /**
   * Send payment failed SMS
   */
  async sendPaymentFailedSMS(
    phoneNumber: string,
    amount: number,
    reason: string
  ): Promise<void> {
    try {
      const message = `Legacy Homes: Payment of KES ${amount.toLocaleString()} failed. Reason: ${reason}. Try again or contact support.`;
      await this.sendSMS(phoneNumber, message);
      logger.info(`Payment failed SMS sent to ${phoneNumber}`);
    } catch (error) {
      logger.error('Error sending payment failed SMS:', error);
      throw error;
    }
  }

  /**
   * Send bill due reminder SMS
   */
  async sendBillDueReminderSMS(
    phoneNumber: string,
    billNumber: string,
    amount: number,
    daysUntilDue: number
  ): Promise<void> {
    try {
      const message = `Legacy Homes: Reminder - Bill ${billNumber} for KES ${amount.toLocaleString()} is due in ${daysUntilDue} day(s). Pay now to avoid late fees.`;
      await this.sendSMS(phoneNumber, message);
      logger.info(`Bill due reminder SMS sent to ${phoneNumber}`);
    } catch (error) {
      logger.error('Error sending bill due reminder SMS:', error);
      throw error;
    }
  }

  /**
   * Send bill overdue SMS
   */
  async sendBillOverdueSMS(
    phoneNumber: string,
    billNumber: string,
    amount: number,
    overdueDays: number
  ): Promise<void> {
    try {
      const message = `Legacy Homes: URGENT - Bill ${billNumber} is overdue by ${overdueDays} day(s). Amount: KES ${amount.toLocaleString()}. Pay immediately to avoid disconnection.`;
      await this.sendSMS(phoneNumber, message);
      logger.info(`Bill overdue SMS sent to ${phoneNumber}`);
    } catch (error) {
      logger.error('Error sending bill overdue SMS:', error);
      throw error;
    }
  }

  /**
   * Send receipt SMS
   */
  async sendReceiptSMS(
    phoneNumber: string,
    receiptNumber: string,
    billNumber: string,
    amount: number
  ): Promise<void> {
    try {
      const message = `Legacy Homes: Receipt ${receiptNumber} for bill ${billNumber}. Amount: KES ${amount.toLocaleString()}. Download receipt from your account.`;
      await this.sendSMS(phoneNumber, message);
      logger.info(`Receipt SMS sent to ${phoneNumber}`);
    } catch (error) {
      logger.error('Error sending receipt SMS:', error);
      throw error;
    }
  }

  /**
   * Send generic SMS
   */
  private async sendSMS(phoneNumber: string, message: string): Promise<void> {
    try {
      // TODO: Implement actual SMS sending using a service like Twilio, AWS SNS, Africa's Talking, etc.
      // For now, just log it
      logger.info(`SMS would be sent to ${phoneNumber}: ${message}`);
    } catch (error) {
      logger.error('Error sending SMS:', error);
      throw error;
    }
  }
}
