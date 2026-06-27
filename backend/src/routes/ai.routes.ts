import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { aiService } from '../services/ai.service';
import { AuthRequest } from '../middleware/auth';
import { NextFunction, Response } from 'express';
import rateLimit from 'express-rate-limit';

const router: import("express").Router = Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many AI requests. Please wait a moment.' },
});

router.post('/chat', authenticate, aiLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Message is required' });
      return;
    }
    const result = await aiService.chat(req.user!.userId, message.trim());
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
