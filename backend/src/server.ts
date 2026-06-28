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
const allowedOrigins = [
  'http://localhost:3000',
  'https://legacy-homes-frontend.vercel.app',
  'https://pay.pesapal.com',
  'https://cybqa.pesapal.com',
  'https://*.pesapal.com',
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// ============================================
// SOCKET.IO SETUP
// ============================================
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || (origin && origin.endsWith('.vercel.app'))) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join', (roomName: string) => {
    socket.join(roomName);
    logger.info(`Socket ${socket.id} joined room: ${roomName}`);
  });

  socket.on('join_room', (userId: string) => {
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
    // Allow requests with no origin (like mobile apps, server-to-server)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        // Handle wildcards like *.pesapal.com
        const pattern = allowed.replace(/\./g, '\\.').replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowed === origin || origin.endsWith('.vercel.app');
    });
    
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
const healthHandler = (_req: express.Request, res: express.Response) => {
  const memoryUsage = process.memoryUsage();

  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store',
  });

  res.status(200).json({
    success: true,
    ready: true,
    status: 'ONLINE',
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
  skip: (req) => req.path.startsWith('/auth'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
app.use('/api/auth', authLimiter);

app.get('/deployment-test', (_req, res) => {
  res.json({
    deployed: true,
    timestamp: new Date().toISOString(),
    commit: process.env.RENDER_GIT_COMMIT || 'unknown'
  });
});

// ============================================
// 🔥 CALLBACK DEBUGGING MIDDLEWARE
// ============================================

// Log all callback attempts
app.use('/api/payments/callback', (req, res, next) => {
  logger.info('🔥 CALLBACK HIT - RAW REQUEST');
  logger.info('Method:', req.method);
  logger.info('Headers:', JSON.stringify(req.headers));
  logger.info('Query:', JSON.stringify(req.query));
  logger.info('Body:', JSON.stringify(req.body));
  next();
});

// Specific Pesapal callback logging
app.use('/api/payments/pesapal/callback', (req, res, next) => {
  logger.info('🔥 PESAPAL CALLBACK HIT');
  logger.info('Query:', JSON.stringify(req.query));
  next();
});

// Specific TUMA callback logging
app.use('/api/payments/tuma/callback', (req, res, next) => {
  logger.info('🔥 TUMA CALLBACK HIT');
  logger.info('Body:', JSON.stringify(req.body));
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
