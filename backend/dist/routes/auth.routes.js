"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = (0, express_1.Router)();
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many auth attempts. Please try again in 15 minutes.' },
});
const otpLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 3,
    message: { success: false, message: 'Too many OTP requests. Please wait before requesting again.' },
});
router.post('/register', authLimiter, auth_controller_1.authController.register.bind(auth_controller_1.authController));
router.post('/verify-otp', authLimiter, auth_controller_1.authController.verifyOTP.bind(auth_controller_1.authController));
router.post('/resend-otp', otpLimiter, auth_controller_1.authController.resendOTP.bind(auth_controller_1.authController));
router.post('/login', authLimiter, auth_controller_1.authController.login.bind(auth_controller_1.authController));
router.post('/refresh-token', auth_controller_1.authController.refreshToken.bind(auth_controller_1.authController));
router.post('/logout', auth_controller_1.authController.logout.bind(auth_controller_1.authController));
router.post('/forgot-password', authLimiter, auth_controller_1.authController.forgotPassword.bind(auth_controller_1.authController));
router.post('/reset-password', authLimiter, auth_controller_1.authController.resetPassword.bind(auth_controller_1.authController));
router.get('/me', auth_1.authenticate, auth_controller_1.authController.getMe.bind(auth_controller_1.authController));
router.delete('/delete-account', auth_1.authenticate, auth_controller_1.authController.deleteAccount.bind(auth_controller_1.authController));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map