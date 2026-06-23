import { Response, NextFunction } from 'express';
import { supportService } from '../services/support.service';
import { AuthRequest } from '../middleware/auth';

export class SupportController {
  async createTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const attachmentFiles = req.files
        ? (req.files as any[]).map((f) => f.path)
        : [];

      const ticket = await supportService.createTicket({
        ...req.body,
        residentId: req.user!.userId,
        attachmentFiles,
      });

      res.status(201).json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyTickets(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await supportService.getResidentTickets(
        req.user!.userId,
        req.query as any
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await supportService.getAllTickets(req.query as any);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await supportService.getTicketById(req.params.id as string);

      res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  async reply(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const attachmentFiles = req.files
        ? (req.files as any[]).map((f) => f.path)
        : [];

      const isAdmin = req.user!.role === 'SUPER_ADMIN';

      const reply = await supportService.replyToTicket({
        ticketId: req.params.id as string,
        userId: req.user!.userId,
        message: req.body.message,
        isAdmin,
        attachmentFiles,
      });

      res.status(201).json({
        success: true,
        data: reply,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await supportService.updateTicketStatus(
        req.params.id as string,
        req.body.status,
        req.body.assignedTo
      );

      res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await supportService.getTicketStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const supportController = new SupportController();
