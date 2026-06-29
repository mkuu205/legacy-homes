import * as admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';
import winston from 'winston';

const prisma = new PrismaClient();

class FirebaseService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.initialized = true;
        winston.info('Firebase Admin initialized successfully');
      } else {
        winston.warn('FIREBASE_SERVICE_ACCOUNT not found in environment variables. Firebase service will not be available.');
      }
    } catch (error) {
      winston.error('Error initializing Firebase Admin:', error);
    }
  }

  async sendToDevice(token: string, title: string, body: string, data?: any) {
    if (!this.initialized) return;

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body,
        },
        data: data || {},
        webpush: {
          fcmOptions: {
            link: data?.link || '/dashboard/notifications',
          },
        },
      };

      await admin.messaging().send(message);
    } catch (error: any) {
      winston.error(`Error sending Firebase message to token ${token}:`, error);
      // Remove invalid tokens automatically
      if (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token') {
        await this.removeInvalidToken(token);
      }
    }
  }

  async sendToMultipleDevices(tokens: string[], title: string, body: string, data?: any) {
    if (!this.initialized || tokens.length === 0) return;

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
        },
        data: data || {},
        webpush: {
          fcmOptions: {
            link: data?.link || '/dashboard/notifications',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            if (resp.error.code === 'messaging/registration-token-not-registered' || resp.error.code === 'messaging/invalid-registration-token') {
              invalidTokens.push(tokens[idx]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          await this.removeInvalidTokens(invalidTokens);
        }
      }
    } catch (error) {
      winston.error('Error sending multicast Firebase message:', error);
    }
  }

  private async removeInvalidToken(token: string) {
    try {
      await prisma.deviceToken.update({
        where: { token },
        data: { active: false },
      });
      winston.info(`Marked invalid token as inactive: ${token}`);
    } catch (error) {
      winston.error(`Error marking invalid token ${token}:`, error);
    }
  }

  private async removeInvalidTokens(tokens: string[]) {
    try {
      await prisma.deviceToken.updateMany({
        where: { token: { in: tokens } },
        data: { active: false },
      });
      winston.info(`Marked ${tokens.length} invalid tokens as inactive`);
    } catch (error) {
      winston.error('Error marking multiple invalid tokens:', error);
    }
  }
}

export default new FirebaseService();
