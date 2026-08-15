import prisma from '../config/prisma';
import { emailService } from './email.service';
import { logger } from '../utils/logger';

export class OutageService {
  /**
   * Subscribe to outage notifications
   */
  async subscribe(email: string) {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // Check for existing active subscription that hasn't been notified yet
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await prisma.outageSubscription.findFirst({
        where: {
          email: normalizedEmail,
          isActive: true,
          isNotified: false,
        },
      });

      if (existing) {
        return existing;
      }

      // Create new subscription
      const subscription = await prisma.outageSubscription.create({
        data: {
          email: normalizedEmail,
          isActive: true,
          isNotified: false,
        },
      });

      logger.info(`New outage subscription registered: ${normalizedEmail}`);
      return subscription;
    } catch (error) {
      logger.error(`Error subscribing to outage notifications for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Send recovery notifications for all pending subscriptions.
   * This is intentionally invoked by an independent monitor after recovery.
   */
  /**
   * Notify all active subscribers and mark as notified
   */
  async notifySubscribers() {
    try {
      const subscribers = await prisma.outageSubscription.findMany({
        where: {
          isActive: true,
          isNotified: false,
        },
      });

      if (subscribers.length === 0) {
        logger.info('No pending outage notifications to send');
        return;
      }

      logger.info(`Sending recovery emails to ${subscribers.length} subscribers`);

      for (const subscriber of subscribers) {
        try {
          await emailService.sendSystemBackOnlineEmail(subscriber.email);
          
          await prisma.outageSubscription.update({
            where: { id: subscriber.id },
            data: {
              isNotified: true,
              notifiedAt: new Date(),
              isActive: false, // Deactivate after notification as per requirements
            },
          });
          
          logger.info(`Recovery email sent and marked as notified: ${subscriber.email}`);
        } catch (emailError) {
          logger.error(`Failed to notify subscriber ${subscriber.email}:`, emailError);
        }
      }

      logger.info('All pending recovery notifications processed');
    } catch (error) {
      logger.error('Error notifying subscribers during recovery:', error);
    }
  }
}

export const outageService = new OutageService();
