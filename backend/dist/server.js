"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const socket_io_1 = require("socket.io");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const notFound_1 = require("./middleware/notFound");
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const resident_routes_1 = __importDefault(require("./routes/resident.routes"));
const meter_routes_1 = __importDefault(require("./routes/meter.routes"));
const billing_routes_1 = __importDefault(require("./routes/billing.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const payment_method_routes_1 = __importDefault(require("./routes/payment-method.routes"));
const support_routes_1 = __importDefault(require("./routes/support.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.set('trust proxy', 1);
const httpServer = http_1.default.createServer(app);
// Allowed frontend origins
const allowedOrigins = [
    'http://localhost:3000',
    'https://legacy-homes-frontend.vercel.app',
];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}
// Socket.io setup
exports.io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error('CORS not allowed'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true,
    },
});
// Socket.io connection handling
exports.io.on('connection', (socket) => {
    logger_1.logger.info(`Socket connected: ${socket.id}`);
    socket.on('join', (roomName) => {
        socket.join(roomName);
        logger_1.logger.info(`Socket ${socket.id} joined room: ${roomName}`);
    });
    socket.on('join_room', (userId) => {
        socket.join(`user_${userId}`);
        logger_1.logger.info(`User ${userId} joined their room`);
    });
    socket.on('disconnect', () => {
        logger_1.logger.info(`Socket disconnected: ${socket.id}`);
    });
});
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// Express CORS
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
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
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Logging
app.use((0, morgan_1.default)('combined', {
    stream: { write: (message) => logger_1.logger.http(message.trim()) },
}));
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'Legacy Homes API' });
});
app.get('/deployment-test', (_req, res) => {
    res.json({
        deployed: true,
        timestamp: new Date().toISOString(),
        commit: process.env.RENDER_GIT_COMMIT || 'unknown'
    });
});
// Callback Debugging Middleware - MUST BE BEFORE ANY OTHER MIDDLEWARE FOR THIS ROUTE
app.use('/api/payments/callback', (req, res, next) => {
    logger_1.logger.info('🔥 CALLBACK HIT - RAW REQUEST');
    logger_1.logger.info('HEADERS: ' + JSON.stringify(req.headers));
    logger_1.logger.info('BODY: ' + JSON.stringify(req.body));
    next();
});
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/residents', resident_routes_1.default);
app.use('/api/meters', meter_routes_1.default);
app.use('/api/billing', billing_routes_1.default);
app.use('/api/payments', payment_routes_1.default);
app.use('/api/payment-methods', payment_method_routes_1.default);
app.use('/api/support', support_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/reports', report_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/ai', ai_routes_1.default);
// Error handling
app.use(notFound_1.notFound);
app.use(errorHandler_1.errorHandler);
const PORT = parseInt(process.env.PORT || '5000');
httpServer.listen(PORT, () => {
    logger_1.logger.info(`🚀 Legacy Homes API running on port ${PORT}`);
    logger_1.logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
    logger_1.logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
    logger_1.logger.info(`PAYMENT_CALLBACK_URL=${process.env.PAYMENT_CALLBACK_URL}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map