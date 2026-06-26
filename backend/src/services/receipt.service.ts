import { prisma } from '@/config/prisma';
import { logger } from '@/utils/logger';
import crypto from 'crypto';

export class ReceiptService {
  /**
   * Generate receipt for a payment
   */
  async generateReceipt(paymentId: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          bill: {
            include: {
              resident: true,
              house: true,
            },
          },
          resident: true,
        },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Check if receipt already exists
      let receipt = await prisma.receipt.findUnique({
        where: { paymentId },
      });

      if (receipt) {
        return receipt;
      }

      // Generate receipt number
      const receiptNumber = this.generateReceiptNumber(payment.id);

      // Create receipt record
      receipt = await prisma.receipt.create({
        data: {
          receiptNumber,
          paymentId,
          provider: payment.provider,
          generatedAt: new Date(),
          version: 1,
        },
      });

      // TODO: Generate PDF using ReportLab or similar
      // const pdfUrl = await this.generatePDF(payment, receipt);
      // await prisma.receipt.update({
      //   where: { id: receipt.id },
      //   data: { pdfUrl },
      // });

      logger.info(`Receipt generated: ${receiptNumber}`);
      return receipt;
    } catch (error) {
      logger.error('Receipt generation error:', error);
      throw error;
    }
  }

  /**
   * Generate receipt number
   */
  private generateReceiptNumber(paymentId: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const hash = crypto
      .createHash('md5')
      .update(paymentId)
      .digest('hex')
      .substring(0, 6)
      .toUpperCase();
    return `RCP-${timestamp}-${hash}`;
  }

  /**
   * Get receipt by ID
   */
  async getReceipt(receiptId: string) {
    try {
      const receipt = await prisma.receipt.findUnique({
        where: { id: receiptId },
        include: {
          payment: {
            include: {
              bill: {
                include: {
                  resident: true,
                  house: true,
                },
              },
              resident: true,
            },
          },
        },
      });

      return receipt;
    } catch (error) {
      logger.error('Error fetching receipt:', error);
      throw error;
    }
  }

  /**
   * Get receipt by number
   */
  async getReceiptByNumber(receiptNumber: string) {
    try {
      const receipt = await prisma.receipt.findUnique({
        where: { receiptNumber },
        include: {
          payment: {
            include: {
              bill: {
                include: {
                  resident: true,
                  house: true,
                },
              },
              resident: true,
            },
          },
        },
      });

      return receipt;
    } catch (error) {
      logger.error('Error fetching receipt by number:', error);
      throw error;
    }
  }

  /**
   * Mark receipt as emailed
   */
  async markAsEmailed(receiptId: string) {
    try {
      const receipt = await prisma.receipt.update({
        where: { id: receiptId },
        data: { emailed: true },
      });

      logger.info(`Receipt marked as emailed: ${receipt.receiptNumber}`);
      return receipt;
    } catch (error) {
      logger.error('Error marking receipt as emailed:', error);
      throw error;
    }
  }

  /**
   * Mark receipt as SMS sent
   */
  async markAsSmsSent(receiptId: string) {
    try {
      const receipt = await prisma.receipt.update({
        where: { id: receiptId },
        data: { smsSent: true },
      });

      logger.info(`Receipt marked as SMS sent: ${receipt.receiptNumber}`);
      return receipt;
    } catch (error) {
      logger.error('Error marking receipt as SMS sent:', error);
      throw error;
    }
  }

  /**
   * Get receipts for a resident
   */
  async getResidentReceipts(residentId: string, limit: number = 10) {
    try {
      const receipts = await prisma.receipt.findMany({
        where: {
          payment: {
            residentId,
          },
        },
        include: {
          payment: {
            include: {
              bill: true,
            },
          },
        },
        orderBy: { generatedAt: 'desc' },
        take: limit,
      });

      return receipts;
    } catch (error) {
      logger.error('Error fetching resident receipts:', error);
      throw error;
    }
  }

  /**
   * Generate PDF receipt (placeholder)
   */
  private async generatePDF(payment: any, receipt: any): Promise<string> {
    // TODO: Implement PDF generation
    // This should generate a professional receipt PDF with:
    // - Receipt Number
    // - Provider
    // - Payment Method
    // - Transaction ID
    // - Confirmation Code
    // - Amount
    // - Resident
    // - Property
    // - Bill Number
    // - Billing Period
    // - Payment Date
    // - Payment Time
    // - Timezone (Africa/Nairobi)
    // - QR Code
    // - Company Logo

    return 'https://example.com/receipts/' + receipt.id + '.pdf';
  }
}
