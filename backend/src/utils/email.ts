import * as brevo from '@getbrevo/brevo';
import { logger } from './logger';

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY || ''
);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    await apiInstance.sendTransacEmail({
      sender: {
        email: 'legacyhomesk@gmail.com',
        name: 'Legacy Homes',
      },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.text,
    });
    logger.info(`Email sent to ${options.to}: ${options.subject}`);
  } catch (error) {
    logger.error(`Failed to send email to ${options.to}:`, error);
    throw error;
  }
};

// ─── Shared Design Tokens ─────────────────────────────────────────────────────
const LOGO_URL = 'https://i.ibb.co/5hvy5zXd/Chat-GPT-Image-Jun-23-2026-01-17-11-AM.png';
const BRAND_TEAL = '#00c6a7';
const BRAND_DARK = '#0b1525';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const YEAR = new Date().getFullYear();

function emailWrapper(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#eef2f7;color:#1e293b;}
.wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.10);}
.hdr{background:linear-gradient(135deg,${BRAND_DARK} 0%,#152642 100%);padding:32px 40px;text-align:center;border-bottom:4px solid ${BRAND_TEAL};}
.hdr img{height:60px;width:60px;border-radius:12px;object-fit:contain;display:block;margin:0 auto 14px;}
.hdr h1{color:#fff;font-size:22px;font-weight:800;letter-spacing:-.3px;margin-bottom:4px;}
.hdr p{color:${BRAND_TEAL};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;}
.body{padding:40px;}
.greeting{font-size:18px;font-weight:700;color:#0f172a;margin-bottom:12px;}
.text{font-size:14px;color:#475569;line-height:1.75;margin-bottom:16px;}
.card{background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;padding:24px;margin:24px 0;}
.row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:13px;}
.row:last-child{border-bottom:none;}
.lbl{color:#64748b;font-weight:500;}
.val{color:#0f172a;font-weight:700;text-align:right;}
.amount{font-size:34px;font-weight:900;color:${BRAND_DARK};text-align:center;padding:20px 0 8px;font-family:'Courier New',monospace;letter-spacing:.02em;}
.btn-wrap{text-align:center;margin:24px 0;}
.btn{display:inline-block;background:linear-gradient(135deg,${BRAND_TEAL} 0%,#00a68b 100%);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:.02em;}
.badge{display:inline-block;padding:3px 12px;border-radius:100px;font-size:11px;font-weight:700;letter-spacing:.04em;}
.badge-paid{background:rgba(16,185,129,.12);color:#059669;}
.badge-unpaid{background:rgba(239,68,68,.12);color:#dc2626;}
.badge-partial{background:rgba(245,158,11,.12);color:#d97706;}
.badge-suspended{background:rgba(239,68,68,.12);color:#dc2626;}
.badge-active{background:rgba(16,185,129,.12);color:#059669;}
.otp-box{background:linear-gradient(135deg,${BRAND_DARK},#152642);border:2px solid ${BRAND_TEAL};border-radius:16px;padding:24px 48px;text-align:center;display:inline-block;}
.otp-lbl{font-size:11px;color:${BRAND_TEAL};font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;}
.otp-code{font-size:42px;font-weight:900;color:#fff;letter-spacing:.25em;font-family:'Courier New',monospace;}
.warn-box{background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:16px 20px;margin:20px 0;}
.ok-box{background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.2);border-radius:10px;padding:16px 20px;margin:20px 0;}
.info-box{background:rgba(0,198,167,.06);border:1px solid rgba(0,198,167,.2);border-radius:10px;padding:16px 20px;margin:20px 0;}
.quote{background:#f8fafc;border-left:4px solid ${BRAND_TEAL};border-radius:0 10px 10px 0;padding:16px 20px;margin:20px 0;}
.ftr{background:#f8fafc;padding:28px 40px;text-align:center;border-top:1px solid #e2e8f0;}
.ftr p{font-size:12px;color:#94a3b8;line-height:1.6;}
.ftr a{color:${BRAND_TEAL};text-decoration:none;font-weight:600;}
@media(max-width:600px){
  .wrap{margin:0;border-radius:0;}
  .body{padding:24px 20px;}
  .hdr{padding:24px 20px;}
  .ftr{padding:20px;}
  .row{flex-direction:column;align-items:flex-start;gap:4px;}
  .val{text-align:left;}
  .otp-box{padding:20px 32px;}
  .otp-code{font-size:32px;}
}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <img src="${LOGO_URL}" alt="Legacy Homes"/>
    <h1>Legacy Homes</h1>
    <p>Water Billing System · Nairobi, Kenya</p>
  </div>
  <div class="body">${bodyHtml}</div>
  <div class="ftr">
    <p>© ${YEAR} Legacy Homes Water Billing System · Nairobi, Kenya</p>
    <p style="margin-top:8px;">
      <a href="mailto:support@legacyhomes.co.ke">support@legacyhomes.co.ke</a> &nbsp;·&nbsp;
      <a href="tel:+254700000000">+254 700 000 000</a> &nbsp;·&nbsp;
      <a href="${FRONTEND_URL}">legacyhomes.co.ke</a>
    </p>
    <p style="margin-top:10px;font-size:11px;color:#cbd5e1;">This is an automated message. Please do not reply directly to this email.</p>
  </div>
</div>
</body>
</html>`;
}

// ─── OTP / Email Verification ─────────────────────────────────────────────────
export const sendOTPEmail = async (email: string, name: string, otp: string): Promise<void> => {
  await sendEmail({
    to: email,
    subject: 'Verify Your Email — Legacy Homes',
    html: emailWrapper(`
      <p class="greeting">Hello, ${name}! 👋</p>
      <p class="text">Welcome to Legacy Homes. To complete your registration and verify your email address, please use the verification code below.</p>
      <div style="text-align:center;margin:32px 0;">
        <div class="otp-box">
          <p class="otp-lbl">Verification Code</p>
          <p class="otp-code">${otp}</p>
        </div>
      </div>
      <div class="info-box">
        <p style="font-size:13px;color:#0f172a;font-weight:600;margin-bottom:4px;">⏱ This code expires in 10 minutes</p>
        <p style="font-size:12px;color:#475569;">If you did not create an account, please ignore this email.</p>
      </div>
      <div class="warn-box">
        <p style="font-size:12px;color:#dc2626;font-weight:600;">🔒 Security: Never share this code with anyone. Legacy Homes staff will never ask for your OTP.</p>
      </div>
    `),
  });
};

// ─── Password Reset ───────────────────────────────────────────────────────────
export const sendPasswordResetEmail = async (email: string, name: string, resetToken: string): Promise<void> => {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: email,
    subject: 'Reset Your Password — Legacy Homes',
    html: emailWrapper(`
      <p class="greeting">Hello, ${name}!</p>
      <p class="text">We received a request to reset your password. Click the button below to create a new password. This link expires in <strong>1 hour</strong>.</p>
      <div class="btn-wrap">
        <a href="${resetUrl}" class="btn">Reset My Password</a>
      </div>
      <div class="warn-box">
        <p style="font-size:13px;color:#dc2626;font-weight:600;margin-bottom:4px;">⚠ Security Notice</p>
        <p style="font-size:12px;color:#475569;">If you did not request a password reset, please ignore this email. Your account remains secure.</p>
      </div>
      <p style="font-size:12px;color:#94a3b8;word-break:break-all;margin-top:16px;">Or copy this link: <a href="${resetUrl}" style="color:${BRAND_TEAL};">${resetUrl}</a></p>
    `),
  });
};

// ─── Welcome Email ────────────────────────────────────────────────────────────
export const sendWelcomeEmail = async (email: string, name: string, accountNumber: string): Promise<void> => {
  await sendEmail({
    to: email,
    subject: 'Welcome to Legacy Homes Water Billing System',
    html: emailWrapper(`
      <p class="greeting">Welcome, ${name}! 🎉</p>
      <p class="text">Your account has been successfully created and activated. You can now access the Legacy Homes Water Billing System to manage your water bills, make payments, and track your usage.</p>
      <div class="card">
        <div class="row"><span class="lbl">Account Number</span><span class="val" style="font-family:monospace;">${accountNumber}</span></div>
        <div class="row"><span class="lbl">Email</span><span class="val">${email}</span></div>
        <div class="row"><span class="lbl">Status</span><span class="val"><span class="badge badge-active">ACTIVE</span></span></div>
      </div>
      <div class="btn-wrap">
        <a href="${FRONTEND_URL}/dashboard" class="btn">Go to Dashboard</a>
      </div>
      <p class="text" style="font-size:13px;color:#94a3b8;">If you have any questions, contact our support team at <a href="mailto:support@legacyhomes.co.ke" style="color:${BRAND_TEAL};">support@legacyhomes.co.ke</a></p>
    `),
  });
};

// ─── Bill Generated ───────────────────────────────────────────────────────────
export const sendBillNotificationEmail = async (
  email: string,
  name: string,
  billNumber: string,
  amount: number,
  month: string,
  dueDate: string
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: `Water Bill for ${month} — KES ${amount.toLocaleString()} Due`,
    html: emailWrapper(`
      <p class="greeting">Hello, ${name}!</p>
      <p class="text">Your water bill for <strong>${month}</strong> is now available. Please make payment before the due date to avoid late penalties.</p>
      <div class="card">
        <div class="row"><span class="lbl">Bill Number</span><span class="val" style="font-family:monospace;">${billNumber}</span></div>
        <div class="row"><span class="lbl">Billing Period</span><span class="val">${month}</span></div>
        <div class="row"><span class="lbl">Due Date</span><span class="val" style="color:#dc2626;">${dueDate}</span></div>
        <div class="row"><span class="lbl">Status</span><span class="val"><span class="badge badge-unpaid">UNPAID</span></span></div>
      </div>
      <div class="amount">KES ${amount.toLocaleString()}</div>
      <div class="btn-wrap">
        <a href="${FRONTEND_URL}/dashboard/payments" class="btn">Pay via M-Pesa Now</a>
      </div>
      <div class="info-box">
        <p style="font-size:13px;color:#0f172a;font-weight:600;margin-bottom:6px;">📱 How to Pay via M-Pesa</p>
        <p style="font-size:12px;color:#475569;line-height:1.75;">1. Go to M-Pesa on your phone<br/>2. Select <strong>Lipa na M-Pesa</strong><br/>3. Select <strong>Pay Bill</strong><br/>4. Or use our online portal above for instant payment</p>
      </div>
    `),
  });
};

// ─── Payment Receipt ──────────────────────────────────────────────────────────
export const sendPaymentReceiptEmail = async (
  email: string,
  name: string,
  amount: number,
  mpesaCode: string,
  billNumber: string,
  balance: number
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: `Payment Confirmed — KES ${amount.toLocaleString()} Received`,
    html: emailWrapper(`
      <p class="greeting">Payment Received! ✅</p>
      <p class="text">Thank you, <strong>${name}</strong>. Your payment has been successfully processed and your account has been updated.</p>
      <div class="card">
        <div class="row"><span class="lbl">M-Pesa Receipt</span><span class="val" style="font-family:monospace;">${mpesaCode || 'N/A'}</span></div>
        <div class="row"><span class="lbl">Bill Number</span><span class="val" style="font-family:monospace;">${billNumber}</span></div>
        <div class="row"><span class="lbl">Amount Paid</span><span class="val" style="color:#059669;">KES ${amount.toLocaleString()}</span></div>
        <div class="row"><span class="lbl">Outstanding Balance</span><span class="val" style="color:${balance > 0 ? '#dc2626' : '#059669'};">KES ${balance.toLocaleString()}</span></div>
        <div class="row"><span class="lbl">Status</span><span class="val"><span class="badge ${balance <= 0 ? 'badge-paid' : 'badge-partial'}">${balance <= 0 ? 'FULLY PAID' : 'PARTIAL PAYMENT'}</span></span></div>
      </div>
      <div class="ok-box">
        <p style="font-size:13px;color:#059669;font-weight:600;">✅ Payment successfully recorded</p>
        ${balance > 0 ? `<p style="font-size:12px;color:#475569;margin-top:4px;">You still have an outstanding balance of <strong>KES ${balance.toLocaleString()}</strong>. Please pay the remaining amount before the due date.</p>` : '<p style="font-size:12px;color:#475569;margin-top:4px;">Your bill is fully paid. Thank you!</p>'}
      </div>
      <div class="btn-wrap">
        <a href="${FRONTEND_URL}/dashboard/billing" class="btn">View My Bills</a>
      </div>
    `),
  });
};

// ─── Account Suspended ────────────────────────────────────────────────────────
export const sendAccountSuspendedEmail = async (email: string, name: string, reason?: string): Promise<void> => {
  await sendEmail({
    to: email,
    subject: 'Account Suspended — Legacy Homes',
    html: emailWrapper(`
      <p class="greeting">Hello, ${name}</p>
      <div class="warn-box">
        <p style="font-size:15px;color:#dc2626;font-weight:700;margin-bottom:8px;">⚠ Your account has been suspended</p>
        <p style="font-size:13px;color:#475569;">${reason || 'Your account has been suspended due to policy violations or outstanding payments. Please contact support for more information.'}</p>
      </div>
      <p class="text">While your account is suspended, you will not be able to access the billing portal. To resolve this issue, please contact our support team immediately.</p>
      <div class="btn-wrap">
        <a href="mailto:support@legacyhomes.co.ke" class="btn">Contact Support</a>
      </div>
    `),
  });
};

// ─── Account Activated ────────────────────────────────────────────────────────
export const sendAccountActivatedEmail = async (email: string, name: string): Promise<void> => {
  await sendEmail({
    to: email,
    subject: 'Account Activated — Legacy Homes',
    html: emailWrapper(`
      <p class="greeting">Great news, ${name}! 🎉</p>
      <div class="ok-box">
        <p style="font-size:15px;color:#059669;font-weight:700;margin-bottom:8px;">✅ Your account has been activated</p>
        <p style="font-size:13px;color:#475569;">You can now access all features of the Legacy Homes Water Billing System.</p>
      </div>
      <p class="text">Your account is now active. You can log in to view your bills, make payments, and manage your account.</p>
      <div class="btn-wrap">
        <a href="${FRONTEND_URL}/dashboard" class="btn">Go to Dashboard</a>
      </div>
    `),
  });
};

// ─── Account Deleted ──────────────────────────────────────────────────────────
export const sendAccountDeletedEmail = async (email: string, name: string): Promise<void> => {
  await sendEmail({
    to: email,
    subject: 'Account Deleted — Legacy Homes',
    html: emailWrapper(`
      <p class="greeting">Hello, ${name}</p>
      <p class="text">Your Legacy Homes account has been permanently deleted as requested. All your personal data has been removed from our system.</p>
      <div class="info-box">
        <p style="font-size:13px;color:#0f172a;font-weight:600;margin-bottom:4px;">What this means:</p>
        <p style="font-size:12px;color:#475569;line-height:1.75;">• Your account and personal data have been deleted<br/>• Your billing history has been anonymized<br/>• You will no longer receive emails from us</p>
      </div>
      <p class="text">If you believe this was done in error, please contact our support team immediately.</p>
      <div class="btn-wrap">
        <a href="mailto:support@legacyhomes.co.ke" class="btn">Contact Support</a>
      </div>
    `),
  });
};

// ─── Support Ticket Update ────────────────────────────────────────────────────
export const sendSupportTicketUpdateEmail = async (
  email: string,
  name: string,
  ticketSubject: string,
  ticketId: string,
  replyMessage: string
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: `Support Reply: ${ticketSubject}`,
    html: emailWrapper(`
      <p class="greeting">Hello, ${name}!</p>
      <p class="text">Your support ticket has received a reply from our team.</p>
      <div class="card">
        <div class="row"><span class="lbl">Ticket ID</span><span class="val" style="font-family:monospace;">${ticketId}</span></div>
        <div class="row"><span class="lbl">Subject</span><span class="val">${ticketSubject}</span></div>
      </div>
      <div class="quote">
        <p style="font-size:11px;color:${BRAND_TEAL};font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Support Team Reply</p>
        <p style="font-size:13px;color:#1e293b;line-height:1.75;">${replyMessage}</p>
      </div>
      <div class="btn-wrap">
        <a href="${FRONTEND_URL}/dashboard/support" class="btn">View Full Conversation</a>
      </div>
    `),
  });
};
