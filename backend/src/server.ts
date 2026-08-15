// src/server.ts
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';

import { logger } from './utils/logger';
import prisma from './config/prisma';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Routes
import authRoutes from './routes/auth.routes';
import residentRoutes from './routes/resident.routes';
import meterRoutes from './routes/meter.routes';
import billingRoutes from './routes/billing.routes';
import paymentRoutes from './routes/payment.routes';
import paymentMethodRoutes from './routes/payment-method.routes';
import supportRoutes from './routes/support.routes';
import notificationRoutes from './routes/notification.routes';
import reportRoutes from './routes/report.routes';
import adminRoutes from './routes/admin.routes';
import aiRoutes from './routes/ai.routes';

dotenv.config();

const app: import("express").Application = express();
app.set('trust proxy', 1);
const httpServer = http.createServer(app);

// ============================================
// ALLOWED ORIGINS - Including Pesapal
// ============================================
const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_FRONTEND_URL,
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:3000', 'http://localhost:5173']
    : []),
].filter((origin): origin is string => Boolean(origin));
const allowedOrigins = new Set(configuredOrigins);

// ============================================
// SOCKET.IO SETUP
// ============================================
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }

      const isAllowed = allowedOrigins.has(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn(`Socket.IO CORS blocked: ${origin}`);
        callback(new Error('CORS not allowed'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// Socket.io connection handling
io.use(async (socket, next) => {
  try {
    const token = typeof socket.handshake.auth?.token === 'string'
      ? socket.handshake.auth.token
      : socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return next(new Error('Authentication required'));
    const { verifyAccessToken } = await import('./utils/jwt');
    const payload = verifyAccessToken(token);
    const { default: prisma } = await import('./config/prisma');
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, accountStatus: true },
    });
    if (!user || user.accountStatus !== 'ACTIVE') return next(new Error('Account inactive'));
    socket.data.userId = user.id;
    socket.data.isAdmin = user.role === 'SUPER_ADMIN';
    next();
  } catch {
    next(new Error('Invalid socket authentication'));
  }
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join', (roomName: string) => {
    if (!socket.data.isAdmin || typeof roomName !== 'string' || !roomName.startsWith('admin_')) {
      return;
    }
    socket.join(roomName);
    logger.info(`Socket ${socket.id} joined admin room: ${roomName}`);
  });

  socket.on('join_room', (userId: string) => {
    if (typeof userId !== 'string' || userId !== socket.data.userId) {
      logger.warn(`Rejected unauthorized room join from socket ${socket.id}`);
      return;
    }
    socket.join(`user_${userId}`);
    logger.info(`User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// ============================================
// SECURITY MIDDLEWARE
// ============================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ============================================
// CORS - Updated for Pesapal
// ============================================
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const isAllowed = allowedOrigins.has(origin);
    
    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked: ${origin}`);
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'x-session-id',
    'X-Session-Id',
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
  ],
}));

// ============================================
// BODY PARSING
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// LOGGING
// ============================================
app.use(morgan('combined', {
  stream: { write: (message) => logger.http(message.trim()) },
}));

// ============================================
// HEALTH HANDLER
// ============================================
const healthHandler = async (_req: express.Request, res: express.Response) => {
  const memoryUsage = process.memoryUsage();
  let database: 'ONLINE' | 'OFFLINE' = 'OFFLINE';
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'ONLINE';
  } catch (error) {
    logger.warn('Health check database dependency is unavailable');
  }
  const ready = database === 'ONLINE';

  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store',
  });

  res.status(ready ? 200 : 503).json({
    success: true,
    ready,
    status: ready ? 'ONLINE' : 'DEGRADED',
    process: 'ONLINE',
    dependencies: { database },
    service: 'Legacy Homes API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    },
  });
};

// ============================================
// HEALTH ENDPOINTS
// ============================================
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// ============================================
// RATE LIMITING
// ============================================
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const path = req.path;
    return path.startsWith('/health') || path === '/api/health';
  },
});

app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/refresh-token', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);

app.get('/deployment-test', (_req, res) => {
  res.json({
    deployed: true,
    timestamp: new Date().toISOString(),
    commit: process.env.RENDER_GIT_COMMIT || 'unknown'
  });
});

// Provider callbacks are public endpoints. Do not log raw bodies, headers, query strings, or tokens.
app.use('/api/payments/callback', (req, _res, next) => {
  logger.info('Payment callback received', { path: req.path, method: req.method });
  next();
});

// ============================================
// API ROUTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/residents', residentRoutes);
app.use('/api/meters', meterRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// ============================================
// ERROR HANDLING
// ============================================
app.use(notFound);
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================
const PORT = parseInt(process.env.PORT || '5000');

httpServer.listen(PORT, () => {
  logger.info(`🚀 Legacy Homes API running on port ${PORT}`);
  logger.info(`🕒 Started at ${new Date().toISOString()}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  logger.info(`📞 TUMA Callback URL: ${process.env.PAYMENT_CALLBACK_URL || 'NOT SET'}`);
  logger.info(`📞 PESAPAL Callback URL: ${process.env.PESAPAL_IPN_URL || 'NOT SET'}`);
  logger.info(`📞 PESAPAL Consumer Key: ${process.env.PESAPAL_CONSUMER_KEY ? '✅ Set' : '❌ Missing'}`);
});

export default app;
