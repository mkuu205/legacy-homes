import { prisma } from '@/config/prisma';
import { logger } from '@/utils/logger';
import { NotificationType, NotificationChannel, NotificationStatus } from '@prisma/client';

export class NotificationEngineService {
  /**
   * Create and send notification
   */
  async createNotification(
    title: string,
    message: string,
    type: NotificationType,
    channels: NotificationChannel[],
    userIds?: string[],
    targetAll: boolean = false,
    targetGroup?: string
  ) {
    try {
      // Create notification
      const notification = await prisma.notification.create({
        data: {
          title,
          message,
          type,
          channels,
          targetAll,
          targetGroup,
          sentBy: 'SYSTEM',
        },
      });

      // Get target users
      let users;
      if (targetAll) {
        users = await prisma.user.findMany({
          where: { role: 'RESIDENT' },
          select: { id: true },
        });
      } else if (targetGroup) {
        // TODO: Implement group targeting
        users = [];
      } else if (userIds && userIds.length > 0) {
        users = userIds.map(id => ({ id }));
      } else {
        users = [];
      }

      // Create user notifications for each channel
      const userNotifications = [];
      for (const user of users) {
        for (const channel of channels) {
          const userNotification = await prisma.userNotification.create({
            data: {
              notificationId: notification.id,
              userId: user.id,
              channel,
              status: NotificationStatus.PENDING,
            },
          });
          userNotifications.push(userNotification);
        }
      }

      logger.info(`Notification created: ${notification.id} for ${users.length} users`);

      return {
        notification,
        userNotifications,
      };
    } catch (error) {
      logger.error('Notification creation error:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(userNotificationId: string) {
    try {
      const userNotification = await prisma.userNotification.update({
        where: { id: userNotificationId },
        data: {
          status: NotificationStatus.READ,
          readAt: new Date(),
        },
      });

      logger.info(`Notification marked as read: ${userNotificationId}`);
      return userNotification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: string) {
    try {
      const result = await prisma.userNotification.updateMany({
        where: {
          userId,
          status: NotificationStatus.PENDING,
        },
        data: {
          status: NotificationStatus.READ,
          readAt: new Date(),
        },
      });

      logger.info(`Marked ${result.count} notifications as read for user ${userId}`);
      return result;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const count = await prisma.userNotification.count({
        where: {
          userId,
          status: NotificationStatus.PENDING,
        },
      });

      return count;
    } catch (error) {
      logger.error('Error fetching unread notification count:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, limit: number = 20) {
    try {
      const notifications = await prisma.userNotification.findMany({
        where: { userId },
        include: { notification: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return notifications;
    } catch (error) {
      logger.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(userNotificationId: string) {
    try {
      const userNotification = await prisma.userNotification.delete({
        where: { id: userNotificationId },
      });

      logger.info(`Notification deleted: ${userNotificationId}`);
      return userNotification;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotificationsForUser(userId: string) {
    try {
      const result = await prisma.userNotification.deleteMany({
        where: { userId },
      });

      logger.info(`Deleted ${result.count} notifications for user ${userId}`);
      return result;
    } catch (error) {
      logger.error('Error deleting all notifications for user:', error);
      throw error;
    }
  }

  /**
   * Send bill generated notification
   */
  async sendBillGeneratedNotification(userId: string, billNumber: string, amount: number) {
    try {
      return await this.createNotification(
        'Bill Generated',
        `Your bill ${billNumber} for KES ${amount.toLocaleString()} has been generated.`,
        NotificationType.BILL_GENERATED,
        [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
        [userId]
      );
    } catch (error) {
      logger.error('Error sending bill generated notification:', error);
      throw error;
    }
  }

  /**
   * Send bill due soon notification
   */
  async sendBillDueSoonNotification(userId: string, billNumber: string, dueDate: Date) {
    try {
      return await this.createNotification(
        'Bill Due Soon',
        `Your bill ${billNumber} is due on ${dueDate.toLocaleDateString('en-KE')}.`,
        NotificationType.BILL_DUE_SOON,
        [NotificationChannel.IN_APP, NotificationChannel.SMS],
        [userId]
      );
    } catch (error) {
      logger.error('Error sending bill due soon notification:', error);
      throw error;
    }
  }

  /**
   * Send bill overdue notification
   */
  async sendBillOverdueNotification(userId: string, billNumber: string, overdueDays: number) {
    try {
      return await this.createNotification(
        'Bill Overdue',
        `Your bill ${billNumber} is overdue by ${overdueDays} day(s). Please pay immediately.`,
        NotificationType.BILL_OVERDUE,
        [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
        [userId]
      );
    } catch (error) {
      logger.error('Error sending bill overdue notification:', error);
      throw error;
    }
  }

  /**
   * Send payment successful notification
   */
  async sendPaymentSuccessfulNotification(userId: string, amount: number, billNumber: string) {
    try {
      return await this.createNotification(
        'Payment Successful',
        `Your payment of KES ${amount.toLocaleString()} for bill ${billNumber} has been received.`,
        NotificationType.PAYMENT_SUCCESSFUL,
        [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
        [userId]
      );
    } catch (error) {
      logger.error('Error sending payment successful notification:', error);
      throw error;
    }
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailedNotification(userId: string, amount: number, reason: string) {
    try {
      return await this.createNotification(
        'Payment Failed',
        `Your payment of KES ${amount.toLocaleString()} failed. Reason: ${reason}`,
        NotificationType.PAYMENT_FAILED,
        [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
        [userId]
      );
    } catch (error) {
      logger.error('Error sending payment failed notification:', error);
      throw error;
    }
  }

  /**
   * Send receipt ready notification
   */
  async sendReceiptReadyNotification(userId: string, receiptNumber: string) {
    try {
      return await this.createNotification(
        'Receipt Ready',
        `Your receipt ${receiptNumber} is ready for download.`,
        NotificationType.RECEIPT_READY,
        [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        [userId]
      );
    } catch (error) {
      logger.error('Error sending receipt ready notification:', error);
      throw error;
    }
  }
}
