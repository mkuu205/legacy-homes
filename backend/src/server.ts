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

// Allowed frontend origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://legacy-homes-frontend.vercel.app',
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Socket.io setup
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

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Express CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
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

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.http(message.trim()) },
}));

// --- HEALTH HANDLER (shared between endpoints) ---
// TODO: Extend this to check database, SMTP, and payment provider status
const healthHandler = (_req: express.Request, res: express.Response) => {
  const memoryUsage = process.memoryUsage();

  // Prevent caching of health check responses
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store',
  });

  // Status is always 'ONLINE' because the API is responding
  // Services are 'UNKNOWN' because we haven't implemented dependency checks yet
  // In a future iteration, add actual service health checks:
  // - Database connection pool status
  // - SMTP service availability
  // - Payment provider (Pesapal/Tuma) connectivity
  
  res.status(200).json({
    success: true,
    ready: true, // Indicates the server is fully initialized and accepting requests
    status: 'ONLINE',
    service: 'Legacy Homes API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
    },
    // Honest reporting - these are not yet verified
    services: {
      database: 'UNKNOWN',   // TODO: Check actual database connection
      smtp: 'UNKNOWN',       // TODO: Check SMTP service
      pesapal: 'UNKNOWN',    // TODO: Check Pesapal API
      tuma: 'UNKNOWN',       // TODO: Check Tuma API
    },
  });
};

// --- HEALTH ENDPOINTS (defined BEFORE rate limiting) ---
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// --- RATE LIMITING ---

// 1. Global limiter - protects all API routes EXCEPT health (already defined above)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 100 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Auth routes are skipped because they have their own limiter
  skip: (req) => req.path.startsWith('/auth'),
});

// 2. Dedicated auth limiter (stricter for login/registration)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 auth attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters AFTER health routes
app.use('/api/', limiter);
app.use('/api/auth', authLimiter);

app.get('/deployment-test', (_req, res) => {
  res.json({
    deployed: true,
    timestamp: new Date().toISOString(),
    commit: process.env.RENDER_GIT_COMMIT || 'unknown'
  });
});

// Callback Debugging Middleware
app.use('/api/payments/callback', (req, res, next) => {
  logger.info('🔥 CALLBACK HIT - RAW REQUEST');
  logger.info('HEADERS: ' + JSON.stringify(req.headers));
  logger.info('BODY: ' + JSON.stringify(req.body));
  next();
});

// API Routes
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

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '5000');

httpServer.listen(PORT, () => {
  logger.info(`🚀 Legacy Homes API running on port ${PORT}`);
  logger.info(`🕒 Started at ${new Date().toISOString()}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  logger.info(`PAYMENT_CALLBACK_URL=${process.env.PAYMENT_CALLBACK_URL}`);
});

export default app;
