"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const ai_service_1 = require("../services/ai.service");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = (0, express_1.Router)();
const aiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many AI requests. Please wait a moment.' },
});
router.post('/chat', auth_1.authenticate, aiLimiter, async (req, res, next) => {
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            res.status(400).json({ success: false, message: 'Message is required' });
            return;
        }
        const result = await ai_service_1.aiService.chat(req.user.userId, message.trim());
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=ai.routes.js.map