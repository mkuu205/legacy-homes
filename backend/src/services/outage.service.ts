import prisma from '../config/prisma';

export class OutageService {
  /**
   * Export the current eligible recipient snapshot while the application is healthy.
   * The independent monitor persists the response so outage delivery does not depend
   * on this database or API remaining reachable.
   */
  async getRecipientSnapshot() {
    const users = await prisma.user.findMany({
      where: {
        accountStatus: 'ACTIVE',
        registrationStatus: 'APPROVED',
        emailVerified: true,
        email: { not: '' },
      },
      select: { email: true, role: true },
      orderBy: { email: 'asc' },
    });

    const normalize = (email: string) => email.trim().toLowerCase();
    const valid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const recipients = [...new Set(users.map(({ email }) => normalize(email)).filter(valid))];
    const adminRoles = new Set(['SUPER_ADMIN', 'BILLING_OFFICER', 'SUPPORT_AGENT', 'NOTIFICATION_MANAGER', 'READ_ONLY_MANAGER']);
    const admins = [...new Set(users.filter(({ role }) => adminRoles.has(role)).map(({ email }) => normalize(email)).filter(valid))];

    return {
      generatedAt: new Date().toISOString(),
      recipients,
      admins,
    };
  }
}

export const outageService = new OutageService();
