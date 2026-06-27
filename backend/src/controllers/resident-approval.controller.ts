import { Request, Response } from "express";
import { residentApprovalService } from "../services/resident-approval.service";
import logger from "../utils/logger";

export class ResidentApprovalController {
  // Get pending applications
  async getPendingApplications(req: Request, res: Response): Promise<void> {
    try {
      const { skip = 0, take = 50 } = req.query;

      const applications = await residentApprovalService.getPendingApplications(
        parseInt(skip as string),
        parseInt(take as string)
      );

      res.json(applications);
    } catch (error) {
      logger.error(`Error fetching pending applications: ${error}`);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  }

  // Get approved residents
  async getApprovedResidents(req: Request, res: Response): Promise<void> {
    try {
      const { skip = 0, take = 50 } = req.query;

      const residents = await residentApprovalService.getApprovedResidents(
        parseInt(skip as string),
        parseInt(take as string)
      );

      res.json(residents);
    } catch (error) {
      logger.error(`Error fetching approved residents: ${error}`);
      res.status(500).json({ error: "Failed to fetch residents" });
    }
  }

  // Get rejected residents
  async getRejectedResidents(req: Request, res: Response): Promise<void> {
    try {
      const { skip = 0, take = 50 } = req.query;

      const residents = await residentApprovalService.getRejectedResidents(
        parseInt(skip as string),
        parseInt(take as string)
      );

      res.json(residents);
    } catch (error) {
      logger.error(`Error fetching rejected residents: ${error}`);
      res.status(500).json({ error: "Failed to fetch residents" });
    }
  }

  // Approve resident
  async approveResident(req: Request, res: Response): Promise<void> {
    try {
      const { residentId } = req.params;
      const { assignedHouseId } = req.body;

      const resident = await residentApprovalService.approveResident(
        residentId as string,
        assignedHouseId
      );

      res.json(resident);
    } catch (error) {
      logger.error(`Error approving resident: ${error}`);
      res.status(500).json({ error: "Failed to approve resident" });
    }
  }

  // Reject resident
  async rejectResident(req: Request, res: Response): Promise<void> {
    try {
      const { residentId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({ error: "Rejection reason is required" });
        return;
      }

      const resident = await residentApprovalService.rejectResident(
        residentId as string,
        reason
      );

      res.json(resident);
    } catch (error) {
      logger.error(`Error rejecting resident: ${error}`);
      res.status(500).json({ error: "Failed to reject resident" });
    }
  }

  // Assign house to resident
  async assignHouseToResident(req: Request, res: Response): Promise<void> {
    try {
      const { residentId } = req.params;
      const { houseId } = req.body;

      if (!houseId) {
        res.status(400).json({ error: "House ID is required" });
        return;
      }

      const resident = await residentApprovalService.assignHouseToResident(
        residentId as string,
        houseId
      );

      res.json(resident);
    } catch (error) {
      logger.error(`Error assigning house: ${error}`);
      res.status(500).json({ error: "Failed to assign house" });
    }
  }

  // Unassign house from resident
  async unassignHouseFromResident(req: Request, res: Response): Promise<void> {
    try {
      const { residentId } = req.params;

      const resident = await residentApprovalService.unassignHouseFromResident(
        residentId as string
      );

      res.json(resident);
    } catch (error) {
      logger.error(`Error unassigning house: ${error}`);
      res.status(500).json({ error: "Failed to unassign house" });
    }
  }

  // Get application counts
  async getApplicationCounts(req: Request, res: Response): Promise<void> {
    try {
      const counts = await residentApprovalService.getApplicationCountByStatus();

      res.json(counts);
    } catch (error) {
      logger.error(`Error fetching application counts: ${error}`);
      res.status(500).json({ error: "Failed to fetch counts" });
    }
  }

  // Bulk approve residents
  async bulkApproveResidents(req: Request, res: Response): Promise<void> {
    try {
      const { residentIds } = req.body;

      if (!Array.isArray(residentIds) || residentIds.length === 0) {
        res.status(400).json({ error: "Resident IDs array is required" });
        return;
      }

      const count = await residentApprovalService.bulkApproveResidents(residentIds);

      res.json({ message: `${count} residents approved` });
    } catch (error) {
      logger.error(`Error bulk approving residents: ${error}`);
      res.status(500).json({ error: "Failed to approve residents" });
    }
  }

  // Bulk reject residents
  async bulkRejectResidents(req: Request, res: Response): Promise<void> {
    try {
      const { residentIds, reason } = req.body;

      if (!Array.isArray(residentIds) || residentIds.length === 0) {
        res.status(400).json({ error: "Resident IDs array is required" });
        return;
      }

      if (!reason) {
        res.status(400).json({ error: "Rejection reason is required" });
        return;
      }

      const count = await residentApprovalService.bulkRejectResidents(
        residentIds,
        reason
      );

      res.json({ message: `${count} residents rejected` });
    } catch (error) {
      logger.error(`Error bulk rejecting residents: ${error}`);
      res.status(500).json({ error: "Failed to reject residents" });
    }
  }
}

export default new ResidentApprovalController();
