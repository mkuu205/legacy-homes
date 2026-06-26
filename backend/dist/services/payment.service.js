"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = exports.PaymentService = void 0;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = __importDefault(require("../config/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const server_1 = require("../server");
const notification_service_1 = require("./notification.service");
const generatePaymentId = () => {
    return `PAY-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;
};
const normalizePhoneNumber = (phoneNumber) => {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        throw new errorHandler_1.AppError('Phone number is required', 400);
    }
    let phone = phoneNumber.trim().replace(/\s+/g, '');
    if (!phone) {
        throw new errorHandler_1.AppError('Phone number is required', 400);
    }
    if (phone.startsWith('+')) {
        phone = phone.slice(1);
    }
    if (phone.startsWith('0')) {
        phone = `254${phone.slice(1)}`;
    }
    if (phone.startsWith('7') && phone.length === 9) {
        phone = `254${phone}`;
    }
    if (!/^254\d{9}$/.test(phone)) {
        throw new errorHandler_1.AppError('Invalid phone number format. Use 07XXXXXXXX or 2547XXXXXXXX', 400);
    }
    return phone;
};
class PaymentService {
    constructor() {
        this.tumaApiUrl = process.env.TUMA_API_URL || 'https://api.tuma.co.ke';
        this.tumaAuthUrl = process.env.TUMA_AUTH_URL || 'https://api.tuma.co.ke/auth/token';
        this.cachedToken = null;
        this.tokenExpiry = null;
    }
    async getAuthToken() {
        if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.cachedToken;
        }
        try {
            logger_1.logger.info('Requesting new Tuma auth token');
            const response = await axios_1.default.post(this.tumaAuthUrl, {
                email: process.env.TUMA_BUSINESS_EMAIL,
                api_key: process.env.TUMA_API_KEY,
            });
            if (response.data.success && response.data.data.token) {
                this.cachedToken = response.data.data.token;
                this.tokenExpiry = Date.now() + 50 * 60 * 1000;
                return this.cachedToken;
            }
            throw new Error(response.data.message || 'Authentication failed');
        }
        catch (error) {
            logger_1.logger.error('Tuma authentication error:', error.response?.data || error.message);
            throw new errorHandler_1.AppError('Failed to authenticate with payment provider', 500);
        }
    }
    async initiateSTKPush(data) {
        if (!data.billId)
            throw new errorHandler_1.AppError('Bill ID is required', 400);
        if (!data.residentId)
            throw new errorHandler_1.AppError('Resident ID is required', 400);
        if (!data.amount || data.amount <= 0) {
            throw new errorHandler_1.AppError('Valid payment amount is required', 400);
        }
        const phone = normalizePhoneNumber(data.phoneNumber);
        const bill = await prisma_1.default.bill.findUnique({
            where: { id: data.billId },
            include: { resident: true },
        });
        if (!bill)
            throw new errorHandler_1.AppError('Bill not found', 404);
        if (bill.residentId !== data.residentId) {
            throw new errorHandler_1.AppError('Unauthorized', 403);
        }
        if (bill.status === 'PAID') {
            throw new errorHandler_1.AppError('Bill is already paid', 400);
        }
        if (data.amount > bill.balance) {
            throw new errorHandler_1.AppError(`Amount exceeds outstanding balance of KES ${bill.balance}`, 400);
        }
        const paymentId = generatePaymentId();
        const token = await this.getAuthToken();
        const payment = await prisma_1.default.payment.create({
            data: {
                bill: { connect: { id: data.billId } },
                resident: { connect: { id: data.residentId } },
                paymentMethod: 'MPESA_STK_PUSH',
                amount: data.amount,
                phoneNumber: phone,
                status: 'PENDING',
                provider: 'TUMA',
            },
        });
        try {
            const callbackUrl = process.env.PAYMENT_CALLBACK_URL;
            if (!callbackUrl) {
                logger_1.logger.error('PAYMENT_CALLBACK_URL is not configured in environment variables');
                throw new Error('PAYMENT_CALLBACK_URL is not configured');
            }
            const stkPayload = {
                amount: data.amount,
                phone: phone,
                description: `Water Bill Payment - ${bill.billNumber}`,
                callback_url: callbackUrl,
            };
            logger_1.logger.info(`Using callback URL: ${callbackUrl}`);
            logger_1.logger.info(`[TUMA] STK Push Payload for ${paymentId}:`, JSON.stringify(stkPayload, null, 2));
            const response = await axios_1.default.post(`${this.tumaApiUrl}/payment/stk-push`, stkPayload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            });
            if (response.data.success) {
                const { merchant_request_id, checkout_request_id } = response.data.data;
                await prisma_1.default.payment.update({
                    where: { id: payment.id },
                    data: {
                        merchantRequestId: merchant_request_id,
                        checkoutRequestId: checkout_request_id,
                    },
                });
                return {
                    success: true,
                    paymentId,
                    merchantRequestId: merchant_request_id,
                    checkoutRequestId: checkout_request_id,
                    message: response.data.message || 'STK Push sent successfully.',
                };
            }
            throw new Error(response.data.message || 'STK Push failed');
        }
        catch (error) {
            const isTimeout = error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout');
            const errorMessage = error.response?.data?.message || error.message || 'Unknown payment error';
            logger_1.logger.error(`Tuma STK Push error for ${paymentId}:`, error.response?.data || error.message);
            await prisma_1.default.payment.update({
                where: { id: payment.id },
                data: {
                    status: isTimeout ? 'PENDING' : 'FAILED',
                    failureReason: isTimeout ? 'Awaiting provider confirmation (Request Timeout)' : errorMessage,
                },
            });
            if (isTimeout) {
                return {
                    success: true,
                    paymentId,
                    message: 'Request timed out but payment may still be processed. Please wait for confirmation.',
                    status: 'PENDING'
                };
            }
            throw new errorHandler_1.AppError(errorMessage, 500);
        }
    }
    async handleCallback(payload, headers = {}) {
        logger_1.logger.info("CALLBACK REACHED APPLICATION");
        logger_1.logger.info("HEADERS: " + JSON.stringify(headers));
        logger_1.logger.info("BODY: " + JSON.stringify(payload));
        let auditId = null;
        try {
            // 1. Audit every callback request immediately
            const audit = await prisma_1.default.callbackAudit.create({
                data: {
                    headers: headers,
                    payload: payload,
                    provider: 'TUMA',
                    processed: false
                }
            });
            auditId = audit.id;
            const { checkout_request_id, merchant_request_id, status, mpesa_receipt_number, amount, result_code, result_desc, timestamp } = payload;
            // 2. Find the payment record
            const payment = await prisma_1.default.payment.findFirst({
                where: {
                    OR: [
                        { checkoutRequestId: checkout_request_id },
                        { merchantRequestId: merchant_request_id }
                    ].filter(Boolean)
                },
            });
            if (payment) {
                await prisma_1.default.callbackAudit.update({
                    where: { id: auditId },
                    data: { paymentId: payment.id }
                });
                if (payment.status === 'SUCCESSFUL') {
                    logger_1.logger.info(`Callback for already successful payment: ${payment.id}. Skipping.`);
                    await prisma_1.default.callbackAudit.update({
                        where: { id: auditId },
                        data: { processed: true, processingResult: 'ALREADY_SUCCESSFUL' }
                    });
                    return { success: true, message: 'Callback already processed' };
                }
                const verificationTimestamp = timestamp ? new Date(timestamp) : new Date();
                // 3. Success processing
                if (result_code === 0 || result_code === "0" || status === 'completed') {
                    logger_1.logger.info(`Payment ${payment.id} marked as SUCCESSFUL in Tuma callback.`);
                    await this.reconcilePayment(payment.id, mpesa_receipt_number, Number(amount || payment.amount), payload, verificationTimestamp);
                    await prisma_1.default.callbackAudit.update({
                        where: { id: auditId },
                        data: { processed: true, processingResult: 'SUCCESS' }
                    });
                    logger_1.logger.info(`Payment updated: ${payment.id} status = SUCCESSFUL`);
                }
                // 4. Failure processing
                else if (result_code !== 0 || status === 'failed') {
                    logger_1.logger.info(`Payment ${payment.id} marked as FAILED in callback: ${result_desc}`);
                    await prisma_1.default.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: 'FAILED',
                            failureReason: result_desc || 'Payment failed',
                            callbackPayload: payload,
                            verificationTimestamp,
                        },
                    });
                    await prisma_1.default.callbackAudit.update({
                        where: { id: auditId },
                        data: { processed: true, processingResult: 'FAILED_IN_PAYLOAD' }
                    });
                    logger_1.logger.info(`Payment updated: ${payment.id} status = FAILED`);
                }
            }
            else {
                logger_1.logger.warn(`Callback received for unknown payment. MerchantID: ${merchant_request_id}, CheckoutID: ${checkout_request_id}.`);
                await prisma_1.default.callbackAudit.update({
                    where: { id: auditId },
                    data: { processingResult: 'PAYMENT_NOT_FOUND' }
                });
            }
            return { success: true, message: 'Callback processed' };
        }
        catch (error) {
            logger_1.logger.error("CALLBACK PROCESSING FAILED", error);
            if (auditId) {
                await prisma_1.default.callbackAudit.update({
                    where: { id: auditId },
                    data: {
                        processed: false,
                        processingResult: 'ERROR',
                        errorMessage: error.message
                    }
                }).catch(e => logger_1.logger.error("Failed to update audit with error", e));
            }
            // Return 200 to Tuma to avoid retries if the error is on our side, 
            // but log it extensively for debugging.
            return { success: true, message: 'Callback received with internal error' };
        }
    }
    async reconcilePayment(paymentId, mpesaReceiptCode, amount, payload, verificationTimestamp) {
        let result = null;
        // 1. DATABASE TRANSACTION - Only data persistence
        await prisma_1.default.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({
                where: { id: paymentId },
                include: { bill: true },
            });
            if (!payment) {
                throw new Error(`Payment ${paymentId} not found during reconciliation`);
            }
            if (payment.status === 'SUCCESSFUL') {
                logger_1.logger.info(`Payment ${paymentId} already reconciled.`);
                return;
            }
            // Update Payment Record
            await tx.payment.update({
                where: { id: paymentId },
                data: {
                    status: 'SUCCESSFUL',
                    confirmationCode: mpesaReceiptCode,
                    callbackPayload: payload,
                    verificationTimestamp,
                    failureReason: null,
                },
            });
            // Update Bill Record
            const newAmountPaid = payment.bill.amountPaid + amount;
            const newBalance = Math.max(0, payment.bill.totalAmount - newAmountPaid);
            const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';
            await tx.bill.update({
                where: { id: payment.billId },
                data: {
                    amountPaid: newAmountPaid,
                    balance: newBalance,
                    status: newStatus,
                    updatedAt: new Date(),
                },
            });
            // Prepare data for post-transaction operations
            result = {
                residentId: payment.residentId,
                paymentId: payment.id,
                billId: payment.billId,
                billNumber: payment.bill.billNumber,
                newBalance,
                newStatus
            };
        }, {
            timeout: 20000 // Increase timeout to 20 seconds
        });
        if (!result)
            return;
        // 2. POST-TRANSACTION OPERATIONS - External services (SMS, Email, Sockets)
        logger_1.logger.info(`Transaction committed for payment ${result.paymentId}. Starting external operations.`);
        // Send Notifications (SMS/Email)
        try {
            await notification_service_1.notificationService.sendPaymentSuccessNotification(result.residentId, amount, mpesaReceiptCode);
            logger_1.logger.info(`Notifications sent for payment ${result.paymentId}`);
        }
        catch (err) {
            logger_1.logger.error(`Failed to send notifications for payment ${result.paymentId}:`, err);
        }
        // Emit Socket.IO events
        try {
            const room = `user_${result.residentId}`;
            server_1.io.to(room).emit('payment_completed', {
                paymentId: result.paymentId,
                amount,
                confirmationCode: mpesaReceiptCode,
                billId: result.billId,
                newBalance: result.newBalance,
                newStatus: result.newStatus
            });
            server_1.io.to(room).emit('bill_updated', {
                billId: result.billId,
                newBalance: result.newBalance,
                newStatus: result.newStatus
            });
            server_1.io.to(room).emit('dashboard_updated', {
                residentId: result.residentId
            });
            server_1.io.to(room).emit('notification_created', {
                type: 'PAYMENT_CONFIRMATION',
                message: `Payment of KES ${amount} received. Receipt: ${mpesaReceiptCode}`
            });
            logger_1.logger.info(`Socket events emitted for resident ${result.residentId}`);
        }
        catch (err) {
            logger_1.logger.error(`Failed to emit socket events for payment ${result.paymentId}:`, err);
        }
    }
    async checkPaymentStatus(paymentId, userId) {
        const payment = await prisma_1.default.payment.findUnique({
            where: { id: paymentId },
            include: { bill: true },
        });
        if (!payment)
            throw new errorHandler_1.AppError('Payment not found', 404);
        if (payment.residentId !== userId)
            throw new errorHandler_1.AppError('Unauthorized', 403);
        return payment;
    }
    async getResidentPayments(residentId, query) {
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 20);
        const where = { residentId };
        if (query.status)
            where.status = query.status;
        if (query.billId)
            where.billId = query.billId;
        const [payments, total] = await Promise.all([
            prisma_1.default.payment.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { bill: true },
            }),
            prisma_1.default.payment.count({ where }),
        ]);
        return {
            payments,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async getAllPayments(query) {
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 20);
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.residentId)
            where.residentId = query.residentId;
        if (query.search) {
            where.OR = [
                { confirmationCode: { contains: query.search, mode: 'insensitive' } },
                { id: { contains: query.search, mode: 'insensitive' } },
                { resident: { fullName: { contains: query.search, mode: 'insensitive' } } },
                { resident: { accountNumber: { contains: query.search, mode: 'insensitive' } } },
                { bill: { billNumber: { contains: query.search, mode: 'insensitive' } } },
            ];
        }
        const [payments, total] = await Promise.all([
            prisma_1.default.payment.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    resident: { select: { id: true, fullName: true, accountNumber: true, email: true, phone: true } },
                    bill: { select: { id: true, billNumber: true, billingMonth: true, totalAmount: true, status: true } },
                },
            }),
            prisma_1.default.payment.count({ where }),
        ]);
        return {
            payments,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }
    async getPaymentStats() {
        const [total, successful, pending, failed] = await Promise.all([
            prisma_1.default.payment.count(),
            prisma_1.default.payment.count({ where: { status: 'SUCCESSFUL' } }),
            prisma_1.default.payment.count({ where: { status: 'PENDING' } }),
            prisma_1.default.payment.count({ where: { status: 'FAILED' } }),
        ]);
        return { total, successful, pending, failed };
    }
    async deletePayment(id) {
        await prisma_1.default.payment.delete({ where: { id } });
        return { message: 'Payment deleted successfully' };
    }
    async bulkDeletePayments(ids) {
        const result = await prisma_1.default.payment.deleteMany({ where: { id: { in: ids } } });
        return { deleted: result.count };
    }
    async clearResidentPaymentHistory(residentId) {
        const result = await prisma_1.default.payment.deleteMany({ where: { residentId } });
        return { deleted: result.count, message: 'Payment history cleared successfully' };
    }
    async retryPaymentVerification(paymentId) {
        const payment = await prisma_1.default.payment.findFirst({ where: { id: paymentId } });
        if (!payment)
            throw new errorHandler_1.AppError('Payment not found', 404);
        if (payment.status === 'SUCCESSFUL')
            throw new errorHandler_1.AppError('Payment already successful', 400);
        // Since Tuma status endpoint doesn't exist, we can only return the current state
        // or wait for the callback. Manual reconciliation is not possible without an endpoint.
        return payment;
    }
    async exportPaymentsCSV(query) {
        const { formatDateInAppTimezone } = require('../utils/timezone');
        const where = {};
        if (query.status)
            where.status = query.status;
        const payments = await prisma_1.default.payment.findMany({
            where,
            include: {
                resident: { select: { fullName: true, accountNumber: true } },
                bill: { select: { billNumber: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        const header = 'Date,Payment ID,Resident,Account,Bill,Amount,M-Pesa Receipt,Status\n';
        const rows = payments.map(p => {
            const dateStr = formatDateInAppTimezone(p.createdAt, 'yyyy-MM-dd HH:mm:ss');
            return `${dateStr},${p.id},${p.resident.fullName},${p.resident.accountNumber},${p.bill.billNumber},${p.amount},${p.confirmationCode || ''},${p.status}`;
        }).join('\n');
        return header + rows;
    }
}
exports.PaymentService = PaymentService;
exports.paymentService = new PaymentService();
//# sourceMappingURL=payment.service.js.map