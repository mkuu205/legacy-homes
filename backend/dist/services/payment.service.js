"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = exports.PaymentService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../config/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const server_1 = require("../server");
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
    if (!/^2547\d{8}$/.test(phone)) {
        throw new errorHandler_1.AppError('Invalid phone number format. Use 07XXXXXXXX or 2547XXXXXXXX', 400);
    }
    return phone;
};
class PaymentService {
    constructor() {
        this.payHeroBaseUrl = 'https://backend.payhero.co.ke/api/v2';
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
        const existingPendingPayment = await prisma_1.default.payment.findFirst({
            where: {
                billId: data.billId,
                residentId: data.residentId,
                status: 'PENDING',
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (existingPendingPayment) {
            const pendingAge = Date.now() - new Date(existingPendingPayment.createdAt).getTime();
            const timeoutMs = 60 * 1000;
            if (pendingAge < timeoutMs) {
                throw new errorHandler_1.AppError(`A payment request is already pending. Please wait ${Math.ceil((timeoutMs - pendingAge) / 1000)} seconds.`, 400);
            }
            await prisma_1.default.payment.update({
                where: { id: existingPendingPayment.id },
                data: {
                    status: 'FAILED',
                    failureReason: 'Timed out / abandoned by user',
                },
            });
        }
        const paymentId = generatePaymentId();
        const payment = await prisma_1.default.payment.create({
            data: {
                paymentId,
                billId: data.billId,
                residentId: data.residentId,
                amount: data.amount,
                phoneNumber: phone,
                status: 'PENDING',
            },
        });
        try {
            const response = await axios_1.default.post(`${this.payHeroBaseUrl}/payments`, {
                amount: data.amount,
                phone_number: phone,
                channel_id: process.env.PAYHERO_CHANNEL_ID,
                provider: 'm-pesa',
                external_reference: paymentId,
                callback_url: process.env.PAYHERO_CALLBACK_URL,
                customer_name: bill.resident?.fullName || 'Customer',
                account_reference: bill.billNumber,
                description: `Water Bill Payment - ${bill.billNumber}`,
            }, {
                headers: {
                    Authorization: process.env.PAYHERO_AUTH,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                timeout: 30000,
            });
            const checkoutRequestId = response.data?.CheckoutRequestID ||
                response.data?.checkout_request_id ||
                response.data?.reference ||
                null;
            await prisma_1.default.payment.update({
                where: { id: payment.id },
                data: {
                    checkoutRequestId,
                    payHeroReference: response.data?.reference || null,
                },
            });
            return {
                success: true,
                paymentId,
                checkoutRequestId,
                message: 'STK Push sent successfully.',
            };
        }
        catch (error) {
            await prisma_1.default.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'FAILED',
                    failureReason: error?.response?.data?.message ||
                        error?.message ||
                        'Unknown payment error',
                },
            });
            throw new errorHandler_1.AppError(error?.response?.data?.message || 'Failed to initiate payment.', 500);
        }
    }
    async handleCallback(payload, signature) {
        const webhookSecret = process.env.PAYHERO_WEBHOOK_SECRET;
        if (webhookSecret && signature) {
            const expectedSig = crypto_1.default
                .createHmac('sha256', webhookSecret)
                .update(JSON.stringify(payload))
                .digest('hex');
            if (signature !== expectedSig) {
                throw new errorHandler_1.AppError('Invalid webhook signature', 401);
            }
        }
        const paymentId = payload?.external_reference ||
            payload?.reference ||
            payload?.payment_reference;
        const status = payload?.status;
        const mpesaReceiptCode = payload?.MpesaReceiptNumber || payload?.mpesa_receipt || null;
        const amount = Number(payload?.Amount || payload?.amount || 0);
        if (!paymentId) {
            return { received: true };
        }
        const payment = await prisma_1.default.payment.findUnique({
            where: { paymentId },
        });
        if (!payment || payment.status === 'SUCCESSFUL') {
            return { received: true };
        }
        if (status === 'SUCCESS' ||
            status === 'COMPLETED') {
            await this.reconcilePayment(payment.id, mpesaReceiptCode, amount);
        }
        else {
            await prisma_1.default.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'FAILED',
                    failureReason: payload?.ResultDesc ||
                        payload?.message ||
                        'Payment failed',
                    mpesaReceiptCode,
                },
            });
        }
        return { received: true };
    }
    async reconcilePayment(paymentId, mpesaReceiptCode, amount) {
        const payment = await prisma_1.default.payment.findUnique({
            where: { id: paymentId },
            include: { bill: true },
        });
        if (!payment || payment.status === 'SUCCESSFUL') {
            return;
        }
        await prisma_1.default.payment.update({
            where: { id: paymentId },
            data: {
                status: 'SUCCESSFUL',
                mpesaReceiptCode,
            },
        });
        const newAmountPaid = payment.bill.amountPaid + amount;
        const newBalance = payment.bill.totalAmount - newAmountPaid;
        await prisma_1.default.bill.update({
            where: { id: payment.billId },
            data: {
                amountPaid: newAmountPaid,
                balance: Math.max(0, newBalance),
                status: newBalance <= 0 ? 'PAID' : 'PARTIAL',
            },
        });
        server_1.io.to(`user_${payment.residentId}`).emit('payment_success', {
            paymentId: payment.paymentId,
            amount,
            mpesaReceiptCode,
        });
    }
    async checkPaymentStatus(paymentId, userId) {
        const payment = await prisma_1.default.payment.findUnique({
            where: { paymentId },
            include: {
                bill: {
                    select: {
                        billNumber: true,
                        status: true,
                        balance: true,
                    },
                },
            },
        });
        if (!payment) {
            throw new errorHandler_1.AppError('Payment not found', 404);
        }
        if (payment.residentId !== userId) {
            throw new errorHandler_1.AppError('Unauthorized', 403);
        }
        const pendingAge = Date.now() - new Date(payment.createdAt).getTime();
        // Auto-fail abandoned/cancelled payments after 15 seconds
        if (payment.status === 'PENDING' && pendingAge > 15 * 1000) {
            await prisma_1.default.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'FAILED',
                    failureReason: 'Payment cancelled / timed out / insufficient funds',
                },
            });
            return {
                ...payment,
                status: 'FAILED',
                failureReason: 'Payment cancelled / timed out / insufficient funds',
            };
        }
        return payment;
    }
    async getResidentPayments(residentId, query) {
        const pageNum = Number.parseInt(String(query?.page || 1), 10);
        const limitNum = Number.parseInt(String(query?.limit || 20), 10);
        const where = { residentId };
        if (query.status) {
            where.status = query.status;
        }
        const payments = await prisma_1.default.payment.findMany({
            where,
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            orderBy: { createdAt: 'desc' },
            include: {
                bill: true,
            },
        });
        const total = await prisma_1.default.payment.count({ where });
        return {
            payments,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        };
    }
    async getAllPayments(query) {
        const pageNum = Number.parseInt(String(query?.page || 1), 10);
        const limitNum = Number.parseInt(String(query?.limit || 20), 10);
        const payments = await prisma_1.default.payment.findMany({
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            orderBy: { createdAt: 'desc' },
            include: {
                resident: true,
                bill: true,
            },
        });
        const total = await prisma_1.default.payment.count();
        return {
            payments,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        };
    }
    async getPaymentStats() {
        const total = await prisma_1.default.payment.count();
        const successful = await prisma_1.default.payment.count({
            where: { status: 'SUCCESSFUL' },
        });
        const pending = await prisma_1.default.payment.count({
            where: { status: 'PENDING' },
        });
        const failed = await prisma_1.default.payment.count({
            where: { status: 'FAILED' },
        });
        return {
            total,
            successful,
            pending,
            failed,
        };
    }
}
exports.PaymentService = PaymentService;
exports.paymentService = new PaymentService();
//# sourceMappingURL=payment.service.js.map