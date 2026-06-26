/**
 * PaymentProvider Interface
 * Defines the contract for all payment providers (Tuma, Pesapal)
 */

export interface PaymentInitiationRequest {
  amount: number;
  phoneNumber: string;
  billId: string;
  residentId: string;
  externalReference: string;
}

export interface PaymentInitiationResponse {
  success: boolean;
  transactionId?: string;
  orderId?: string;
  checkoutUrl?: string;
  message?: string;
  error?: string;
}

export interface PaymentStatusRequest {
  transactionId?: string;
  orderId?: string;
  reference?: string;
}

export interface PaymentStatusResponse {
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED';
  transactionId?: string;
  orderId?: string;
  amount?: number;
  message?: string;
  timestamp?: Date;
  providerData?: Record<string, any>;
}

export interface CallbackVerificationRequest {
  payload: Record<string, any>;
  signature?: string;
  headers?: Record<string, any>;
}

export interface CallbackVerificationResponse {
  valid: boolean;
  transactionId?: string;
  status?: string;
  amount?: number;
  message?: string;
}

export interface PaymentProvider {
  /**
   * Initialize a payment request
   */
  initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse>;

  /**
   * Verify payment status
   */
  verifyPaymentStatus(request: PaymentStatusRequest): Promise<PaymentStatusResponse>;

  /**
   * Verify callback payload authenticity
   */
  verifyCallback(request: CallbackVerificationRequest): Promise<CallbackVerificationResponse>;

  /**
   * Get provider name
   */
  getProviderName(): string;

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean;

  /**
   * Validate credentials
   */
  validateCredentials(): Promise<boolean>;
}
