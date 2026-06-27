import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { uploadToCloudinary } from '../utils/cloudinary';
import { io } from '../server';
import { logger } from '../utils/logger';

const generateTicketId = (): string => {
  return `TKT-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

export class SupportService {
  async createTicket(data: {
    residentId: string;
    subject: string;
    description: string;
    category: string;
    attachmentFiles?: string[];
  }) {
    const attachments: string[] = [];
    if (data.attachmentFiles) {
      for (const file of data.attachmentFiles) {
        const url = await uploadToCloudinary(file, 'support-attachments');
        attachments.push(url);
      }
    }

    const ticket = await prisma.ticket.create({
      data: {
        ticketId: generateTicketId(),
        residentId: data.residentId,
        subject: data.subject,
        description: data.description,
        category: data.category as any,
        attachments,
        status: 'OPEN',
      },
      include: {
        resident: { select: { fullName: true, email: true, accountNumber: true } },
      },
    });

    // Notify admins via socket
    io.emit('new_ticket', {
      ticketId: ticket.ticketId,
      subject: ticket.subject,
      resident: ticket.resident.fullName,
    });

    return ticket;
  }

  async getResidentTickets(residentId: string, query: { page?: number; limit?: number; status?: string }) {
    const pageNum = Number.parseInt(String(query?.page || 1), 10);
    const limitNum = Number.parseInt(String(query?.limit || 20), 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { residentId };
    if (query.status) where.status = query.status;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where, skip, take: limitNum,
        orderBy: { updatedAt: 'desc' },
        include: { replies: { orderBy: { createdAt: 'asc' } } },
      }),
      prisma.ticket.count({ where }),
    ]);

    return { tickets, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } };
  }

  async getAllTickets(query: { page?: number; limit?: number; status?: string; category?: string; search?: string }) {
    const pageNum = Number.parseInt(String(query?.page || 1), 10);
    const limitNum = Number.parseInt(String(query?.limit || 20), 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { ticketId: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
        { resident: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where, skip, take: limitNum,
        orderBy: { updatedAt: 'desc' },
        include: {
          resident: { select: { fullName: true, email: true, accountNumber: true } },
          assignee: { select: { fullName: true } },
          replies: { orderBy: { createdAt: 'asc' } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return { tickets, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } };
  }

  async getTicketById(id: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        resident: { select: { fullName: true, email: true, accountNumber: true } },
        assignee: { select: { fullName: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { fullName: true, role: true, profilePicture: true } } },
        },
      },
    });
    if (!ticket) throw new AppError('Ticket not found', 404);
    return ticket;
  }

  async replyToTicket(data: {
    ticketId: string;
    userId: string;
    message: string;
    isAdmin: boolean;
    attachmentFiles?: string[];
  }) {
    const ticket = await prisma.ticket.findUnique({ where: { id: data.ticketId } });
    if (!ticket) throw new AppError('Ticket not found', 404);

    const attachments: string[] = [];
    if (data.attachmentFiles) {
      for (const file of data.attachmentFiles) {
        const url = await uploadToCloudinary(file, 'support-attachments');
        attachments.push(url);
      }
    }

    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: data.ticketId,
        userId: data.userId,
        message: data.message,
        isAdmin: data.isAdmin,
        attachments,
      },
      include: { user: { select: { fullName: true, role: true, profilePicture: true } } },
    });

    // Update ticket status to pending if admin replied
    if (data.isAdmin) {
      await prisma.ticket.update({ where: { id: data.ticketId }, data: { status: 'PENDING' } });
    }

    // Realtime update
    io.to(`user_${ticket.residentId}`).emit('ticket_reply', {
      ticketId: ticket.id,
      reply,
    });

    return reply;
  }

  async updateTicketStatus(id: string, status: string, assignedTo?: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new AppError('Ticket not found', 404);

    const updated = await prisma.ticket.update({
      where: { id },
      data: { status: status as any, ...(assignedTo && { assignedTo }) },
    });

    io.to(`user_${ticket.residentId}`).emit('ticket_status_update', {
      ticketId: ticket.id,
      status,
    });

    return updated;
  }

  async getTicketStats() {
    const [open, pending, resolved, closed] = await Promise.all([
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'PENDING' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } }),
    ]);
    return { open, pending, resolved, closed, total: open + pending + resolved + closed };
  }
}

export const supportService = new SupportService();
