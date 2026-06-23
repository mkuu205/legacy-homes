"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = exports.AIService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const prisma_1 = __importDefault(require("../config/prisma"));
const logger_1 = __importDefault(require("../utils/logger"));
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
class AIService {
    async chat(userId, message) {
        // Fetch user context
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: {
                fullName: true,
                accountNumber: true,
                houseId: true,
                accountStatus: true,
                bills: {
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                    select: {
                        billNumber: true,
                        billingMonth: true,
                        totalAmount: true,
                        amountPaid: true,
                        balance: true,
                        status: true,
                        dueDate: true,
                    },
                },
                payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                    select: {
                        paymentId: true,
                        amount: true,
                        status: true,
                        mpesaReceiptCode: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!user)
            throw new Error('User not found');
        // Fetch house info for houseNumber
        let houseNumber = 'Not set';
        if (user.houseId) {
            const house = await prisma_1.default.house.findUnique({
                where: { id: user.houseId },
                select: { houseNumber: true },
            });
            houseNumber = house?.houseNumber || 'Not set';
        }
        // Fetch meter info
        let meterInfo = '- No active meter';
        if (user.houseId) {
            const meter = await prisma_1.default.meter.findUnique({
                where: { houseId: user.houseId },
                select: { meterNumber: true, currentReading: true, previousReading: true, status: true },
            });
            if (meter && meter.status === 'ACTIVE') {
                meterInfo = `- Meter: ${meter.meterNumber}, Current Reading: ${meter.currentReading}, Previous: ${meter.previousReading}`;
            }
        }
        const currentBill = user.bills[0];
        const systemPrompt = `You are a helpful AI assistant for Legacy Homes Water Billing System in Kenya.

RESIDENT INFORMATION:
- Name: ${user.fullName}
- Account Number: ${user.accountNumber}
- House Number: ${houseNumber}
- Account Status: ${user.accountStatus}

CURRENT BILLING:
${currentBill
            ? `
- Latest Bill: ${currentBill.billNumber} (${currentBill.billingMonth})
- Total Amount: KES ${currentBill.totalAmount.toLocaleString()}
- Amount Paid: KES ${currentBill.amountPaid.toLocaleString()}
- Outstanding Balance: KES ${currentBill.balance.toLocaleString()}
- Bill Status: ${currentBill.status}
- Due Date: ${new Date(currentBill.dueDate).toLocaleDateString('en-KE')}
`
            : '- No bills found'}

RECENT PAYMENTS:
${user.payments.length > 0
            ? user.payments
                .map((p) => `- ${p.paymentId}: KES ${p.amount.toLocaleString()} - ${p.status} ${p.mpesaReceiptCode ? `(Receipt: ${p.mpesaReceiptCode})` : ''}`)
                .join('\n')
            : '- No payment history'}

METER INFO:
${meterInfo}

BILLING RULES:
- Rate: KES 250 per unit consumed
- Formula: Bill = (Current Reading - Previous Reading) × 250
- No service charges, garbage fees, or hidden charges
- Payments via M-Pesa STK Push only

INSTRUCTIONS:
- Be friendly, professional, and concise
- Answer billing, payment, and account questions using the data above
- For payment issues, guide them to use the Pay Now button on their dashboard
- For meter issues, advise them to create a support ticket
- Do not make up information not provided above
- Always respond in English`;
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: `${systemPrompt}\n\nUser message: ${message}`,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    maxOutputTokens: 500,
                    temperature: 0.7,
                },
            });
            const response = result.response;
            const responseText = response.text();
            return {
                message: responseText,
                usage: {
                    prompt_tokens: 0, // Gemini doesn't expose token counts in free tier
                    completion_tokens: 0,
                },
            };
        }
        catch (error) {
            logger_1.default.error('Gemini API error:', error);
            // Fallback responses for common questions
            return this.getFallbackResponse(message, user, houseNumber);
        }
    }
    getFallbackResponse(message, user, houseNumber) {
        const lower = message.toLowerCase();
        const currentBill = user.bills[0];
        if (lower.includes('bill') || lower.includes('amount') || lower.includes('balance')) {
            if (currentBill) {
                return {
                    message: `Your current bill is **KES ${currentBill.totalAmount.toLocaleString()}** for ${currentBill.billingMonth}. Outstanding balance: **KES ${currentBill.balance.toLocaleString()}**. Status: ${currentBill.status}. Due: ${new Date(currentBill.dueDate).toLocaleDateString('en-KE')}.`,
                };
            }
            return { message: "You don't have any active bills at the moment." };
        }
        if (lower.includes('pay') || lower.includes('mpesa') || lower.includes('payment')) {
            return {
                message: "To pay your water bill, click the **Pay Now** button on your dashboard. You'll receive an M-Pesa STK Push on your registered phone number. Enter your M-Pesa PIN to complete the payment.",
            };
        }
        if (lower.includes('meter') || lower.includes('reading')) {
            return {
                message: `Your house number is **${houseNumber}**. To check your meter readings and consumption history, visit the Billing section of your dashboard.`,
            };
        }
        if (lower.includes('house') || lower.includes('address')) {
            return {
                message: `Your house number is **${houseNumber}**.`,
            };
        }
        return {
            message: "I'm here to help with your water billing questions. You can ask me about your current bill, payment history, meter readings, or how to make payments. For complex issues, please create a support ticket.",
        };
    }
}
exports.AIService = AIService;
exports.aiService = new AIService();
//# sourceMappingURL=ai.service.js.map