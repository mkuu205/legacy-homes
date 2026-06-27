import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { formatDateInAppTimezone, formatBillingPeriod } from '../utils/timezone';

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

      // Generate PDF
      const pdfUrl = await this.generatePDF(payment, receipt);
      await prisma.receipt.update({
        where: { id: receipt.id },
        data: { pdfUrl },
      });

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
   * Generate PDF receipt
   */
  private async generatePDF(payment: any, receipt: any): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const receiptsDir = path.join(process.cwd(), 'public', 'receipts');
        
        if (!fs.existsSync(receiptsDir)) {
          fs.mkdirSync(receiptsDir, { recursive: true });
        }
        
        const fileName = `${receipt.receiptNumber}.pdf`;
        const filePath = path.join(receiptsDir, fileName);
        
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        
        // Header
        doc.fontSize(20).text('LEGACY HOMES', { align: 'center' });
        doc.fontSize(12).text('PAYMENT RECEIPT', { align: 'center' });
        doc.moveDown();
        
        // Receipt Details
        doc.fontSize(10);
        doc.text(`Receipt Number: ${receipt.receiptNumber}`);
        doc.text(`Date: ${formatDateInAppTimezone(receipt.generatedAt, 'dd MMM yyyy HH:mm z')}`);
        doc.text(`Status: SUCCESSFUL`);
        doc.moveDown();
        
        // Payment Details
        doc.text(`Payment Provider: ${payment.provider}`);
        doc.text(`Payment Method: ${payment.paymentMethod}`);
        doc.text(`Transaction ID: ${payment.providerTransactionId || 'N/A'}`);
        doc.text(`Confirmation Code: ${payment.confirmationCode || 'N/A'}`);
        doc.moveDown();
        
        // Resident Details
        doc.text(`Resident: ${payment.resident.fullName}`);
        doc.text(`House: ${payment.bill.house.houseNumber}`);
        doc.moveDown();
        
        // Bill Details
        doc.text(`Bill Number: ${payment.bill.billNumber}`);
        doc.text(`Billing Period: ${formatBillingPeriod(payment.bill.billingPeriodStart, payment.bill.billingPeriodEnd)}`);
        doc.moveDown();
        
        // Amount
        doc.fontSize(14).text(`Amount Paid: KES ${payment.amount.toLocaleString()}`, { underline: true });
        
        doc.end();
        
        stream.on('finish', () => {
          resolve(`/receipts/${fileName}`);
        });
        
        stream.on('error', (err) => {
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

export const receiptService = new ReceiptService();
