import { RegistrationStatus, AccountStatus } from '@prisma/client';
import prisma from '../config/prisma';
import logger from '../utils/logger';
import { sendEmail } from '../utils/email';

export class ResidentApprovalService {
  // Get all pending resident applications
  async getPendingApplications(skip = 0, take = 50) {
    try {
      const applications = await prisma.user.findMany({
        where: {
          role: 'RESIDENT',
          registrationStatus: RegistrationStatus.PENDING,
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
      const applicationsWithHouse = await Promise.all(
        applications.map(async (app) => {
          const house = app.houseId
            ? await prisma.house.findUnique({ where: { id: app.houseId } })
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
        })
      );

      return applicationsWithHouse;
    } catch (error) {
      logger.error(`Error fetching pending applications: ${error}`);
      throw error;
    }
  }

  // Get approved residents
  async getApprovedResidents(skip = 0, take = 50) {
    try {
      const residents = await prisma.user.findMany({
        where: {
          role: 'RESIDENT',
          registrationStatus: RegistrationStatus.APPROVED,
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
      const residentsWithHouse = await Promise.all(
        residents.map(async (resident) => {
          const house = resident.houseId
            ? await prisma.house.findUnique({ where: { id: resident.houseId } })
            : null;
          return {
            ...resident,
            assignedHouse: house,
          };
        })
      );

      return residentsWithHouse;
    } catch (error) {
      logger.error(`Error fetching approved residents: ${error}`);
      throw error;
    }
  }

  // Get rejected residents
  async getRejectedResidents(skip = 0, take = 50) {
    try {
      const residents = await prisma.user.findMany({
        where: {
          role: 'RESIDENT',
          registrationStatus: RegistrationStatus.REJECTED,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          accountNumber: true,
          registrationStatus: true,
          createdAt: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      });

      return residents;
    } catch (error) {
      logger.error(`Error fetching rejected residents: ${error}`);
      throw error;
    }
  }

  // Approve resident application
  async approveResident(residentId: string, assignedHouseId?: string) {
    try {
      const resident = await prisma.user.update({
        where: { id: residentId },
        data: {
          registrationStatus: RegistrationStatus.APPROVED,
          accountStatus: AccountStatus.ACTIVE,
          ...(assignedHouseId && { houseId: assignedHouseId }),
        },
      });

      // Fetch house info if assigned
      const house = resident.houseId
        ? await prisma.house.findUnique({ where: { id: resident.houseId } })
        : null;

      // Send approval email
      await sendEmail({
        to: resident.email,
        subject: 'Registration Approved - Legacy Homes Water Billing',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
              <h2 style="color:#fff;margin:0;font-size:24px;font-weight:bold;">Legacy Homes</h2>
              <p style="color:#e0e7ff;margin:8px 0 0 0;font-size:12px;">Water Billing System</p>
            </div>
            <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
              <h3 style="color:#1e293b;">Registration Approved</h3>
              <p style="color:#64748b;line-height:1.6;">Dear ${resident.fullName},</p>
              <p style="color:#64748b;line-height:1.6;">Your registration has been approved! You can now log in to your account and start managing your water billing.</p>
              <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin:16px 0;">
                <p style="margin:0;color:#1e293b;"><strong>Account Number:</strong> ${resident.accountNumber}</p>
                ${house ? `<p style="margin:8px 0 0 0;color:#1e293b;"><strong>Assigned House:</strong> ${house.houseNumber}</p>` : ''}
              </div>
              <p style="color:#64748b;line-height:1.6;">Please log in to your dashboard to view your details and billing information.</p>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Legacy Homes Water Billing System</p>
            </div>
          </div>
        `,
      });

      logger.info(`Resident approved: ${residentId}`);
      return resident;
    } catch (error) {
      logger.error(`Error approving resident: ${error}`);
      throw error;
    }
  }

  // Get application counts by status
  async getApplicationCountByStatus() {
    try {
      const [pending, approved, rejected] = await Promise.all([
        prisma.user.count({
          where: {
            role: 'RESIDENT',
            registrationStatus: RegistrationStatus.PENDING,
          },
        }),
        prisma.user.count({
          where: {
            role: 'RESIDENT',
            registrationStatus: RegistrationStatus.APPROVED,
          },
        }),
        prisma.user.count({
          where: {
            role: 'RESIDENT',
            registrationStatus: RegistrationStatus.REJECTED,
          },
        }),
      ]);

      return { pending, approved, rejected, total: pending + approved + rejected };
    } catch (error) {
      logger.error(`Error fetching application counts: ${error}`);
      throw error;
    }
  }

  // Bulk approve residents
  async bulkApproveResidents(residentIds: string[]) {
    try {
      const result = await prisma.user.updateMany({
        where: {
          id: { in: residentIds },
          role: 'RESIDENT',
        },
        data: {
          registrationStatus: RegistrationStatus.APPROVED,
          accountStatus: AccountStatus.ACTIVE,
        },
      });

      // Send approval emails
      const residents = await prisma.user.findMany({
        where: { id: { in: residentIds } },
      });

      for (const resident of residents) {
        try {
          const house = resident.houseId
            ? await prisma.house.findUnique({ where: { id: resident.houseId } })
            : null;

          await sendEmail({
            to: resident.email,
            subject: 'Registration Approved - Legacy Homes Water Billing',
            html: `
              <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;">
                <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
                  <h2 style="color:#fff;margin:0;font-size:24px;font-weight:bold;">Legacy Homes</h2>
                  <p style="color:#e0e7ff;margin:8px 0 0 0;font-size:12px;">Water Billing System</p>
                </div>
                <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
                  <h3 style="color:#1e293b;">Registration Approved</h3>
                  <p style="color:#64748b;line-height:1.6;">Dear ${resident.fullName},</p>
                  <p style="color:#64748b;line-height:1.6;">Your registration has been approved! You can now log in to your account and start managing your water billing.</p>
                  <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin:16px 0;">
                    <p style="margin:0;color:#1e293b;"><strong>Account Number:</strong> ${resident.accountNumber}</p>
                    ${house ? `<p style="margin:8px 0 0 0;color:#1e293b;"><strong>Assigned House:</strong> ${house.houseNumber}</p>` : ''}
                  </div>
                  <p style="color:#64748b;line-height:1.6;">Please log in to your dashboard to view your details and billing information.</p>
                  <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Legacy Homes Water Billing System</p>
                </div>
              </div>
            `,
          });
        } catch (error) {
          logger.error(`Failed to send approval email to ${resident.email}:`, error);
        }
      }

      logger.info(`Bulk approved ${result.count} residents`);
      return result.count;
    } catch (error) {
      logger.error(`Error bulk approving residents: ${error}`);
      throw error;
    }
  }

  // Bulk reject residents
  async bulkRejectResidents(residentIds: string[], reason: string) {
    try {
      const result = await prisma.user.updateMany({
        where: {
          id: { in: residentIds },
          role: 'RESIDENT',
        },
        data: {
          registrationStatus: RegistrationStatus.REJECTED,
          accountStatus: AccountStatus.INACTIVE,
        },
      });

      // Send rejection emails
      const residents = await prisma.user.findMany({
        where: { id: { in: residentIds } },
      });

      for (const resident of residents) {
        try {
          await sendEmail({
            to: resident.email,
            subject: 'Registration Status - Legacy Homes Water Billing',
            html: `
              <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;">
                <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
                  <h2 style="color:#fff;margin:0;font-size:24px;font-weight:bold;">Legacy Homes</h2>
                  <p style="color:#e0e7ff;margin:8px 0 0 0;font-size:12px;">Water Billing System</p>
                </div>
                <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
                  <h3 style="color:#1e293b;">Registration Status Update</h3>
                  <p style="color:#64748b;line-height:1.6;">Dear ${resident.fullName},</p>
                  <p style="color:#64748b;line-height:1.6;">Thank you for your interest in Legacy Homes Water Billing System. Unfortunately, your registration application could not be approved at this time.</p>
                  <div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #ef4444;">
                    <p style="margin:0;color:#7f1d1d;"><strong>Reason:</strong> ${reason}</p>
                  </div>
                  <p style="color:#64748b;line-height:1.6;">If you have any questions or would like to reapply, please contact our support team.</p>
                  <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Legacy Homes Water Billing System</p>
                </div>
              </div>
            `,
          });
        } catch (error) {
          logger.error(`Failed to send rejection email to ${resident.email}:`, error);
        }
      }

      logger.info(`Bulk rejected ${result.count} residents`);
      return result.count;
    } catch (error) {
      logger.error(`Error bulk rejecting residents: ${error}`);
      throw error;
    }
  }

  // Assign house to resident
  async assignHouseToResident(residentId: string, houseId: string) {
    try {
      // Check if house exists and is available
      const house = await prisma.house.findUnique({ where: { id: houseId } });
      if (!house) throw new Error('House not found');

      const resident = await prisma.user.update({
        where: { id: residentId },
        data: { houseId },
      });

      logger.info(`House ${houseId} assigned to resident ${residentId}`);
      return resident;
    } catch (error) {
      logger.error(`Error assigning house: ${error}`);
      throw error;
    }
  }

  // Unassign house from resident
  async unassignHouseFromResident(residentId: string) {
    try {
      const resident = await prisma.user.update({
        where: { id: residentId },
        data: { houseId: null },
      });

      logger.info(`House unassigned from resident ${residentId}`);
      return resident;
    } catch (error) {
      logger.error(`Error unassigning house: ${error}`);
      throw error;
    }
  }

  // Reject resident application
  async rejectResident(residentId: string, reason: string) {
    try {
      const resident = await prisma.user.update({
        where: { id: residentId },
        data: {
          registrationStatus: RegistrationStatus.REJECTED,
          accountStatus: AccountStatus.INACTIVE,
        },
      });

      // Send rejection email
      await sendEmail({
        to: resident.email,
        subject: 'Registration Status - Legacy Homes Water Billing',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
              <h2 style="color:#fff;margin:0;font-size:24px;font-weight:bold;">Legacy Homes</h2>
              <p style="color:#e0e7ff;margin:8px 0 0 0;font-size:12px;">Water Billing System</p>
            </div>
            <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
              <h3 style="color:#1e293b;">Registration Status Update</h3>
              <p style="color:#64748b;line-height:1.6;">Dear ${resident.fullName},</p>
              <p style="color:#64748b;line-height:1.6;">Thank you for your interest in Legacy Homes Water Billing System. Unfortunately, your registration application could not be approved at this time.</p>
              <div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #ef4444;">
                <p style="margin:0;color:#7f1d1d;"><strong>Reason:</strong> ${reason}</p>
              </div>
              <p style="color:#64748b;line-height:1.6;">If you have any questions or would like to reapply, please contact our support team.</p>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Legacy Homes Water Billing System</p>
            </div>
          </div>
        `,
      });

      logger.info(`Resident rejected: ${residentId}`);
      return resident;
    } catch (error) {
      logger.error(`Error rejecting resident: ${error}`);
      throw error;
    }
  }
}

export const residentApprovalService = new ResidentApprovalService();
