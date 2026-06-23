"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
const logger_1 = require("../utils/logger");
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, _next) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    // Prisma errors
    if (err.code === 'P2002') {
        statusCode = 409;
        message = 'A record with this information already exists.';
    }
    if (err.code === 'P2025') {
        statusCode = 404;
        message = 'Record not found.';
    }
    logger_1.logger.error({
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        statusCode,
    });
    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map