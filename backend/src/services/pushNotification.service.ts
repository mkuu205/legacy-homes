import { PrismaClient } from '@prisma/client';
import firebaseService from './firebase.service';
import winston from 'winston';

const prisma = new PrismaClient();

class PushNotificationService {
  private async getResidentTokens(residentId: string): Promise<string[]> {
    const tokens = await prisma.deviceToken.findMany({
      where: {
        residentId,
        active: true,
      },
      select: {
        token: true,
      },
    });
    return tokens.map((t) => t.token);
  }

  async sendPaymentSuccess(residentId: string, amount: number) {
    const tokens = await this.getResidentTokens(residentId);
    if (tokens.length === 0) return;

    await firebaseService.sendToMultipleDevices(
      tokens,
      'Payment Successful',
      `Your payment of KES ${amount} has been received successfully.`,
      { link: '/dashboard/payments' }
    );
  }

  async sendPaymentFailed(residentId: string, amount: number) {
    const tokens = await this.getResidentTokens(residentId);
    if (tokens.length === 0) return;

    await firebaseService.sendToMultipleDevices(
      tokens,
      'Payment Failed',
      `Your payment of KES ${amount} could not be completed.`,
      { link: '/dashboard/payments' }
    );
  }

  async sendBillGenerated(residentId: string, month: string, amount: number) {
    const tokens = await this.getResidentTokens(residentId);
    if (tokens.length === 0) return;

    await firebaseService.sendToMultipleDevices(
      tokens,
      'New Water Bill',
      `Your water bill for ${month} (KES ${amount}) is now available.`,
      { link: '/dashboard/billing' }
    );
  }

  async sendPaymentReminder(residentId: string, amount: number, dueDate: string) {
    const tokens = await this.getResidentTokens(residentId);
    if (tokens.length === 0) return;

    await firebaseService.sendToMultipleDevices(
      tokens,
      'Payment Reminder',
      `Your water bill of KES ${amount} is due on ${dueDate}.`,
      { link: '/dashboard/billing' }
    );
  }

  async sendMaintenanceNotice(residentId: string, details: string) {
    const tokens = await this.getResidentTokens(residentId);
    if (tokens.length === 0) return;

    await firebaseService.sendToMultipleDevices(
      tokens,
      'Water Maintenance',
      `Scheduled maintenance: ${details}`,
      { link: '/dashboard/notifications' }
    );
  }

  async sendAccountApproved(residentId: string) {
    const tokens = await this.getResidentTokens(residentId);
    if (tokens.length === 0) return;

    await firebaseService.sendToMultipleDevices(
      tokens,
      'Account Approved',
      'Your account has been approved. Welcome to Legacy Homes!',
      { link: '/dashboard' }
    );
  }

  async sendAccountSuspended(residentId: string, reason: string) {
    const tokens = await this.getResidentTokens(residentId);
    if (tokens.length === 0) return;

    await firebaseService.sendToMultipleDevices(
      tokens,
      'Account Suspended',
      `Your account has been suspended. Reason: ${reason}`,
      { link: '/support' }
    );
  }

  async sendProfileUpdated(residentId: string) {
    const tokens = await this.getResidentTokens(residentId);
    if (tokens.length === 0) return;

    await firebaseService.sendToMultipleDevices(
      tokens,
      'Profile Updated',
      'Your profile information has been updated successfully.',
      { link: '/dashboard/profile' }
    );
  }
}

export default new PushNotificationService();
