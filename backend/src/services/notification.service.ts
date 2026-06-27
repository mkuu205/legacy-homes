import prisma from '../config/prisma';
import { sendEmail } from '../utils/email';
import { io } from '../server';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import axios from 'axios';

const TALKSASA_API_TOKEN = process.env.TALKSASA_API_TOKEN || '';
const TALKSASA_SENDER_ID = process.env.TALKSASA_SENDER_ID || 'TALK-SASA';
const TALKSASA_API_URL = process.env.TALKSASA_API_URL || 'https://bulksms.talksasa.com/api/v3/';

// Helper function to send SMS via TalkSasa
async function sendTalkSasaSMS(phoneNumber: string, message: string): Promise<void> {
  if (!TALKSASA_API_TOKEN) {
    logger.warn('TalkSasa API key not configured');
    return;
  }

  try {
    let phone = phoneNumber.trim().replace(/\s+/g, '');
    
    // Format to E.164 without the plus sign for TalkSasa
    if (phone.startsWith('0')) {
      phone = '254' + phone.slice(1);
    }
    
    if (phone.startsWith('+')) {
      phone = phone.slice(1);
    }
    
    if (!phone.startsWith('254') && phone.length === 9) {
      phone = '254' + phone;
    }

    const response = await axios.post(`${TALKSASA_API_URL}sms/send`, {
      recipient: phone,
      sender_id: TALKSASA_SENDER_ID,
      type: 'plain',
      message: message,
    }, {
      headers: {
        'Authorization': `Bearer ${TALKSASA_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    logger.info(`TalkSasa SMS sent to ${phone}. Response: ${JSON.stringify(response.data)}`);
  } catch (error: any) {
    const errorData = error.response?.data;
    logger.error('Failed to send TalkSasa SMS:', {
      message: error.message,
      response: errorData,
      phone: phoneNumber
    });
    
    const errorMessage = errorData?.message || error.message || 'TalkSasa SMS delivery failed';
    throw new Error(`TalkSasa Error: ${errorMessage}`);
  }
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

// Extend NotificationService interface
declare global {
  namespace Express {
    interface NotificationService {
      sendBillGeneratedNotification(residentId: string, billNumber: string, totalAmount: number): Promise<void>;
      sendPaymentSuccessNotification(residentId: string, paymentAmount: number, mpesaCode?: string): Promise<void>;
    }
  }
}

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

    // BROADCAST FILTERING LOGIC
    if (data.targetAll) {
      // 1. All Residents
      const residents = await prisma.user.findMany({
        where: {
          role: 'RESIDENT',
        },
        select: {
          id: true,
        },
      });
      residentIds = residents.map((r) => r.id);
    } else if (data.targetGroup === 'active') {
      // 2. Active Residents Only
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
      // 3. Residents with Overdue Bills
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
    } else if (data.targetGroup === 'unpaid') {
      // 4. Residents with Unpaid Bills
      const unpaidBills = await prisma.bill.findMany({
        where: {
          status: { in: ['UNPAID', 'OVERDUE', 'PARTIAL'] },
        },
        select: {
          residentId: true,
        },
        distinct: ['residentId'],
      });
      residentIds = unpaidBills.map((b) => b.residentId);
    } else if (data.targetGroup?.startsWith('house:')) {
      // 5. Residents of a selected house
      const houseId = data.targetGroup.split(':')[1];
      const residents = await prisma.user.findMany({
        where: {
          role: 'RESIDENT',
          houseId: houseId,
        },
        select: {
          id: true,
        },
      });
      residentIds = residents.map((r) => r.id);
    } else if (data.targetResidentIds?.length) {
      // 6. Individual Residents
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
        // According to requirements, do NOT send SMS for general notifications
        // only for specific automated events (Bill, Payment, Reminder, Outage, Emergency)
        if (channel === 'SMS') {
          const allowedSmsTypes = ['BILLING_ALERT', 'PAYMENT_CONFIRMATION', 'BILLING_REMINDER', 'WATER_OUTAGE', 'EMERGENCY'];
          if (!allowedSmsTypes.includes(data.type)) {
             continue; 
          }
        }

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
                <h2 style="color:#fff;margin:0;font-size:24px;font-weight:bold;">Legacy Homes</h2>
                <p style="color:#e0e7ff;margin:8px 0 0 0;font-size:12px;">Water Billing System</p>
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

      if (channel === 'SMS') {
        try {
          if (TALKSASA_API_TOKEN) {
            await sendTalkSasaSMS(resident.phone, `${title}: ${message}`);
          } else {
            throw new Error('TalkSasa API key not configured');
          }

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
        } catch (error) {
          logger.error('Failed to send SMS:', error);
          throw error;
        }
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

    // Get updated unread count and emit
    const unreadCount = await prisma.userNotification.count({
      where: {
        userId,
        channel: 'IN_APP',
        status: { not: 'READ' }
      }
    });
    io.to(`user_${userId}`).emit('unread_count_update', { unreadCount });

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

    // Emit updated count (0)
    io.to(`user_${userId}`).emit('unread_count_update', { unreadCount: 0 });

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

    const [notifications, total, unreadCount] = await Promise.all([
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

      // Count all unread (PENDING) user notifications across all residents
      prisma.userNotification.count({
        where: { status: 'PENDING' },
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
      unreadCount,
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

  async sendBillGeneratedNotification(
    residentId: string,
    billNumber: string,
    totalAmount: number
  ) {
    const resident = await prisma.user.findUnique({
      where: { id: residentId },
      select: { id: true, fullName: true, email: true, phone: true },
    });

    if (!resident) throw new AppError('Resident not found', 404);

    // Send SMS
    if (TALKSASA_API_TOKEN) {
      try {
        await sendTalkSasaSMS(
          resident.phone,
          `Legacy Homes: Your water bill ${billNumber} for KES ${totalAmount.toFixed(2)} has been generated. Please log in to pay.`
        );
      } catch (error) {
        logger.error('Failed to send bill notification SMS:', error);
      }
    }

    // Send Email
    try {
      await sendEmail({
        to: resident.email,
        subject: 'Your Water Bill - Legacy Homes',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
              <h2 style="color:#fff;margin:0;font-size:24px;font-weight:bold;">Legacy Homes</h2>
              <p style="color:#e0e7ff;margin:8px 0 0 0;font-size:12px;">Water Billing System</p>
            </div>
            <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
              <h3 style="color:#1e293b;">Your Water Bill is Ready</h3>
              <p style="color:#64748b;line-height:1.6;">Dear ${resident.fullName},</p>
              <p style="color:#64748b;line-height:1.6;">Your water bill for this month has been generated and is ready for payment.</p>
              <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin:16px 0;">
                <p style="margin:0;color:#1e293b;"><strong>Bill Number:</strong> ${billNumber}</p>
                <p style="margin:8px 0 0 0;color:#1e293b;"><strong>Amount Due:</strong> KES ${totalAmount.toFixed(2)}</p>
              </div>
              <p style="color:#64748b;line-height:1.6;">Please log in to your account to view the full bill details and make payment.</p>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Legacy Homes Water Billing System</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      logger.error('Failed to send bill notification email:', error);
    }
  }

  async sendPaymentSuccessNotification(
    residentId: string,
    paymentAmount: number,
    mpesaCode?: string
  ) {
    const resident = await prisma.user.findUnique({
      where: { id: residentId },
      select: { id: true, fullName: true, email: true, phone: true },
    });

    if (!resident) throw new AppError('Resident not found', 404);

    const title = 'Payment Received';
    const message = `Payment of KES ${paymentAmount.toFixed(2)} received successfully. Ref: ${mpesaCode || 'N/A'}. Thank you.`;

    // 1. Create In-App Notification Record
    try {
      const notification = await prisma.notification.create({
        data: {
          title,
          message,
          type: 'PAYMENT_CONFIRMATION',
          channels: ['IN_APP', 'EMAIL', 'SMS'],
          sentBy: 'SYSTEM',
        },
      });

      await prisma.userNotification.create({
        data: {
          notificationId: notification.id,
          userId: resident.id,
          channel: 'IN_APP',
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });

      // Emit via Socket.io
      io.to(`user_${resident.id}`).emit('notification', {
        title,
        message,
        notificationId: notification.id,
      });
    } catch (error) {
      logger.error('Failed to create in-app notification for payment success:', error);
    }

    // 2. Send SMS
    if (TALKSASA_API_TOKEN) {
      try {
        await sendTalkSasaSMS(resident.phone, `Legacy Homes: ${message}`);
      } catch (error) {
        logger.error('Failed to send payment success SMS:', error);
      }
    }

    // 3. Send Email
    try {
      await sendEmail({
        to: resident.email,
        subject: 'Payment Received - Legacy Homes',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
              <h2 style="color:#fff;margin:0;font-size:24px;font-weight:bold;">Legacy Homes</h2>
              <p style="color:#e0e7ff;margin:8px 0 0 0;font-size:12px;">Water Billing System</p>
            </div>
            <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
              <h3 style="color:#1e293b;">Payment Received</h3>
              <p style="color:#64748b;line-height:1.6;">Dear ${resident.fullName},</p>
              <p style="color:#64748b;line-height:1.6;">Thank you for your payment. Your transaction has been processed successfully.</p>
              <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin:16px 0;">
                <p style="margin:0;color:#1e293b;"><strong>Amount Paid:</strong> KES ${paymentAmount.toFixed(2)}</p>
                ${mpesaCode ? `<p style="margin:8px 0 0 0;color:#1e293b;"><strong>M-Pesa Code:</strong> ${mpesaCode}</p>` : ''}
                <p style="margin:8px 0 0 0;color:#1e293b;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-KE')}</p>
              </div>
              <p style="color:#64748b;line-height:1.6;">Your receipt has been generated and is available in your account.</p>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Legacy Homes Water Billing System</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      logger.error('Failed to send payment success email:', error);
    }
  }

  async markAsUnread(userId: string, notificationId: string) {
    const notification = await prisma.userNotification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) throw new AppError('Notification not found', 404);

    await prisma.userNotification.update({
      where: { id: notificationId },
      data: { status: 'PENDING', readAt: null },
    });

    return { message: 'Notification marked as unread' };
  }

  async deleteOne(userId: string, notificationId: string) {
    const notification = await prisma.userNotification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) throw new AppError('Notification not found', 404);

    await prisma.userNotification.delete({
      where: { id: notificationId },
    });

    // Get updated unread count and emit
    const unreadCount = await prisma.userNotification.count({
      where: {
        userId,
        channel: 'IN_APP',
        status: { not: 'READ' }
      }
    });
    io.to(`user_${userId}`).emit('unread_count_update', { unreadCount });

    return { message: 'Notification deleted' };
  }

  async getNotificationLogs(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.notification.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count(),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

export const notificationService = new NotificationService();
