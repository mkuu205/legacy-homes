"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const errorHandler_1 = require("./errorHandler");
const authMiddleware = (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errorHandler_1.AppError('Access token required', 401);
        }
        const token = authHeader.split(' ')[1];
        req.user = (0, jwt_1.verifyAccessToken)(token);
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            next(new errorHandler_1.AppError('Access token expired', 401));
        }
        else if (error.name === 'JsonWebTokenError') {
            next(new errorHandler_1.AppError('Invalid access token', 401));
        }
        else {
            next(error);
        }
    }
};
exports.authMiddleware = authMiddleware;
exports.authenticate = exports.authMiddleware;
const authorize = (...roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            next(new errorHandler_1.AppError('Authentication required', 401));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next(new errorHandler_1.AppError('Insufficient permissions', 403));
            return;
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.js.map