"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportService = exports.SupportService = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const cloudinary_1 = require("../utils/cloudinary");
const server_1 = require("../server");
const generateTicketId = () => {
    return `TKT-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};
class SupportService {
    async createTicket(data) {
        const attachments = [];
        if (data.attachmentFiles) {
            for (const file of data.attachmentFiles) {
                const url = await (0, cloudinary_1.uploadToCloudinary)(file, 'support-attachments');
                attachments.push(url);
            }
        }
        const ticket = await prisma_1.default.ticket.create({
            data: {
                ticketId: generateTicketId(),
                residentId: data.residentId,
                subject: data.subject,
                description: data.description,
                category: data.category,
                attachments,
                status: 'OPEN',
            },
            include: {
                resident: { select: { fullName: true, email: true, accountNumber: true } },
            },
        });
        // Notify admins via socket
        server_1.io.emit('new_ticket', {
            ticketId: ticket.ticketId,
            subject: ticket.subject,
            resident: ticket.resident.fullName,
        });
        return ticket;
    }
    async getResidentTickets(residentId, query) {
        const pageNum = Number.parseInt(String(query?.page || 1), 10);
        const limitNum = Number.parseInt(String(query?.limit || 20), 10);
        const skip = (pageNum - 1) * limitNum;
        const where = { residentId };
        if (query.status)
            where.status = query.status;
        const [tickets, total] = await Promise.all([
            prisma_1.default.ticket.findMany({
                where, skip, take: limitNum,
                orderBy: { updatedAt: 'desc' },
                include: { replies: { orderBy: { createdAt: 'asc' } } },
            }),
            prisma_1.default.ticket.count({ where }),
        ]);
        return { tickets, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } };
    }
    async getAllTickets(query) {
        const pageNum = Number.parseInt(String(query?.page || 1), 10);
        const limitNum = Number.parseInt(String(query?.limit || 20), 10);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.category)
            where.category = query.category;
        if (query.search) {
            where.OR = [
                { ticketId: { contains: query.search, mode: 'insensitive' } },
                { subject: { contains: query.search, mode: 'insensitive' } },
                { resident: { fullName: { contains: query.search, mode: 'insensitive' } } },
            ];
        }
        const [tickets, total] = await Promise.all([
            prisma_1.default.ticket.findMany({
                where, skip, take: limitNum,
                orderBy: { updatedAt: 'desc' },
                include: {
                    resident: { select: { fullName: true, email: true, accountNumber: true } },
                    assignee: { select: { fullName: true } },
                    replies: { orderBy: { createdAt: 'asc' } },
                },
            }),
            prisma_1.default.ticket.count({ where }),
        ]);
        return { tickets, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } };
    }
    async getTicketById(id) {
        const ticket = await prisma_1.default.ticket.findUnique({
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
        if (!ticket)
            throw new errorHandler_1.AppError('Ticket not found', 404);
        return ticket;
    }
    async replyToTicket(data) {
        const ticket = await prisma_1.default.ticket.findUnique({ where: { id: data.ticketId } });
        if (!ticket)
            throw new errorHandler_1.AppError('Ticket not found', 404);
        const attachments = [];
        if (data.attachmentFiles) {
            for (const file of data.attachmentFiles) {
                const url = await (0, cloudinary_1.uploadToCloudinary)(file, 'support-attachments');
                attachments.push(url);
            }
        }
        const reply = await prisma_1.default.ticketReply.create({
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
            await prisma_1.default.ticket.update({ where: { id: data.ticketId }, data: { status: 'PENDING' } });
        }
        // Realtime update
        server_1.io.to(`user_${ticket.residentId}`).emit('ticket_reply', {
            ticketId: ticket.id,
            reply,
        });
        return reply;
    }
    async updateTicketStatus(id, status, assignedTo) {
        const ticket = await prisma_1.default.ticket.findUnique({ where: { id } });
        if (!ticket)
            throw new errorHandler_1.AppError('Ticket not found', 404);
        const updated = await prisma_1.default.ticket.update({
            where: { id },
            data: { status: status, ...(assignedTo && { assignedTo }) },
        });
        server_1.io.to(`user_${ticket.residentId}`).emit('ticket_status_update', {
            ticketId: ticket.id,
            status,
        });
        return updated;
    }
    async getTicketStats() {
        const [open, pending, resolved, closed] = await Promise.all([
            prisma_1.default.ticket.count({ where: { status: 'OPEN' } }),
            prisma_1.default.ticket.count({ where: { status: 'PENDING' } }),
            prisma_1.default.ticket.count({ where: { status: 'RESOLVED' } }),
            prisma_1.default.ticket.count({ where: { status: 'CLOSED' } }),
        ]);
        return { open, pending, resolved, closed, total: open + pending + resolved + closed };
    }
}
exports.SupportService = SupportService;
exports.supportService = new SupportService();
//# sourceMappingURL=support.service.js.map