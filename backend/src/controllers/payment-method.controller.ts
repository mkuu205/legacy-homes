import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { PaymentProviderType, PaymentMethodType } from '@prisma/client';

export class PaymentMethodController {
  async getPaymentMethods(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const residentId = req.user!.userId;
      const methods = await prisma.paymentMethod.findMany({
        where: { residentId, isActive: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: methods });
    } catch (error) { next(error); }
  }

  async addPaymentMethod(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const residentId = req.user!.userId;
      const { provider, methodType, phoneNumber, displayName } = req.body;
      
      // If setting as default, unset others
      if (req.body.isDefault) {
        await prisma.paymentMethod.updateMany({
          where: { residentId },
          data: { isDefault: false }
        });
      }

      const method = await prisma.paymentMethod.create({
        data: {
          residentId,
          provider: provider as PaymentProviderType,
          methodType: methodType as PaymentMethodType,
          phoneNumber,
          displayName: displayName || `${provider} - ${phoneNumber}`,
          isDefault: req.body.isDefault || false
        }
      });
      res.status(201).json({ success: true, data: method });
    } catch (error) { next(error); }
  }

  async setDefaultMethod(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const residentId = req.user!.userId;
      const { id } = req.params;

      const method = await prisma.paymentMethod.findFirst({
        where: { id, residentId }
      });

      if (!method) throw new AppError('Payment method not found', 404);

      // Unset others
      await prisma.paymentMethod.updateMany({
        where: { residentId },
        data: { isDefault: false }
      });

      // Set default
      const updated = await prisma.paymentMethod.update({
        where: { id },
        data: { isDefault: true }
      });

      res.json({ success: true, data: updated });
    } catch (error) { next(error); }
  }

  async deletePaymentMethod(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const residentId = req.user!.userId;
      const { id } = req.params;

      const method = await prisma.paymentMethod.findFirst({
        where: { id, residentId }
      });

      if (!method) throw new AppError('Payment method not found', 404);

      await prisma.paymentMethod.update({
        where: { id },
        data: { isActive: false, isDefault: false }
      });

      res.json({ success: true, message: 'Payment method removed' });
    } catch (error) { next(error); }
  }
}

export const paymentMethodController = new PaymentMethodController();
