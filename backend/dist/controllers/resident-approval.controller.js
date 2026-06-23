"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResidentApprovalController = void 0;
const resident_approval_service_1 = require("../services/resident-approval.service");
const logger_1 = __importDefault(require("../utils/logger"));
class ResidentApprovalController {
    // Get pending applications
    async getPendingApplications(req, res) {
        try {
            const { skip = 0, take = 50 } = req.query;
            const applications = await resident_approval_service_1.residentApprovalService.getPendingApplications(parseInt(skip), parseInt(take));
            res.json(applications);
        }
        catch (error) {
            logger_1.default.error(`Error fetching pending applications: ${error}`);
            res.status(500).json({ error: "Failed to fetch applications" });
        }
    }
    // Get approved residents
    async getApprovedResidents(req, res) {
        try {
            const { skip = 0, take = 50 } = req.query;
            const residents = await resident_approval_service_1.residentApprovalService.getApprovedResidents(parseInt(skip), parseInt(take));
            res.json(residents);
        }
        catch (error) {
            logger_1.default.error(`Error fetching approved residents: ${error}`);
            res.status(500).json({ error: "Failed to fetch residents" });
        }
    }
    // Get rejected residents
    async getRejectedResidents(req, res) {
        try {
            const { skip = 0, take = 50 } = req.query;
            const residents = await resident_approval_service_1.residentApprovalService.getRejectedResidents(parseInt(skip), parseInt(take));
            res.json(residents);
        }
        catch (error) {
            logger_1.default.error(`Error fetching rejected residents: ${error}`);
            res.status(500).json({ error: "Failed to fetch residents" });
        }
    }
    // Approve resident
    async approveResident(req, res) {
        try {
            const { residentId } = req.params;
            const { assignedHouseId } = req.body;
            const resident = await resident_approval_service_1.residentApprovalService.approveResident(residentId, assignedHouseId);
            res.json(resident);
        }
        catch (error) {
            logger_1.default.error(`Error approving resident: ${error}`);
            res.status(500).json({ error: "Failed to approve resident" });
        }
    }
    // Reject resident
    async rejectResident(req, res) {
        try {
            const { residentId } = req.params;
            const { reason } = req.body;
            if (!reason) {
                res.status(400).json({ error: "Rejection reason is required" });
                return;
            }
            const resident = await resident_approval_service_1.residentApprovalService.rejectResident(residentId, reason);
            res.json(resident);
        }
        catch (error) {
            logger_1.default.error(`Error rejecting resident: ${error}`);
            res.status(500).json({ error: "Failed to reject resident" });
        }
    }
    // Assign house to resident
    async assignHouseToResident(req, res) {
        try {
            const { residentId } = req.params;
            const { houseId } = req.body;
            if (!houseId) {
                res.status(400).json({ error: "House ID is required" });
                return;
            }
            const resident = await resident_approval_service_1.residentApprovalService.assignHouseToResident(residentId, houseId);
            res.json(resident);
        }
        catch (error) {
            logger_1.default.error(`Error assigning house: ${error}`);
            res.status(500).json({ error: "Failed to assign house" });
        }
    }
    // Unassign house from resident
    async unassignHouseFromResident(req, res) {
        try {
            const { residentId } = req.params;
            const resident = await resident_approval_service_1.residentApprovalService.unassignHouseFromResident(residentId);
            res.json(resident);
        }
        catch (error) {
            logger_1.default.error(`Error unassigning house: ${error}`);
            res.status(500).json({ error: "Failed to unassign house" });
        }
    }
    // Get application counts
    async getApplicationCounts(req, res) {
        try {
            const counts = await resident_approval_service_1.residentApprovalService.getApplicationCountByStatus();
            res.json(counts);
        }
        catch (error) {
            logger_1.default.error(`Error fetching application counts: ${error}`);
            res.status(500).json({ error: "Failed to fetch counts" });
        }
    }
    // Bulk approve residents
    async bulkApproveResidents(req, res) {
        try {
            const { residentIds } = req.body;
            if (!Array.isArray(residentIds) || residentIds.length === 0) {
                res.status(400).json({ error: "Resident IDs array is required" });
                return;
            }
            const count = await resident_approval_service_1.residentApprovalService.bulkApproveResidents(residentIds);
            res.json({ message: `${count} residents approved` });
        }
        catch (error) {
            logger_1.default.error(`Error bulk approving residents: ${error}`);
            res.status(500).json({ error: "Failed to approve residents" });
        }
    }
    // Bulk reject residents
    async bulkRejectResidents(req, res) {
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
            const count = await resident_approval_service_1.residentApprovalService.bulkRejectResidents(residentIds, reason);
            res.json({ message: `${count} residents rejected` });
        }
        catch (error) {
            logger_1.default.error(`Error bulk rejecting residents: ${error}`);
            res.status(500).json({ error: "Failed to reject residents" });
        }
    }
}
exports.ResidentApprovalController = ResidentApprovalController;
exports.default = new ResidentApprovalController();
//# sourceMappingURL=resident-approval.controller.js.map