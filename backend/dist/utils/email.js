"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBillNotificationEmail = exports.sendPasswordResetEmail = exports.sendOTPEmail = exports.sendEmail = void 0;
const brevo = __importStar(require("@getbrevo/brevo"));
const logger_1 = require("./logger");
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');
const sendEmail = async (options) => {
    try {
        await apiInstance.sendTransacEmail({
            sender: {
                email: 'legacyhomesk@gmail.com',
                name: 'Legacy Homes',
            },
            to: [
                {
                    email: options.to,
                },
            ],
            subject: options.subject,
            htmlContent: options.html,
            textContent: options.text,
        });
        logger_1.logger.info(`Email sent to ${options.to}: ${options.subject}`);
    }
    catch (error) {
        logger_1.logger.error(`Failed to send email to ${options.to}:`, error);
        throw error;
    }
};
exports.sendEmail = sendEmail;
const sendOTPEmail = async (email, name, otp) => {
    await (0, exports.sendEmail)({
        to: email,
        subject: 'Verify Your Email - Legacy Homes',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 0; }
          .container { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 36px 40px; text-align: center; }
          .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
          .body { padding: 40px; }
          .greeting { font-size: 18px; color: #1e293b; font-weight: 600; margin-bottom: 12px; }
          .message { color: #64748b; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
          .otp-container { background: #f1f5f9; border: 2px dashed #2563eb; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px; }
          .otp-label { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
          .otp-code { font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #1e3a5f; font-family: 'Courier New', monospace; }
          .expiry { font-size: 13px; color: #94a3b8; margin-top: 12px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
          .warning p { margin: 0; font-size: 13px; color: #92400e; }
          .footer { background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
          .footer p { margin: 0; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💧 Legacy Homes</h1>
            <p>Water Billing System</p>
          </div>
          <div class="body">
            <p class="greeting">Hello, ${name}! 👋</p>
            <p class="message">
              Welcome to Legacy Homes Water Billing System. To complete your registration and verify your email address, please use the OTP code below.
            </p>
            <div class="otp-container">
              <p class="otp-label">Your Verification Code</p>
              <p class="otp-code">${otp}</p>
              <p class="expiry">⏱ This code expires in 10 minutes</p>
            </div>
            <div class="warning">
              <p>🔒 <strong>Security Notice:</strong> Never share this code with anyone. Legacy Homes staff will never ask for your OTP.</p>
            </div>
            <p class="message" style="font-size:13px;">
              If you did not create an account with Legacy Homes, please ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Legacy Homes Water Billing System. All rights reserved.</p>
            <p style="margin-top:8px;">Nairobi, Kenya</p>
          </div>
        </div>
      </body>
      </html>
    `,
    });
};
exports.sendOTPEmail = sendOTPEmail;
const sendPasswordResetEmail = async (email, name, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await (0, exports.sendEmail)({
        to: email,
        subject: 'Reset Your Password - Legacy Homes',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 0; }
          .container { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 36px 40px; text-align: center; }
          .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
          .body { padding: 40px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #1e3a5f, #2563eb); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0; }
          .footer { background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
          .footer p { margin: 0; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>💧 Legacy Homes</h1></div>
          <div class="body">
            <p style="font-size:18px;font-weight:600;color:#1e293b;">Hello, ${name}!</p>
            <p style="color:#64748b;line-height:1.6;">We received a request to reset your password. Click the button below to create a new password. This link expires in 1 hour.</p>
            <div style="text-align:center;">
              <a href="${resetUrl}" class="btn">Reset Password</a>
            </div>
            <p style="color:#94a3b8;font-size:13px;">If you did not request a password reset, please ignore this email. Your account remains secure.</p>
            <p style="color:#94a3b8;font-size:12px;word-break:break-all;">Or copy this link: ${resetUrl}</p>
          </div>
          <div class="footer"><p>© ${new Date().getFullYear()} Legacy Homes Water Billing System</p></div>
        </div>
      </body>
      </html>
    `,
    });
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const sendBillNotificationEmail = async (email, name, billNumber, amount, month, dueDate) => {
    await (0, exports.sendEmail)({
        to: email,
        subject: `Water Bill for ${month} - Legacy Homes`,
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fb; margin: 0; }
          .container { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 36px 40px; text-align: center; }
          .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
          .body { padding: 40px; }
          .bill-card { background: #f1f5f9; border-radius: 12px; padding: 24px; margin: 24px 0; }
          .bill-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .bill-total { font-size: 24px; font-weight: 800; color: #1e3a5f; text-align: center; margin: 16px 0; }
          .btn { display: inline-block; background: linear-gradient(135deg, #1e3a5f, #2563eb); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }
          .footer { background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>💧 Legacy Homes</h1></div>
          <div class="body">
            <p style="font-size:18px;font-weight:600;color:#1e293b;">Hello, ${name}!</p>
            <p style="color:#64748b;">Your water bill for <strong>${month}</strong> is ready.</p>
            <div class="bill-card">
              <div class="bill-row"><span style="color:#64748b;">Bill Number</span><span style="font-weight:600;">${billNumber}</span></div>
              <div class="bill-row"><span style="color:#64748b;">Billing Month</span><span style="font-weight:600;">${month}</span></div>
              <div class="bill-row"><span style="color:#64748b;">Due Date</span><span style="font-weight:600;color:#ef4444;">${dueDate}</span></div>
              <div class="bill-total">KES ${amount.toLocaleString()}</div>
            </div>
            <div style="text-align:center;">
              <a href="${process.env.FRONTEND_URL}/dashboard/billing" class="btn">Pay Now via M-Pesa</a>
            </div>
          </div>
          <div class="footer"><p>© ${new Date().getFullYear()} Legacy Homes Water Billing System</p></div>
        </div>
      </body>
      </html>
    `,
    });
};
exports.sendBillNotificationEmail = sendBillNotificationEmail;
//# sourceMappingURL=email.js.map