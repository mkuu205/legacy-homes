import { Request, Response } from "express";
import enhancedBillingService from "../services/enhanced-billing.service";
import collectionService from "../services/collection.service";
import logger from "../utils/logger";

export class EnhancedBillingController {
  // Lock bill
  async lockBill(req: Request, res: Response): Promise<void> {
    try {
      const { billId } = req.params;

      const bill = await enhancedBillingService.lockBill(billId as string);

      res.json(bill);
    } catch (error) {
      logger.error(`Error locking bill: ${error}`);
      res.status(500).json({ error: "Failed to lock bill" });
    }
  }

  // Unlock bill
  async unlockBill(req: Request, res: Response): Promise<void> {
    try {
      const { billId } = req.params;

      const bill = await enhancedBillingService.unlockBill(billId as string);

      res.json(bill);
    } catch (error) {
      logger.error(`Error unlocking bill: ${error}`);
      res.status(500).json({ error: "Failed to unlock bill" });
    }
  }

  // Create final bill
  async createFinalBill(req: Request, res: Response): Promise<void> {
    try {
      const { residentId } = req.params;
      const { totalAmount, reason } = req.body;

      if (!totalAmount || !reason) {
        res.status(400).json({ error: "Total amount and reason are required" });
        return;
      }

      const bill = await enhancedBillingService.createFinalBill(
        residentId as string,
        { totalAmount, reason }
      );

      res.status(201).json(bill);
    } catch (error) {
      logger.error(`Error creating final bill: ${error}`);
      res.status(500).json({ error: "Failed to create final bill" });
    }
  }

  // Get locked bills
  async getLockedBills(req: Request, res: Response): Promise<void> {
    try {
      const { skip = 0, take = 50 } = req.query;

      const bills = await enhancedBillingService.getLockedBills(
        parseInt(skip as string),
        parseInt(take as string)
      );

      res.json(bills);
    } catch (error) {
      logger.error(`Error fetching locked bills: ${error}`);
      res.status(500).json({ error: "Failed to fetch bills" });
    }
  }

  // Get unpaid bills for collection
  async getUnpaidBillsForCollection(req: Request, res: Response): Promise<void> {
    try {
      const { skip = 0, take = 50 } = req.query;

      const bills = await enhancedBillingService.getUnpaidBillsForCollection(
        parseInt(skip as string),
        parseInt(take as string)
      );

      res.json(bills);
    } catch (error) {
      logger.error(`Error fetching unpaid bills: ${error}`);
      res.status(500).json({ error: "Failed to fetch bills" });
    }
  }

  // Get overdue bills
  async getOverdueBills(req: Request, res: Response): Promise<void> {
    try {
      const { skip = 0, take = 50 } = req.query;

      const bills = await enhancedBillingService.getOverdueBills(
        parseInt(skip as string),
        parseInt(take as string)
      );

      res.json(bills);
    } catch (error) {
      logger.error(`Error fetching overdue bills: ${error}`);
      res.status(500).json({ error: "Failed to fetch bills" });
    }
  }

  // Get collection stats
  async getCollectionStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await enhancedBillingService.getCollectionStats();

      res.json(stats);
    } catch (error) {
      logger.error(`Error getting collection stats: ${error}`);
      res.status(500).json({ error: "Failed to get stats" });
    }
  }

  // Get collection performance by month
  async getCollectionPerformanceByMonth(req: Request, res: Response): Promise<void> {
    try {
      const { months = 12 } = req.query;

      const performance = await enhancedBillingService.getCollectionPerformanceByMonth(
        parseInt(months as string)
      );

      res.json(performance);
    } catch (error) {
      logger.error(`Error getting collection performance: ${error}`);
      res.status(500).json({ error: "Failed to get performance data" });
    }
  }

  // Bulk lock bills for cycle
  async bulkLockBillsForCycle(req: Request, res: Response): Promise<void> {
    try {
      const { billingMonth } = req.body;

      if (!billingMonth) {
        res.status(400).json({ error: "Billing month is required" });
        return;
      }

      const count = await enhancedBillingService.bulkLockBillsForCycle(billingMonth);

      res.json({ message: `${count} bills locked` });
    } catch (error) {
      logger.error(`Error bulk locking bills: ${error}`);
      res.status(500).json({ error: "Failed to lock bills" });
    }
  }

  // Bulk unlock bills for cycle
  async bulkUnlockBillsForCycle(req: Request, res: Response): Promise<void> {
    try {
      const { billingMonth } = req.body;

      if (!billingMonth) {
        res.status(400).json({ error: "Billing month is required" });
        return;
      }

      const count = await enhancedBillingService.bulkUnlockBillsForCycle(billingMonth);

      res.json({ message: `${count} bills unlocked` });
    } catch (error) {
      logger.error(`Error bulk unlocking bills: ${error}`);
      res.status(500).json({ error: "Failed to unlock bills" });
    }
  }

  // Get collection metrics
  async getCollectionMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await collectionService.getCollectionMetrics();

      res.json(metrics);
    } catch (error) {
      logger.error(`Error getting collection metrics: ${error}`);
      res.status(500).json({ error: "Failed to get metrics" });
    }
  }

  // Get top debtors
  async getTopDebtors(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10 } = req.query;

      const debtors = await collectionService.getTopDebtors(parseInt(limit as string));

      res.json(debtors);
    } catch (error) {
      logger.error(`Error getting top debtors: ${error}`);
      res.status(500).json({ error: "Failed to get debtors" });
    }
  }

  // Get resident collection status
  async getResidentCollectionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { residentId } = req.params;

      const status = await collectionService.getResidentCollectionStatus(residentId as string);

      res.json(status);
    } catch (error) {
      logger.error(`Error getting resident collection status: ${error}`);
      res.status(500).json({ error: "Failed to get status" });
    }
  }

  // Get collection timeline
  async getCollectionTimeline(req: Request, res: Response): Promise<void> {
    try {
      const { billId } = req.params;

      const timeline = await collectionService.getCollectionTimeline(billId as string);

      res.json(timeline);
    } catch (error) {
      logger.error(`Error getting collection timeline: ${error}`);
      res.status(500).json({ error: "Failed to get timeline" });
    }
  }

  // Get collection efficiency score
  async getCollectionEfficiencyScore(req: Request, res: Response): Promise<void> {
    try {
      const score = await collectionService.getCollectionEfficiencyScore();

      res.json({ score });
    } catch (error) {
      logger.error(`Error getting collection efficiency score: ${error}`);
      res.status(500).json({ error: "Failed to get score" });
    }
  }
}

export default new EnhancedBillingController();
