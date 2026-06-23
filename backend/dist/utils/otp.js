"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOTPExpiry = exports.verifyOTP = exports.hashOTP = exports.generateOTP = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateOTP = generateOTP;
const hashOTP = async (otp) => {
    return bcryptjs_1.default.hash(otp, 10);
};
exports.hashOTP = hashOTP;
const verifyOTP = async (otp, hash) => {
    return bcryptjs_1.default.compare(otp, hash);
};
exports.verifyOTP = verifyOTP;
const getOTPExpiry = (minutes = 10) => {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + minutes);
    return expiry;
};
exports.getOTPExpiry = getOTPExpiry;
//# sourceMappingURL=otp.js.map