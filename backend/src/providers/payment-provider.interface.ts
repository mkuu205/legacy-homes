// src/providers/payment-provider.interface.ts
export interface PaymentInitiationRequest {
  amount: number;
  phoneNumber: string;
  billId?: string;
  residentId?: string;
  externalReference?: string;
  description?: string;
  [key: string]: any; // Allow extra fields
}

export interface PaymentInitiationResponse {
  success: boolean;
  orderId?: string;
  checkoutUrl?: string | null;
  message?: string;
  error?: string;
  providerData?: any;
}

export interface PaymentStatusRequest {
  orderId?: string;
  transactionId?: string;
}

export interface PaymentStatusResponse {
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED' | 'REVERSED' | 'INVALID';
  message?: string;
  orderId?: string;
  transactionId?: string;
  amount?: number;
  timestamp?: Date;
  providerData?: any;
}

export interface CallbackVerificationRequest {
  payload: Record<string, any>;
  signature?: string;
  headers?: Record<string, any>;
}

export interface CallbackVerificationResponse {
  valid: boolean;
  transactionId?: string;
  status?: 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED' | 'REVERSED' | 'INVALID';
  amount?: number;
  message?: string;
  timestamp?: Date;
  providerData?: any;
}

export interface PaymentProvider {
  initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse>;
  verifyPaymentStatus(request: PaymentStatusRequest): Promise<PaymentStatusResponse>;
  verifyCallback(request: CallbackVerificationRequest): Promise<CallbackVerificationResponse>;
  getProviderName(): string;
  isConfigured(): boolean;
}
