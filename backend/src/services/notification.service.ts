import prisma from '../config/prisma';
import { sendEmail } from '../utils/email';
import { io } from '../server';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

let AT: any = null;

try {
  const AfricasTalking = require('africastalking');

  AT = AfricasTalking({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
  });
} catch {
  logger.warn("Africa's Talking not initialized");
}

const VALID_NOTIFICATION_TYPES = [
  'MAINTENANCE',
  'WATER_OUTAGE',
  'BILLING_REMINDER',
  'PAYMENT_REMINDER',
  'EMERGENCY',
  'ESTATE_COMMUNICATION',
  'PAYMENT_CONFIRMATION',
  'BILLING_ALERT',
];

const VALID_CHANNELS = ['IN_APP', 'EMAIL', 'SMS'];

export class NotificationService {
  async sendBroadcast(data: {
    title: string;
    message: string;
    type: string;
    channels: string[];
    sentBy: string;
    targetAll?: boolean;
    targetGroup?: string;
    targetResidentIds?: string[];
  }) {
    let residentIds: string[] = [];

    if (!VALID_NOTIFICATION_TYPES.includes(data.type)) {
      throw new AppError(
        `Invalid notification type. Allowed: ${VALID_NOTIFICATION_TYPES.join(', ')}`,
        400
      );
    }

    const invalidChannels = data.channels.filter(
      (c) => !VALID_CHANNELS.includes(c)
    );

    if (invalidChannels.length > 0) {
      throw new AppError(
        `Invalid channels: ${invalidChannels.join(', ')}`,
        400
      );
    }

    if (data.targetAll) {
      const residents = await prisma.user.findMany({
        where: {
          role: 'RESIDENT',
          accountStatus: 'ACTIVE',
        },
        select: {
          id: true,
        },
      });

      residentIds = residents.map((r) => r.id);
    } else if (data.targetGroup === 'overdue') {
      const overdueBills = await prisma.bill.findMany({
        where: {
          status: 'OVERDUE',
        },
        select: {
          residentId: true,
        },
        distinct: ['residentId'],
      });

      residentIds = overdueBills.map((b) => b.residentId);
    } else if (data.targetResidentIds?.length) {
      residentIds = data.targetResidentIds;
    }

    if (residentIds.length === 0) {
      throw new AppError('No target residents found', 400);
    }

    const notification = await prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type as any,
        channels: data.channels as any,
        sentBy: data.sentBy,
        targetAll: data.targetAll || false,
        targetGroup: data.targetGroup,
      },
    });

    const userNotifications = [];

    for (const userId of residentIds) {
      for (const channel of data.channels) {
        userNotifications.push({
          notificationId: notification.id,
          userId,
          channel: channel as any,
          status: 'PENDING',
        });
      }
    }

    await prisma.userNotification.createMany({
      data: userNotifications,
    });

    const residents = await prisma.user.findMany({
      where: {
        id: {
          in: residentIds,
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
      },
    });

    for (const resident of residents) {
      for (const channel of data.channels) {
        await this.deliverNotification(
          notification.id,
          resident,
          channel,
          data.title,
          data.message
        );
      }
    }

    return {
      notification,
      sent: residentIds.length,
    };
  }

  private async deliverNotification(
    notificationId: string,
    resident: {
      id: string;
      fullName: string;
      email: string;
      phone: string;
    },
    channel: string,
    title: string,
    message: string
  ) {
    try {
      if (channel === 'IN_APP') {
        io.to(`user_${resident.id}`).emit('notification', {
          title,
          message,
          notificationId,
        });

        await prisma.userNotification.updateMany({
          where: {
            notificationId,
            userId: resident.id,
            channel: 'IN_APP',
          },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
          },
        });
      }

      if (channel === 'EMAIL') {
        await sendEmail({
          to: resident.email,
          subject: `${title} - Legacy Homes`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;">
              <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
                <h2 style="color:#fff;margin:0;">ðŸ’§ Legacy Homes</h2>
              </div>
              <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
                <h3 style="color:#1e293b;">${title}</h3>
                <p style="color:#64748b;line-height:1.6;">${message}</p>
                <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Legacy Homes Water Billing System</p>
              </div>
            </div>
          `,
        });

        await prisma.userNotification.updateMany({
          where: {
            notificationId,
            userId: resident.id,
            channel: 'EMAIL',
          },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
          },
        });
      }

      if (channel === 'SMS' && AT) {
        const sms = AT.SMS;
        let phone = resident.phone;

        if (phone.startsWith('0')) {
          phone = '+254' + phone.slice(1);
        }

        if (!phone.startsWith('+')) {
          phone = '+' + phone;
        }

        await sms.send({
          to: [phone],
          message: `${title}: ${message}`,
          from: process.env.AT_SENDER_ID,
        });

        await prisma.userNotification.updateMany({
          where: {
            notificationId,
            userId: resident.id,
            channel: 'SMS',
          },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
          },
        });
      }
    } catch (error) {
      logger.error(
        `Failed to deliver ${channel} notification to ${resident.id}:`,
        error
      );

      await prisma.userNotification.updateMany({
        where: {
          notificationId,
          userId: resident.id,
          channel: channel as any,
        },
        data: {
          status: 'FAILED',
        },
      });
    }
  }

  async getResidentNotifications(
    userId: string,
    query: {
      page?: number | string;
      limit?: number | string;
    }
  ) {
    const pageNum = Number.parseInt(String(query?.page || 1), 10);
    const limitNum = Number.parseInt(String(query?.limit || 20), 10);
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unread] = await Promise.all([
      prisma.userNotification.findMany({
        where: {
          userId,
          channel: 'IN_APP',
        },
        skip,
        take: limitNum,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          notification: true,
        },
      }),

      prisma.userNotification.count({
        where: {
          userId,
          channel: 'IN_APP',
        },
      }),

      prisma.userNotification.count({
        where: {
          userId,
          channel: 'IN_APP',
          status: {
            not: 'READ',
          },
        },
      }),
    ]);

    return {
      notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      unread,
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    await prisma.userNotification.updateMany({
      where: {
        userId,
        notificationId,
        channel: 'IN_APP',
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    return {
      message: 'Notification marked as read',
    };
  }

  async markAllAsRead(userId: string) {
    await prisma.userNotification.updateMany({
      where: {
        userId,
        channel: 'IN_APP',
        status: {
          not: 'READ',
        },
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    return {
      message: 'All notifications marked as read',
    };
  }

  async getAllNotifications(query: {
    page?: number | string;
    limit?: number | string;
  }) {
    const pageNum = Number.parseInt(String(query?.page || 1), 10);
    const limitNum = Number.parseInt(String(query?.limit || 20), 10);
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        skip,
        take: limitNum,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          _count: {
            select: {
              userNotifications: true,
            },
          },
        },
      }),

      prisma.notification.count(),
    ]);

    return {
      notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async deleteAllResidentNotifications(userId: string) {
    await prisma.userNotification.deleteMany({
      where: {
        userId,
        channel: 'IN_APP',
      },
    });

    return {
      message: 'All notifications deleted successfully',
    };
  }

  async adminDeleteAllNotifications() {
    // This will cascade delete userNotifications due to Prisma schema definition
    await prisma.notification.deleteMany({});

    return {
      message: 'All sent notifications deleted successfully',
    };
  }
}

export const notificationService = new NotificationService();
