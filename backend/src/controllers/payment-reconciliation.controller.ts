import { Request, Response } from "express";
import paymentReconciliationService from "../services/payment-reconciliation.service";
import { PaymentReconciliationStatus } from "@prisma/client";
import logger from "../utils/logger";

export class PaymentReconciliationController {
  // Get unreconciled payments
  async getUnreconciledPayments(req: Request, res: Response): Promise<void> {
    try {
      const { skip = 0, take = 50 } = req.query;

      const payments = await paymentReconciliationService.getUnreconciledPayments(
        parseInt(skip as string),
        parseInt(take as string)
      );

      res.json(payments);
    } catch (error) {
      logger.error(`Error fetching unreconciled payments: ${error}`);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  }

  // Get mismatched payments
  async getMismatchedPayments(req: Request, res: Response): Promise<void> {
    try {
      const { skip = 0, take = 50 } = req.query;

      const payments = await paymentReconciliationService.getMismatchedPayments(
        parseInt(skip as string),
        parseInt(take as string)
      );

      res.json(payments);
    } catch (error) {
      logger.error(`Error fetching mismatched payments: ${error}`);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  }

  // Get orphaned payments
  async getOrphanedPayments(req: Request, res: Response): Promise<void> {
    try {
      const { skip = 0, take = 50 } = req.query;

      const payments = await paymentReconciliationService.getOrphanedPayments(
        parseInt(skip as string),
        parseInt(take as string)
      );

      res.json(payments);
    } catch (error) {
      logger.error(`Error fetching orphaned payments: ${error}`);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  }

  // Get reconciliation stats
  async getReconciliationStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await paymentReconciliationService.getReconciliationStats();

      res.json(stats);
    } catch (error) {
      logger.error(`Error getting reconciliation stats: ${error}`);
      res.status(500).json({ error: "Failed to get stats" });
    }
  }

  // Reconcile payment
  async reconcilePayment(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { status } = req.body;

      if (!status || !Object.values(PaymentReconciliationStatus).includes(status)) {
        res.status(400).json({ error: "Invalid reconciliation status" });
        return;
      }

      const payment = await paymentReconciliationService.reconcilePayment(
        paymentId as string,
        status
      );

      res.json(payment);
    } catch (error) {
      logger.error(`Error reconciling payment: ${error}`);
      res.status(500).json({ error: "Failed to reconcile payment" });
    }
  }

  // Auto-reconcile payments
  async autoReconcilePayments(req: Request, res: Response): Promise<void> {
    try {
      const count = await paymentReconciliationService.autoReconcilePayments();

      res.json({ message: `${count} payments auto-reconciled` });
    } catch (error) {
      logger.error(`Error auto-reconciling payments: ${error}`);
      res.status(500).json({ error: "Failed to auto-reconcile payments" });
    }
  }

  // Generate reconciliation report
  async generateReconciliationReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const report = await paymentReconciliationService.generateReconciliationReport(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json(report);
    } catch (error) {
      logger.error(`Error generating reconciliation report: ${error}`);
      res.status(500).json({ error: "Failed to generate report" });
    }
  }

  // Bulk reconcile payments
  async bulkReconcilePayments(req: Request, res: Response): Promise<void> {
    try {
      const { paymentIds, status } = req.body;

      if (!Array.isArray(paymentIds) || !status) {
        res.status(400).json({ error: "Payment IDs and status are required" });
        return;
      }

      const count = await paymentReconciliationService.bulkReconcilePayments(
        paymentIds,
        status
      );

      res.json({ message: `${count} payments reconciled` });
    } catch (error) {
      logger.error(`Error bulk reconciling payments: ${error}`);
      res.status(500).json({ error: "Failed to reconcile payments" });
    }
  }
}

export default new PaymentReconciliationController();
