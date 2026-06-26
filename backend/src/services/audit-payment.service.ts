import { prisma } from '@/config/prisma';
import { logger } from '@/utils/logger';

export class AuditPaymentService {
  /**
   * Log payment transaction
   */
  async logPaymentTransaction(
    userId: string,
    action: string,
    paymentId: string,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId,
          action: `PAYMENT_${action}`,
          resource: 'PAYMENT',
          resourceId: paymentId,
          details,
          ipAddress,
          userAgent,
        },
      });

      logger.info(`Payment audit logged: ${action} for payment ${paymentId}`);
      return auditLog;
    } catch (error) {
      logger.error('Payment audit logging error:', error);
      throw error;
    }
  }

  /**
   * Log callback received
   */
  async logCallbackReceived(
    provider: string,
    payload: Record<string, any>,
    headers?: Record<string, any>
  ) {
    try {
      const auditLog = await prisma.callbackAudit.create({
        data: {
          provider,
          payload,
          headers,
          processed: false,
        },
      });

      logger.info(`Callback received from ${provider}`);
      return auditLog;
    } catch (error) {
      logger.error('Callback audit logging error:', error);
      throw error;
    }
  }

  /**
   * Get payment audit logs
   */
  async getPaymentAuditLogs(paymentId: string) {
    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          resourceId: paymentId,
          action: {
            startsWith: 'PAYMENT_',
          },
        },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      });

      return logs;
    } catch (error) {
      logger.error('Error fetching payment audit logs:', error);
      throw error;
    }
  }

  /**
   * Get callback audit logs
   */
  async getCallbackAuditLogs(provider?: string, limit: number = 100) {
    try {
      const logs = await prisma.callbackAudit.findMany({
        where: provider ? { provider } : {},
        orderBy: { receivedAt: 'desc' },
        take: limit,
      });

      return logs;
    } catch (error) {
      logger.error('Error fetching callback audit logs:', error);
      throw error;
    }
  }

  /**
   * Get unprocessed callbacks
   */
  async getUnprocessedCallbacks(provider?: string) {
    try {
      const logs = await prisma.callbackAudit.findMany({
        where: {
          processed: false,
          ...(provider && { provider }),
        },
        orderBy: { receivedAt: 'asc' },
      });

      return logs;
    } catch (error) {
      logger.error('Error fetching unprocessed callbacks:', error);
      throw error;
    }
  }

  /**
   * Mark callback as processed
   */
  async markCallbackAsProcessed(callbackId: string, result: Record<string, any>) {
    try {
      const log = await prisma.callbackAudit.update({
        where: { id: callbackId },
        data: {
          processed: true,
          processingResult: JSON.stringify(result),
        },
      });

      logger.info(`Callback marked as processed: ${callbackId}`);
      return log;
    } catch (error) {
      logger.error('Error marking callback as processed:', error);
      throw error;
    }
  }

  /**
   * Get transaction audit trail
   */
  async getTransactionAuditTrail(paymentId: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      const auditLogs = await this.getPaymentAuditLogs(paymentId);

      const trail = {
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          provider: payment.provider,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        },
        auditTrail: auditLogs.map(log => ({
          timestamp: log.createdAt,
          action: log.action,
          details: log.details,
          user: log.user?.fullName,
          ipAddress: log.ipAddress,
        })),
      };

      return trail;
    } catch (error) {
      logger.error('Error fetching transaction audit trail:', error);
      throw error;
    }
  }
}
