import { logger } from '../utils/logger';
import { formatDateForDisplay, formatBillingPeriod } from '../utils/timezone';

export class EmailService {
  /**
   * Send bill generated email
   */
  async sendBillGeneratedEmail(
    email: string,
    residentName: string,
    billNumber: string,
    billingPeriod: { start: string; end: string },
    totalAmount: number,
    dueDate: Date,
    generatedAt: Date
  ) {
    try {
      const subject = `Your Water Bill ${billNumber} is Ready`;
      const html = this.generateBillGeneratedTemplate(
        residentName,
        billNumber,
        billingPeriod,
        totalAmount,
        dueDate,
        generatedAt
      );

      await this.sendEmail(email, subject, html);
      logger.info(`Bill generated email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending bill generated email:', error);
      throw error;
    }
  }

  /**
   * Send payment successful email
   */
  async sendPaymentSuccessfulEmail(
    email: string,
    residentName: string,
    amount: number,
    billNumber: string,
    receiptNumber: string,
    paymentDate: Date,
    transactionId?: string
  ) {
    try {
      const subject = `Payment Confirmation - KES ${amount.toLocaleString()}`;
      const html = this.generatePaymentSuccessfulTemplate(
        residentName,
        amount,
        billNumber,
        receiptNumber,
        paymentDate,
        transactionId
      );

      await this.sendEmail(email, subject, html);
      logger.info(`Payment successful email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending payment successful email:', error);
      throw error;
    }
  }

  /**
   * Send payment failed email
   */
  async sendPaymentFailedEmail(
    email: string,
    residentName: string,
    amount: number,
    billNumber: string,
    reason: string,
    paymentDate: Date
  ) {
    try {
      const subject = `Payment Failed - KES ${amount.toLocaleString()}`;
      const html = this.generatePaymentFailedTemplate(
        residentName,
        amount,
        billNumber,
        reason,
        paymentDate
      );

      await this.sendEmail(email, subject, html);
      logger.info(`Payment failed email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending payment failed email:', error);
      throw error;
    }
  }

  /**
   * Send bill due reminder email
   */
  async sendBillDueReminderEmail(
    email: string,
    residentName: string,
    billNumber: string,
    amount: number,
    dueDate: Date,
    daysUntilDue: number
  ) {
    try {
      const subject = `Reminder: Your Bill is Due in ${daysUntilDue} Days`;
      const html = this.generateBillDueReminderTemplate(
        residentName,
        billNumber,
        amount,
        dueDate,
        daysUntilDue
      );

      await this.sendEmail(email, subject, html);
      logger.info(`Bill due reminder email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending bill due reminder email:', error);
      throw error;
    }
  }

  /**
   * Send bill overdue email
   */
  async sendBillOverdueEmail(
    email: string,
    residentName: string,
    billNumber: string,
    amount: number,
    overdueDays: number
  ) {
    try {
      const subject = `URGENT: Your Bill is Overdue by ${overdueDays} Days`;
      const html = this.generateBillOverdueTemplate(
        residentName,
        billNumber,
        amount,
        overdueDays
      );

      await this.sendEmail(email, subject, html);
      logger.info(`Bill overdue email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending bill overdue email:', error);
      throw error;
    }
  }

  /**
   * Send receipt email
   */
  async sendReceiptEmail(
    email: string,
    residentName: string,
    receiptNumber: string,
    billNumber: string,
    amount: number,
    paymentDate: Date,
    receiptUrl?: string
  ) {
    try {
      const subject = `Receipt ${receiptNumber} - Payment Confirmation`;
      const html = this.generateReceiptTemplate(
        residentName,
        receiptNumber,
        billNumber,
        amount,
        paymentDate,
        receiptUrl
      );

      await this.sendEmail(email, subject, html);
      logger.info(`Receipt email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending receipt email:', error);
      throw error;
    }
  }

  /**
   * Send system back online email
   */
  async sendSystemBackOnlineEmail(email: string) {
    try {
      const subject = 'Legacy Homes is Back Online';
      const html = this.generateSystemBackOnlineTemplate();

      await this.sendEmail(email, subject, html);
      logger.info(`Recovery email sent to ${email}`);
    } catch (error) {
      logger.error(`Error sending recovery email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Send generic email
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const { sendEmail: sendViaBrevo } = await import('../utils/email');
      await sendViaBrevo({ to, subject, html });
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Generate bill generated email template
   */
  private generateBillGeneratedTemplate(
    residentName: string,
    billNumber: string,
    billingPeriod: { start: string; end: string },
    totalAmount: number,
    dueDate: Date,
    generatedAt: Date
  ): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #00C6A7; color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
            .footer { text-align: center; color: #999; font-size: 12px; }
            .amount { font-size: 24px; font-weight: bold; color: #00C6A7; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Water Bill is Ready</h1>
            </div>
            <div class="content">
              <p>Dear ${residentName},</p>
              <p>Your water bill for the period <strong>${billingPeriod.start} — ${billingPeriod.end}</strong> has been generated.</p>
              <p><strong>Bill Number:</strong> ${billNumber}</p>
              <p><strong>Amount Due:</strong> <span class="amount">KES ${totalAmount.toLocaleString()}</span></p>
              <p><strong>Due Date:</strong> ${formatDateForDisplay(dueDate)}</p>
              <p><strong>Generated:</strong> ${formatDateForDisplay(generatedAt)}</p>
              <p>Please log in to your account to view the full bill details and make a payment.</p>
            </div>
            <div class="footer">
              <p>© 2026 Legacy Homes. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate payment successful email template
   */
  private generatePaymentSuccessfulTemplate(
    residentName: string,
    amount: number,
    billNumber: string,
    receiptNumber: string,
    paymentDate: Date,
    transactionId?: string
  ): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
            .footer { text-align: center; color: #999; font-size: 12px; }
            .amount { font-size: 24px; font-weight: bold; color: #10b981; }
            .success { color: #10b981; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="success">✓ Payment Successful</h1>
            </div>
            <div class="content">
              <p>Dear ${residentName},</p>
              <p>Your payment has been successfully received.</p>
              <p><strong>Amount Paid:</strong> <span class="amount">KES ${amount.toLocaleString()}</span></p>
              <p><strong>Bill Number:</strong> ${billNumber}</p>
              <p><strong>Receipt Number:</strong> ${receiptNumber}</p>
              <p><strong>Payment Date:</strong> ${formatDateForDisplay(paymentDate)}</p>
              ${transactionId ? `<p><strong>Transaction ID:</strong> ${transactionId}</p>` : ''}
              <p>Thank you for your prompt payment. Your receipt is attached to this email.</p>
            </div>
            <div class="footer">
              <p>© 2026 Legacy Homes. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate payment failed email template
   */
  private generatePaymentFailedTemplate(
    residentName: string,
    amount: number,
    billNumber: string,
    reason: string,
    paymentDate: Date
  ): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
            .footer { text-align: center; color: #999; font-size: 12px; }
            .amount { font-size: 24px; font-weight: bold; color: #ef4444; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Failed</h1>
            </div>
            <div class="content">
              <p>Dear ${residentName},</p>
              <p>Your payment attempt was unsuccessful.</p>
              <p><strong>Amount:</strong> <span class="amount">KES ${amount.toLocaleString()}</span></p>
              <p><strong>Bill Number:</strong> ${billNumber}</p>
              <p><strong>Reason:</strong> ${reason}</p>
              <p><strong>Date:</strong> ${formatDateForDisplay(paymentDate)}</p>
              <p>Please try again or contact our support team for assistance.</p>
            </div>
            <div class="footer">
              <p>© 2026 Legacy Homes. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate bill due reminder email template
   */
  private generateBillDueReminderTemplate(
    residentName: string,
    billNumber: string,
    amount: number,
    dueDate: Date,
    daysUntilDue: number
  ): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
            .footer { text-align: center; color: #999; font-size: 12px; }
            .amount { font-size: 24px; font-weight: bold; color: #f59e0b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bill Due Reminder</h1>
            </div>
            <div class="content">
              <p>Dear ${residentName},</p>
              <p>Your water bill is due in <strong>${daysUntilDue} day(s)</strong>.</p>
              <p><strong>Bill Number:</strong> ${billNumber}</p>
              <p><strong>Amount Due:</strong> <span class="amount">KES ${amount.toLocaleString()}</span></p>
              <p><strong>Due Date:</strong> ${formatDateForDisplay(dueDate)}</p>
              <p>Please make your payment before the due date to avoid late fees.</p>
            </div>
            <div class="footer">
              <p>© 2026 Legacy Homes. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate bill overdue email template
   */
  private generateBillOverdueTemplate(
    residentName: string,
    billNumber: string,
    amount: number,
    overdueDays: number
  ): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
            .footer { text-align: center; color: #999; font-size: 12px; }
            .amount { font-size: 24px; font-weight: bold; color: #dc2626; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>URGENT: Bill Overdue</h1>
            </div>
            <div class="content">
              <p>Dear ${residentName},</p>
              <p>Your water bill is now <strong>${overdueDays} day(s) overdue</strong>.</p>
              <p><strong>Bill Number:</strong> ${billNumber}</p>
              <p><strong>Amount Due:</strong> <span class="amount">KES ${amount.toLocaleString()}</span></p>
              <p>Please make your payment immediately to avoid service disconnection.</p>
            </div>
            <div class="footer">
              <p>© 2026 Legacy Homes. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate receipt email template
   */
  private generateReceiptTemplate(
    residentName: string,
    receiptNumber: string,
    billNumber: string,
    amount: number,
    paymentDate: Date,
    receiptUrl?: string
  ): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #00C6A7; color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
            .footer { text-align: center; color: #999; font-size: 12px; }
            .amount { font-size: 24px; font-weight: bold; color: #00C6A7; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Receipt</h1>
            </div>
            <div class="content">
              <p>Dear ${residentName},</p>
              <p>Thank you for your payment. Here is your receipt.</p>
              <p><strong>Receipt Number:</strong> ${receiptNumber}</p>
              <p><strong>Bill Number:</strong> ${billNumber}</p>
              <p><strong>Amount Paid:</strong> <span class="amount">KES ${amount.toLocaleString()}</span></p>
              <p><strong>Payment Date:</strong> ${formatDateForDisplay(paymentDate)}</p>
              ${receiptUrl ? `<p><a href="${receiptUrl}">Download Receipt PDF</a></p>` : ''}
            </div>
            <div class="footer">
              <p>© 2026 Legacy Homes. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate system back online template
   */
  private generateSystemBackOnlineTemplate(): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #00C6A7; color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
            .footer { text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Legacy Homes is Back Online</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Good news!</p>
              <p>Legacy Homes is now back online.</p>
              <p>You can now sign in and continue managing your water account.</p>
              <p>Thank you for your patience.</p>
              <p>Legacy Homes Team</p>
            </div>
            <div class="footer">
              <p>© 2026 Legacy Homes. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();
