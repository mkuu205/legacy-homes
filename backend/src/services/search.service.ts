import prisma from '../config/prisma';
import logger from '../utils/logger';

export class SearchService {
  // Global search across residents, bills, tickets
  async globalSearch(query: string, skip = 0, take = 50) {
    try {
      const [residents, bills, tickets, meters] = await Promise.all([
        this.searchResidents(query, skip, take),
        this.searchBills(query, skip, take),
        this.searchTickets(query, skip, take),
        this.searchMeters(query, skip, take),
      ]);

      return { residents, bills, tickets, meters };
    } catch (error) {
      logger.error(`Error performing global search: ${error}`);
      throw error;
    }
  }

  // Search residents
  async searchResidents(query: string, skip = 0, take = 50) {
    try {
      const residents = await prisma.user.findMany({
        where: {
          role: 'RESIDENT',
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
            { accountNumber: { contains: query, mode: 'insensitive' } },
            { nationalId: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          accountNumber: true,
          registrationStatus: true,
          accountStatus: true,
          houseId: true,
          assignedHouse: true,
        },
        skip,
        take,
      });

      return residents.map((resident) => ({
        ...resident,
        assignedHouse: resident.assignedHouse,
      }));
    } catch (error) {
      logger.error(`Error searching residents: ${error}`);
      throw error;
    }
  }

  // Search bills
  async searchBills(query: string, skip = 0, take = 50) {
    try {
      const bills = await prisma.bill.findMany({
        where: {
          OR: [
            { billNumber: { contains: query, mode: 'insensitive' } },
            { resident: { fullName: { contains: query, mode: 'insensitive' } } },
            { house: { houseNumber: { contains: query, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          billNumber: true,
          billingMonth: true,
          totalAmount: true,
          status: true,
          residentId: true,
          houseId: true,
          createdAt: true,
          resident: { select: { id: true, fullName: true, email: true } },
          house: { select: { id: true, houseNumber: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      });

      return bills;
    } catch (error) {
      logger.error(`Error searching bills: ${error}`);
      throw error;
    }
  }

  // Search tickets
  async searchTickets(query: string, skip = 0, take = 50) {
    try {
      const tickets = await prisma.ticket.findMany({
        where: {
          OR: [
            { ticketId: { contains: query, mode: 'insensitive' } },
            { subject: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { resident: { fullName: { contains: query, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          ticketId: true,
          subject: true,
          status: true,
          residentId: true,
          createdAt: true,
          resident: { select: { id: true, fullName: true, email: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      });

      return tickets;
    } catch (error) {
      logger.error(`Error searching tickets: ${error}`);
      throw error;
    }
  }

  // Search meters
  async searchMeters(query: string, skip = 0, take = 50) {
    try {
      const meters = await prisma.meter.findMany({
        where: {
          OR: [
            { meterNumber: { contains: query, mode: 'insensitive' } },
            { meterSerial: { contains: query, mode: 'insensitive' } },
            { house: { houseNumber: { contains: query, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          meterNumber: true,
          meterSerial: true,
          status: true,
          houseId: true,
          createdAt: true,
          house: { select: { id: true, houseNumber: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      });

      return meters;
    } catch (error) {
      logger.error(`Error searching meters: ${error}`);
      throw error;
    }
  }

  // Advanced search with filters
  async advancedSearch(filters: {
    type: 'residents' | 'bills' | 'tickets' | 'meters';
    query?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
  }) {
    try {
      const { type, query = '', status, startDate, endDate, skip = 0, take = 50 } = filters;

      switch (type) {
        case 'residents':
          return await this.searchResidents(query, skip, take);

        case 'bills':
          const billWhere: any = {};
          if (query) {
            billWhere.OR = [
              { billNumber: { contains: query, mode: 'insensitive' } },
              { resident: { fullName: { contains: query, mode: 'insensitive' } } },
            ];
          }
          if (status) billWhere.status = status;
          if (startDate || endDate) {
            billWhere.createdAt = {};
            if (startDate) billWhere.createdAt.gte = startDate;
            if (endDate) billWhere.createdAt.lte = endDate;
          }

          const bills = await prisma.bill.findMany({
            where: billWhere,
            select: {
              id: true,
              billNumber: true,
              billingMonth: true,
              totalAmount: true,
              status: true,
              residentId: true,
              houseId: true,
              createdAt: true,
              resident: { select: { id: true, fullName: true, email: true } },
              house: { select: { id: true, houseNumber: true } },
            },
            skip,
            take,
            orderBy: { createdAt: 'desc' },
          });

          return bills;

        case 'tickets':
          const ticketWhere: any = {};
          if (query) {
            ticketWhere.OR = [
              { ticketId: { contains: query, mode: 'insensitive' } },
              { subject: { contains: query, mode: 'insensitive' } },
            ];
          }
          if (status) ticketWhere.status = status;
          if (startDate || endDate) {
            ticketWhere.createdAt = {};
            if (startDate) ticketWhere.createdAt.gte = startDate;
            if (endDate) ticketWhere.createdAt.lte = endDate;
          }

          const tickets = await prisma.ticket.findMany({
            where: ticketWhere,
            select: {
              id: true,
              ticketId: true,
              subject: true,
              status: true,
              residentId: true,
              createdAt: true,
              resident: { select: { id: true, fullName: true, email: true } },
            },
            skip,
            take,
            orderBy: { createdAt: 'desc' },
          });

          return tickets;

        case 'meters':
          const meterWhere: any = {};
          if (query) {
            meterWhere.OR = [
              { meterNumber: { contains: query, mode: 'insensitive' } },
              { meterSerial: { contains: query, mode: 'insensitive' } },
            ];
          }
          if (status) meterWhere.status = status;

          const meters = await prisma.meter.findMany({
            where: meterWhere,
            select: {
              id: true,
              meterNumber: true,
              meterSerial: true,
              status: true,
              houseId: true,
              createdAt: true,
              house: { select: { id: true, houseNumber: true } },
            },
            skip,
            take,
            orderBy: { createdAt: 'desc' },
          });

          return meters;

        default:
          return [];
      }
    } catch (error) {
      logger.error(`Error performing advanced search: ${error}`);
      throw error;
    }
  }
}

export const searchService = new SearchService();
