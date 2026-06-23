"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.residentApprovalService = exports.ResidentApprovalService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
const logger_1 = __importDefault(require("../utils/logger"));
const email_1 = require("../utils/email");
class ResidentApprovalService {
    // Get all pending resident applications
    async getPendingApplications(skip = 0, take = 50) {
        try {
            const applications = await prisma_1.default.user.findMany({
                where: {
                    role: 'RESIDENT',
                    registrationStatus: client_1.RegistrationStatus.PENDING,
                },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    nationalId: true,
                    accountNumber: true,
                    profilePicture: true,
                    registrationStatus: true,
                    accountStatus: true,
                    houseId: true,
                    createdAt: true,
                },
                skip,
                take,
                orderBy: { createdAt: 'asc' },
            });
            // Fetch house info for each application
            const applicationsWithHouse = await Promise.all(applications.map(async (app) => {
                const house = app.houseId
                    ? await prisma_1.default.house.findUnique({ where: { id: app.houseId } })
                    : null;
                return {
                    ...app,
                    assignedHouse: house
                        ? {
                            id: house.id,
                            houseNumber: house.houseNumber,
                            occupancyStatus: house.occupancyStatus,
                        }
                        : null,
                };
            }));
            return applicationsWithHouse;
        }
        catch (error) {
            logger_1.default.error(`Error fetching pending applications: ${error}`);
            throw error;
        }
    }
    // Get approved residents
    async getApprovedResidents(skip = 0, take = 50) {
        try {
            const residents = await prisma_1.default.user.findMany({
                where: {
                    role: 'RESIDENT',
                    registrationStatus: client_1.RegistrationStatus.APPROVED,
                },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    accountNumber: true,
                    accountStatus: true,
                    houseId: true,
                    createdAt: true,
                },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            });
            // Fetch house info for each resident
            const residentsWithHouse = await Promise.all(residents.map(async (resident) => {
                const house = resident.houseId
                    ? await prisma_1.default.house.findUnique({ where: { id: resident.houseId } })
                    : null;
                return {
                    ...resident,
                    assignedHouse: house,
                };
            }));
            return residentsWithHouse;
        }
        catch (error) {
            logger_1.default.error(`Error fetching approved residents: ${error}`);
            throw error;
        }
    }
    // Get rejected residents
    async getRejectedResidents(skip = 0, take = 50) {
        try {
            const residents = await prisma_1.default.user.findMany({
                where: {
                    role: 'RESIDENT',
                    registrationStatus: client_1.RegistrationStatus.REJECTED,
                },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    registrationStatus: true,
                    createdAt: true,
                },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            });
            return residents;
        }
        catch (error) {
            logger_1.default.error(`Error fetching rejected residents: ${error}`);
            throw error;
        }
    }
    // Approve resident application
    async approveResident(residentId, assignedHouseId) {
        try {
            // Update resident status
            const resident = await prisma_1.default.user.update({
                where: { id: residentId },
                data: {
                    registrationStatus: client_1.RegistrationStatus.APPROVED,
                    accountStatus: client_1.AccountStatus.ACTIVE,
                    houseId: assignedHouseId,
                },
            });
            // If house is assigned, update house occupancy status
            if (assignedHouseId) {
                await prisma_1.default.house.update({
                    where: { id: assignedHouseId },
                    data: { occupancyStatus: 'OCCUPIED' },
                });
            }
            // Fetch house for email
            const house = assignedHouseId
                ? await prisma_1.default.house.findUnique({ where: { id: assignedHouseId } })
                : null;
            // Send approval email
            await (0, email_1.sendEmail)({
                to: resident.email,
                subject: 'Registration Approved - Legacy Homes Water Billing',
                html: `
          <h2>Welcome to Legacy Homes Water Billing System</h2>
          <p>Dear ${resident.fullName},</p>
          <p>Your registration has been approved! You can now log in to your account.</p>
          <p>Account Number: ${resident.accountNumber}</p>
          ${house ? `<p>Your house has been assigned: ${house.houseNumber}. Please check your dashboard for details.</p>` : ''}
          <p>Best regards,<br>Legacy Homes Management</p>
        `,
            });
            logger_1.default.info(`Resident approved: ${residentId}`);
            return resident;
        }
        catch (error) {
            logger_1.default.error(`Error approving resident: ${error}`);
            throw error;
        }
    }
    // Reject resident application
    async rejectResident(residentId, reason) {
        try {
            const resident = await prisma_1.default.user.update({
                where: { id: residentId },
                data: {
                    registrationStatus: client_1.RegistrationStatus.REJECTED,
                    accountStatus: client_1.AccountStatus.INACTIVE,
                },
            });
            // Send rejection email
            await (0, email_1.sendEmail)({
                to: resident.email,
                subject: 'Registration Status - Legacy Homes Water Billing',
                html: `
          <h2>Registration Update</h2>
          <p>Dear ${resident.fullName},</p>
          <p>Unfortunately, your registration application has been rejected.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br>Legacy Homes Management</p>
        `,
            });
            logger_1.default.info(`Resident rejected: ${residentId}`);
            return resident;
        }
        catch (error) {
            logger_1.default.error(`Error rejecting resident: ${error}`);
            throw error;
        }
    }
    // Assign house to resident
    async assignHouseToResident(residentId, houseId) {
        try {
            // Check if house is available
            const house = await prisma_1.default.house.findUnique({
                where: { id: houseId },
                select: { id: true, resident: true },
            });
            if (!house) {
                throw new Error('House not found');
            }
            if (house.resident) {
                throw new Error('House is already assigned to another resident');
            }
            // Assign house to resident
            const resident = await prisma_1.default.user.update({
                where: { id: residentId },
                data: { houseId },
            });
            // Update house occupancy
            await prisma_1.default.house.update({
                where: { id: houseId },
                data: { occupancyStatus: 'OCCUPIED' },
            });
            logger_1.default.info(`House ${houseId} assigned to resident ${residentId}`);
            return resident;
        }
        catch (error) {
            logger_1.default.error(`Error assigning house: ${error}`);
            throw error;
        }
    }
    // Unassign house from resident
    async unassignHouseFromResident(residentId) {
        try {
            const resident = await prisma_1.default.user.findUnique({
                where: { id: residentId },
                select: { houseId: true },
            });
            if (!resident)
                throw new Error('Resident not found');
            const updated = await prisma_1.default.user.update({
                where: { id: residentId },
                data: { houseId: null },
            });
            // Update house occupancy
            if (resident.houseId) {
                await prisma_1.default.house.update({
                    where: { id: resident.houseId },
                    data: { occupancyStatus: 'VACANT' },
                });
            }
            logger_1.default.info(`House unassigned from resident ${residentId}`);
            return updated;
        }
        catch (error) {
            logger_1.default.error(`Error unassigning house: ${error}`);
            throw error;
        }
    }
    // Get application count by status
    async getApplicationCountByStatus() {
        try {
            const [pending, approved, rejected] = await Promise.all([
                prisma_1.default.user.count({
                    where: {
                        role: 'RESIDENT',
                        registrationStatus: client_1.RegistrationStatus.PENDING,
                    },
                }),
                prisma_1.default.user.count({
                    where: {
                        role: 'RESIDENT',
                        registrationStatus: client_1.RegistrationStatus.APPROVED,
                    },
                }),
                prisma_1.default.user.count({
                    where: {
                        role: 'RESIDENT',
                        registrationStatus: client_1.RegistrationStatus.REJECTED,
                    },
                }),
            ]);
            return { pending, approved, rejected };
        }
        catch (error) {
            logger_1.default.error(`Error getting application counts: ${error}`);
            throw error;
        }
    }
    // Bulk approve residents
    async bulkApproveResidents(residentIds) {
        try {
            const result = await prisma_1.default.user.updateMany({
                where: {
                    id: { in: residentIds },
                    registrationStatus: client_1.RegistrationStatus.PENDING,
                },
                data: {
                    registrationStatus: client_1.RegistrationStatus.APPROVED,
                    accountStatus: client_1.AccountStatus.ACTIVE,
                },
            });
            logger_1.default.info(`Bulk approved ${result.count} residents`);
            return result.count;
        }
        catch (error) {
            logger_1.default.error(`Error bulk approving residents: ${error}`);
            throw error;
        }
    }
    // Bulk reject residents
    async bulkRejectResidents(residentIds, reason) {
        try {
            const result = await prisma_1.default.user.updateMany({
                where: {
                    id: { in: residentIds },
                    registrationStatus: client_1.RegistrationStatus.PENDING,
                },
                data: {
                    registrationStatus: client_1.RegistrationStatus.REJECTED,
                    accountStatus: client_1.AccountStatus.INACTIVE,
                },
            });
            logger_1.default.info(`Bulk rejected ${result.count} residents`);
            return result.count;
        }
        catch (error) {
            logger_1.default.error(`Error bulk rejecting residents: ${error}`);
            throw error;
        }
    }
}
exports.ResidentApprovalService = ResidentApprovalService;
exports.residentApprovalService = new ResidentApprovalService();
//# sourceMappingURL=resident-approval.service.js.map