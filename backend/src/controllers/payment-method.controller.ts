import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { PaymentProviderType, PaymentMethodType } from '@prisma/client';
import { logger } from '../utils/logger';

export class PaymentMethodController {
  /**
   * Get all payment methods for the resident
   */
  async getPaymentMethods(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const residentId = req.user!.userId;
      const methods = await prisma.paymentMethod.findMany({
        where: { residentId, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          provider: true,
          methodType: true,
          displayName: true,
          lastFour: true,
          cardBrand: true,
          expiryMonth: true,
          expiryYear: true,
          phoneNumber: true,
          isDefault: true,
          createdAt: true,
        },
      });

      res.json({ success: true, data: methods });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a new payment method (card or M-Pesa)
   */
  async addPaymentMethod(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const residentId = req.user!.userId;
      const {
        provider,
        methodType,
        phoneNumber,
        displayName,
        lastFour,
        cardBrand,
        expiryMonth,
        expiryYear,
        providerToken,
        isDefault,
      } = req.body;

      // Validate required fields
      if (!provider || !methodType) {
        throw new AppError('Provider and method type are required', 400);
      }

      // Validate card-specific fields
      if (methodType === 'SAVED_CARD') {
        if (!lastFour || !cardBrand || !expiryMonth || !expiryYear) {
          throw new AppError('Card details are required', 400);
        }

        // Validate expiry date
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
          throw new AppError('Card has expired', 400);
        }
      }

      // Validate M-Pesa-specific fields
      if (methodType === 'MPESA_STK_PUSH' && !phoneNumber) {
        throw new AppError('Phone number is required for M-Pesa', 400);
      }

      // If setting as default, unset others
      if (isDefault) {
        await prisma.paymentMethod.updateMany({
          where: { residentId, isActive: true },
          data: { isDefault: false },
        });
      }

      // Create payment method
      const method = await prisma.paymentMethod.create({
        data: {
          residentId,
          provider: provider as PaymentProviderType,
          methodType: methodType as PaymentMethodType,
          phoneNumber: phoneNumber || null,
          displayName: displayName || `${provider} - ${lastFour || phoneNumber}`,
          lastFour: lastFour || null,
          cardBrand: cardBrand || null,
          expiryMonth: expiryMonth || null,
          expiryYear: expiryYear || null,
          providerToken: providerToken || null,
          isDefault: isDefault || false,
          isActive: true,
        },
      });

      logger.info(`[PAYMENT_METHOD] Added ${methodType} for resident ${residentId}`, { methodId: method.id });

      res.status(201).json({ success: true, data: method });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set a payment method as default
   */
  async setDefaultMethod(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const residentId = req.user!.userId;
      const { id } = req.params;

      const method = await prisma.paymentMethod.findFirst({
        where: { id, residentId, isActive: true },
      });

      if (!method) {
        throw new AppError('Payment method not found', 404);
      }

      // Unset others
      await prisma.paymentMethod.updateMany({
        where: { residentId, isActive: true },
        data: { isDefault: false },
      });

      // Set default
      const updated = await prisma.paymentMethod.update({
        where: { id },
        data: { isDefault: true },
      });

      logger.info(`[PAYMENT_METHOD] Set default method for resident ${residentId}`, { methodId: id });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const residentId = req.user!.userId;
      const { id } = req.params;

      const method = await prisma.paymentMethod.findFirst({
        where: { id, residentId },
      });

      if (!method) {
        throw new AppError('Payment method not found', 404);
      }

      await prisma.paymentMethod.update({
        where: { id },
        data: { isActive: false, isDefault: false },
      });

      logger.info(`[PAYMENT_METHOD] Deleted method for resident ${residentId}`, { methodId: id });

      res.json({ success: true, message: 'Payment method removed' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate card details (Luhn algorithm)
   */
  private validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cleaned)) return false;

    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Detect card brand from card number
   */
  private detectCardBrand(cardNumber: string): 'VISA' | 'MASTERCARD' | null {
    const cleaned = cardNumber.replace(/\s/g, '');

    if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(cleaned)) {
      return 'VISA';
    }

    if (/^5[1-5][0-9]{14}$/.test(cleaned)) {
      return 'MASTERCARD';
    }

    return null;
  }

  /**
   * Validate card details
   */
  async validateCard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { cardNumber, expiryMonth, expiryYear, cvv } = req.body;

      const errors: string[] = [];

      // Validate card number
      if (!cardNumber || !this.validateCardNumber(cardNumber)) {
        errors.push('Invalid card number');
      }

      // Validate expiry
      if (!expiryMonth || !expiryYear) {
        errors.push('Expiry date is required');
      } else {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
          errors.push('Card has expired');
        }
      }

      // Validate CVV
      if (!cvv || !/^\d{3,4}$/.test(cvv)) {
        errors.push('Invalid CVV');
      }

      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      const cardBrand = this.detectCardBrand(cardNumber);

      res.json({
        success: true,
        data: {
          valid: true,
          cardBrand,
          lastFour: cardNumber.slice(-4),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentMethodController = new PaymentMethodController();
