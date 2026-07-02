import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router: import("express").Router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts. Please try again in 15 minutes.' },
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many OTP requests. Please wait before requesting again.' },
});

router.post('/register', authLimiter, authController.register.bind(authController));
router.post('/verify-otp', authLimiter, authController.verifyOTP.bind(authController));
router.post('/resend-otp', otpLimiter, authController.resendOTP.bind(authController));
router.post('/login', authLimiter, authController.login.bind(authController));

// Outage notification (Public)
import { outageController } from '../controllers/outage.controller';
router.post('/notify-outage', outageController.subscribe.bind(outageController));

// Token refresh - NO RATE LIMIT
router.post('/refresh-token', authController.refreshToken.bind(authController));

router.post('/logout', authController.logout.bind(authController));

// Password recovery - STRICT RATE LIMIT
router.post('/forgot-password', authLimiter, authController.forgotPassword.bind(authController));
router.post('/reset-password', authLimiter, authController.resetPassword.bind(authController));

// Profile - NO RATE LIMIT (handled by authentication)
router.get('/me', authenticate, authController.getMe.bind(authController));
router.delete('/delete-account', authenticate, authController.deleteAccount.bind(authController));

export default router;
