"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const email_1 = require("../utils/email");
const server_1 = require("../server");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
let AT = null;
let TALKSASA_API_KEY = process.env.TALKSASA_API_KEY || '';
let TALKSASA_SENDER_ID = 'TALK-SASA';
try {
    const AfricasTalking = require('africastalking');
    AT = AfricasTalking({
        apiKey: process.env.AT_API_KEY,
        username: process.env.AT_USERNAME,
    });
}
catch {
    logger_1.logger.warn("Africa's Talking not initialized");
}
// Helper function to send SMS via TalkSasa
async function sendTalkSasaSMS(phoneNumber, message) {
    if (!TALKSASA_API_KEY) {
        logger_1.logger.warn('TalkSasa API key not configured');
        return;
    }
    try {
        const axios = require('axios');
        let phone = phoneNumber;
        if (phone.startsWith('0')) {
            phone = '254' + phone.slice(1);
        }
        if (phone.startsWith('+')) {
            phone = phone.slice(1);
        }
        if (!phone.startsWith('254')) {
            phone = '254' + phone;
        }
        await axios.post('https://api.talksasa.com/v1/send', {
            phone_number: phone,
            message,
            sender_id: TALKSASA_SENDER_ID,
        }, {
            headers: {
                'Authorization': `Bearer ${TALKSASA_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to send TalkSasa SMS:', error);
        throw error;
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
class NotificationService {
    async sendBroadcast(data) {
        let residentIds = [];
        if (!VALID_NOTIFICATION_TYPES.includes(data.type)) {
            throw new errorHandler_1.AppError(`Invalid notification type. Allowed: ${VALID_NOTIFICATION_TYPES.join(', ')}`, 400);
        }
        const invalidChannels = data.channels.filter((c) => !VALID_CHANNELS.includes(c));
        if (invalidChannels.length > 0) {
            throw new errorHandler_1.AppError(`Invalid channels: ${invalidChannels.join(', ')}`, 400);
        }
        if (data.targetAll) {
            const residents = await prisma_1.default.user.findMany({
                where: {
                    role: 'RESIDENT',
                    accountStatus: 'ACTIVE',
                },
                select: {
                    id: true,
                },
            });
            residentIds = residents.map((r) => r.id);
        }
        else if (data.targetGroup === 'overdue') {
            const overdueBills = await prisma_1.default.bill.findMany({
                where: {
                    status: 'OVERDUE',
                },
                select: {
                    residentId: true,
                },
                distinct: ['residentId'],
            });
            residentIds = overdueBills.map((b) => b.residentId);
        }
        else if (data.targetResidentIds?.length) {
            residentIds = data.targetResidentIds;
        }
        if (residentIds.length === 0) {
            throw new errorHandler_1.AppError('No target residents found', 400);
        }
        const notification = await prisma_1.default.notification.create({
            data: {
                title: data.title,
                message: data.message,
                type: data.type,
                channels: data.channels,
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
                    channel: channel,
                    status: 'PENDING',
                });
            }
        }
        await prisma_1.default.userNotification.createMany({
            data: userNotifications,
        });
        const residents = await prisma_1.default.user.findMany({
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
                await this.deliverNotification(notification.id, resident, channel, data.title, data.message);
            }
        }
        return {
            notification,
            sent: residentIds.length,
        };
    }
    async deliverNotification(notificationId, resident, channel, title, message) {
        try {
            if (channel === 'IN_APP') {
                server_1.io.to(`user_${resident.id}`).emit('notification', {
                    title,
                    message,
                    notificationId,
                });
                await prisma_1.default.userNotification.updateMany({
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
                await (0, email_1.sendEmail)({
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
                await prisma_1.default.userNotification.updateMany({
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
                    // Try TalkSasa first
                    if (TALKSASA_API_KEY) {
                        await sendTalkSasaSMS(resident.phone, `${title}: ${message}`);
                    }
                    else if (AT) {
                        // Fallback to Africa's Talking
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
                    }
                    else {
                        throw new Error('No SMS provider configured');
                    }
                    await prisma_1.default.userNotification.updateMany({
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
                catch (error) {
                    logger_1.logger.error('Failed to send SMS:', error);
                    throw error;
                }
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to deliver ${channel} notification to ${resident.id}:`, error);
            await prisma_1.default.userNotification.updateMany({
                where: {
                    notificationId,
                    userId: resident.id,
                    channel: channel,
                },
                data: {
                    status: 'FAILED',
                },
            });
        }
    }
    async getResidentNotifications(userId, query) {
        const pageNum = Number.parseInt(String(query?.page || 1), 10);
        const limitNum = Number.parseInt(String(query?.limit || 20), 10);
        const skip = (pageNum - 1) * limitNum;
        const [notifications, total, unread] = await Promise.all([
            prisma_1.default.userNotification.findMany({
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
            prisma_1.default.userNotification.count({
                where: {
                    userId,
                    channel: 'IN_APP',
                },
            }),
            prisma_1.default.userNotification.count({
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
    async markAsRead(userId, notificationId) {
        await prisma_1.default.userNotification.updateMany({
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
    async markAllAsRead(userId) {
        await prisma_1.default.userNotification.updateMany({
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
    async getAllNotifications(query) {
        const pageNum = Number.parseInt(String(query?.page || 1), 10);
        const limitNum = Number.parseInt(String(query?.limit || 20), 10);
        const skip = (pageNum - 1) * limitNum;
        const [notifications, total] = await Promise.all([
            prisma_1.default.notification.findMany({
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
            prisma_1.default.notification.count(),
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
    async deleteAllResidentNotifications(userId) {
        await prisma_1.default.userNotification.deleteMany({
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
        await prisma_1.default.notification.deleteMany({});
        return {
            message: 'All sent notifications deleted successfully',
        };
    }
    async sendBillGeneratedNotification(residentId, billNumber, totalAmount) {
        const resident = await prisma_1.default.user.findUnique({
            where: { id: residentId },
            select: { id: true, fullName: true, email: true, phone: true },
        });
        if (!resident)
            throw new errorHandler_1.AppError('Resident not found', 404);
        // Send SMS
        if (TALKSASA_API_KEY) {
            try {
                await sendTalkSasaSMS(resident.phone, `Legacy Homes: Your water bill has been generated. Please log in to view and pay.`);
            }
            catch (error) {
                logger_1.logger.error('Failed to send bill notification SMS:', error);
            }
        }
        // Send Email
        try {
            await (0, email_1.sendEmail)({
                to: resident.email,
                subject: 'Your Water Bill - Legacy Homes',
                html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
              <h2 style="color:#fff;margin:0;">💧 Legacy Homes</h2>
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
        }
        catch (error) {
            logger_1.logger.error('Failed to send bill notification email:', error);
        }
    }
    async sendPaymentSuccessNotification(residentId, paymentAmount, mpesaCode) {
        const resident = await prisma_1.default.user.findUnique({
            where: { id: residentId },
            select: { id: true, fullName: true, email: true, phone: true },
        });
        if (!resident)
            throw new errorHandler_1.AppError('Resident not found', 404);
        // Send SMS
        if (TALKSASA_API_KEY) {
            try {
                await sendTalkSasaSMS(resident.phone, `Legacy Homes: Your payment has been received successfully. Thank you.`);
            }
            catch (error) {
                logger_1.logger.error('Failed to send payment success SMS:', error);
            }
        }
        // Send Email
        try {
            await (0, email_1.sendEmail)({
                to: resident.email,
                subject: 'Payment Received - Legacy Homes',
                html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
              <h2 style="color:#fff;margin:0;">💧 Legacy Homes</h2>
            </div>
            <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
              <h3 style="color:#1e293b;">✓ Payment Received</h3>
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
        }
        catch (error) {
            logger_1.logger.error('Failed to send payment success email:', error);
        }
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
//# sourceMappingURL=notification.service.js.map