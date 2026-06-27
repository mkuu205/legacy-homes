'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/components/ui/toaster';
import {
  CreditCard,
  Smartphone,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  ArrowLeft,
  Eye,
  EyeOff,
  RefreshCw,
  Lock,
  ShieldCheck,
} from 'lucide-react';

export default function PaymentsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const billIdParam = params.get('billId');
  const paymentIdParam = params.get('paymentId');
  const statusParam = params.get('status');
  const orderTrackingId = params.get('OrderTrackingId'); // Pesapal redirect param

  const [selectedBillId, setSelectedBillId] = useState(billIdParam || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'MPESA_STK_PUSH' | 'CARD'>('MPESA_STK_PUSH');
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(paymentIdParam || null);
  const [paymentStartedAt, setPaymentStartedAt] = useState<number | null>(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [isVerifying, setIsVerifying] = useState(!!orderTrackingId);

  // 0. Handle Pesapal Redirect Back
  useEffect(() => {
    if (orderTrackingId) {
      handlePesapalReturn(orderTrackingId);
    }
  }, [orderTrackingId]);

  const handlePesapalReturn = async (trackingId: string) => {
    setIsVerifying(true);
    try {
      // Find the payment record with this order tracking ID
      const res = await api.get(`/payments/my-payments?providerOrderId=${trackingId}`);
      const payments = res.data.data?.payments || [];
      if (payments.length > 0) {
        const payment = payments[0];
        setPendingPaymentId(payment.id);
        
        // If not already successful, trigger a verification
        if (payment.status !== 'SUCCESSFUL') {
          try {
            await api.post(`/payments/verify/${payment.id}`);
            queryClient.invalidateQueries({ queryKey: ['payment-status', payment.id] });
          } catch (err) {
            console.error('Verification failed:', err);
          }
        }
      } else {
        toast({ type: 'error', title: 'Payment not found', description: 'We could not find a record for this transaction.' });
      }
    } catch (err) {
      console.error('Error handling Pesapal return:', err);
    } finally {
      setIsVerifying(false);
      // Clean up URL
      router.replace('/dashboard/payments');
    }
  };

  // 1. Resident Phone Number - Automatically load saved phone number
  useEffect(() => {
    if (user?.phone && !phone) {
      setPhone(user.phone);
    }
  }, [user?.phone]);

  // Fetch unpaid bills
  const { data: billsData, isLoading: billsLoading } = useQuery({
    queryKey: ['unpaid-bills'],
    queryFn: async () => {
      const res = await api.get('/billing/my-bills?status=UNPAID,PARTIAL,OVERDUE');
      return res.data.data?.bills || [];
    },
  });

  // Fetch payment history
  const { data: paymentHistoryData, isLoading: historyLoading } = useQuery({
    queryKey: ['my-payments'],
    queryFn: async () => {
      const res = await api.get('/payments/my-payments');
      return res.data.data?.payments || [];
    },
  });

  // Fetch payment status
  const { data: statusData } = useQuery({
    queryKey: ['payment-status', pendingPaymentId],
    queryFn: async () => {
      if (!pendingPaymentId) return null;
      const res = await api.get(`/payments/status/${pendingPaymentId}`);
      return res.data.data;
    },
    enabled: !!pendingPaymentId,
    refetchInterval: (query) => {
      const data: any = query.state.data;
      if (data?.status === 'SUCCESSFUL' || data?.status === 'FAILED' || data?.status === 'CANCELLED') {
        return false;
      }
      return 3000;
    },
    retry: false,
  });

  // Phone number validation helper
  const validatePhone = (p: string) => {
    const cleaned = p.replace(/\s+/g, '').replace('+', '');
    if (cleaned.startsWith('0')) return cleaned.length === 10;
    if (cleaned.startsWith('254')) return cleaned.length === 12;
    if (cleaned.startsWith('7') || cleaned.startsWith('1')) return cleaned.length === 9;
    return false;
  };

  // Initiate payment
  const initiatePaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBillId || !amount) {
        throw new Error('Please select a bill and enter amount');
      }

      // Validate phone
      if (!validatePhone(phone)) {
        throw new Error('Invalid Safaricom phone number.');
      }

      // Validate email for Card
      if (paymentMethod === 'CARD' && !user?.email) {
        throw new Error('Resident email is required for card payments.');
      }

      const res = await api.post('/payments/initiate', {
        billId: selectedBillId,
        provider: paymentMethod === 'MPESA_STK_PUSH' ? 'TUMA' : 'PESAPAL',
        paymentMethod,
        phoneNumber: phone,
        amount: parseFloat(amount),
      });

      return res.data.data;
    },
    onSuccess: (data) => {
      if (paymentMethod === 'CARD' && data.redirectUrl) {
        // Redirect to Pesapal as per spec
        window.location.href = data.redirectUrl;
        return;
      }
      setPendingPaymentId(data.paymentId);
      setPaymentStartedAt(Date.now());
      toast({ type: 'success', title: 'Payment initiated', description: paymentMethod === 'MPESA_STK_PUSH' ? 'Please check your phone for the M-Pesa prompt' : 'Redirecting to payment page...' });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Payment failed', description: getErrorMessage(err) });
    },
  });

  // Download receipt
  const downloadReceiptMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await api.get(`/payments/${paymentId}/receipt`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    },
    onError: (err) => toast({ type: 'error', title: 'Failed to download receipt', description: getErrorMessage(err) }),
  });

  const selectedBill = billsData?.find((b: any) => b.id === selectedBillId);
  const maxAmount = selectedBill?.balance || 0;
  const isAmountValid = amount && parseFloat(amount) > 0 && parseFloat(amount) <= maxAmount;
  const isFormValid = selectedBillId && user?.email && validatePhone(phone) && isAmountValid;

  // Handle payment status updates
  useEffect(() => {
    if (statusData?.status === 'SUCCESSFUL') {
      toast({ type: 'success', title: 'Payment Successful!', description: 'Your payment has been confirmed.' });
      queryClient.invalidateQueries({ queryKey: ['unpaid-bills'] });
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
    } else if (statusData?.status === 'FAILED') {
      toast({ type: 'error', title: 'Payment Failed', description: statusData.failureReason || 'Please try again' });
    }
  }, [statusData?.status]);

  if (pendingPaymentId && statusData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Payment Status Page */}
        <div style={{ padding: '32px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)', textAlign: 'center' }}>
          {statusData.status === 'PENDING' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <Loader2 size={48} style={{ margin: '0 auto', animation: 'spin 1s linear infinite', color: '#00C9A7' }} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--t1)', marginBottom: '8px' }}>Waiting for payment confirmation...</h2>
              <p style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '20px' }}>Please check your phone for the M-Pesa prompt and enter your PIN to confirm the payment.</p>
              <p style={{ fontSize: '12px', color: 'var(--t3)' }}>Amount: KES {statusData.amount}</p>
            </>
          )}

          {statusData.status === 'SUCCESSFUL' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <CheckCircle size={48} style={{ margin: '0 auto', color: '#10b981' }} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#10b981', marginBottom: '8px' }}>Payment Successful!</h2>
              <p style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '20px' }}>Your payment has been confirmed and processed.</p>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '8px', marginBottom: '20px', textAlign: 'left' }}>
                <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '0 0 8px 0' }}>Receipt Number</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>{statusData.receiptNumber || statusData.confirmationCode}</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => router.push('/dashboard/billing')}
                  style={{ padding: '10px 24px', borderRadius: '8px', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
                >
                  Return to Dashboard
                </button>
                <button
                  onClick={() => downloadReceiptMutation.mutate(pendingPaymentId)}
                  disabled={downloadReceiptMutation.isPending}
                  style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'transparent', color: 'var(--t1)', cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Download size={16} />
                  Receipt
                </button>
              </div>
            </>
          )}

          {(statusData.status === 'FAILED' || statusData.status === 'CANCELLED') && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <AlertCircle size={48} style={{ margin: '0 auto', color: '#ef4444' }} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#ef4444', marginBottom: '8px' }}>Payment Failed</h2>
              <p style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '20px' }}>{statusData.failureReason || 'Your payment could not be processed.'}</p>
              <button
                onClick={() => {
                  setPendingPaymentId(null);
                  setPaymentStartedAt(null);
                }}
                style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--t1)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
              >
                <RefreshCw size={16} />
                Pay Again
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="pg-h" style={{ fontSize: '24px', marginBottom: '4px' }}>Make a Payment</h1>
          <p className="pg-sh">Pay your water bills securely</p>
        </div>
        <button
          onClick={() => setShowPaymentHistory(!showPaymentHistory)}
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'transparent', color: 'var(--t1)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
        >
          {showPaymentHistory ? 'Hide' : 'Show'} History
        </button>
      </div>

      {/* Payment Form */}
      <div style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Bill Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>Select Bill</label>
            <select
              value={selectedBillId}
              onChange={(e) => {
                setSelectedBillId(e.target.value);
                const bill = billsData?.find((b: any) => b.id === e.target.value);
                if (bill) setAmount(bill.balance.toString());
              }}
              disabled={billsLoading}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c1)', color: 'var(--t1)', fontSize: '14px', boxSizing: 'border-box' }}
            >
              <option value="">Choose a bill...</option>
              {billsData?.map((bill: any) => (
                <option key={bill.id} value={bill.id}>
                  {bill.billNumber} ({bill.billingMonth}) - Due: KES {bill.balance}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Toggle */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '8px' }}>Payment Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => setPaymentMethod('MPESA_STK_PUSH')}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: paymentMethod === 'MPESA_STK_PUSH' ? '2px solid #00C9A7' : '1px solid var(--bd)',
                  background: paymentMethod === 'MPESA_STK_PUSH' ? 'rgba(0, 201, 167, 0.1)' : 'var(--c1)',
                  color: 'var(--t1)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Smartphone size={18} />
                M-Pesa
              </button>
              <button
                onClick={() => setPaymentMethod('CARD')}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: paymentMethod === 'CARD' ? '2px solid #1434CB' : '1px solid var(--bd)',
                  background: paymentMethod === 'CARD' ? 'rgba(20, 52, 203, 0.1)' : 'var(--c1)',
                  color: 'var(--t1)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <CreditCard size={18} />
                Card
              </button>
            </div>
          </div>

          {/* Form Fields Based on Method */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', borderRadius: '12px', background: 'var(--c1)', border: '1px solid var(--bd)' }}>
            
            {paymentMethod === 'CARD' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1434CB', marginBottom: '4px' }}>
                  <ShieldCheck size={18} />
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Secure Card Payment</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--t3)', marginBottom: '4px' }}>Resident Name</label>
                    <input type="text" value={user?.fullName || ''} readOnly style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--bd)', background: 'var(--c2)', color: 'var(--t2)', fontSize: '13px', cursor: 'not-allowed' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--t3)', marginBottom: '4px' }}>Resident Email</label>
                    <input type="text" value={user?.email || ''} readOnly style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--bd)', background: 'var(--c2)', color: 'var(--t2)', fontSize: '13px', cursor: 'not-allowed' }} />
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--t3)', marginBottom: '4px' }}>Resident Phone Number</label>
              <input
                type="tel"
                placeholder="0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--bd)', background: 'var(--c2)', color: 'var(--t1)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--t3)', marginBottom: '4px' }}>Amount to Pay (KES)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={maxAmount}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--bd)', background: 'var(--c2)', color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}
              />
            </div>

            {selectedBill && (
              <div style={{ marginTop: '8px', padding: '12px', borderRadius: '8px', background: 'var(--c2)', border: '1px dashed var(--bd)' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '8px', borderBottom: '1px solid var(--bd)', paddingBottom: '4px' }}>Payment Summary</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--t3)' }}>Bill Number:</span>
                  <span style={{ color: 'var(--t1)', fontWeight: 500, textAlign: 'right' }}>{selectedBill.billNumber}</span>
                  <span style={{ color: 'var(--t3)' }}>Billing Period:</span>
                  <span style={{ color: 'var(--t1)', fontWeight: 500, textAlign: 'right' }}>{selectedBill.billingMonth}</span>
                  <span style={{ color: 'var(--t3)' }}>Amount Due:</span>
                  <span style={{ color: 'var(--t1)', fontWeight: 500, textAlign: 'right' }}>KES {selectedBill.balance}</span>
                  <span style={{ color: 'var(--t3)', fontWeight: 600 }}>Amount Being Paid:</span>
                  <span style={{ color: paymentMethod === 'CARD' ? '#1434CB' : '#00C9A7', fontWeight: 700, textAlign: 'right' }}>KES {amount || 0}</span>
                </div>
              </div>
            )}
          </div>

          {paymentMethod === 'CARD' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '8px' }}>Accepted cards: Visa & Mastercard</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" style={{ height: '16px', opacity: 0.7 }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" style={{ height: '20px', opacity: 0.7 }} />
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(20, 52, 203, 0.05)', border: '1px solid rgba(20, 52, 203, 0.1)' }}>
                <p style={{ fontSize: '11px', color: '#1434CB', margin: 0, lineHeight: 1.4 }}>
                  Your card details are entered securely on Pesapal. Legacy Homes never stores or processes your card information.
                </p>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={() => initiatePaymentMutation.mutate()}
            disabled={!isFormValid || initiatePaymentMutation.isPending}
            style={{
              padding: '16px',
              borderRadius: '10px',
              background: isFormValid ? (paymentMethod === 'CARD' ? '#1434CB' : '#00C9A7') : '#cbd5e1',
              color: 'white',
              border: 'none',
              cursor: isFormValid ? 'pointer' : 'not-allowed',
              fontSize: '15px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s ease',
            }}
          >
            {initiatePaymentMutation.isPending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                {paymentMethod === 'CARD' ? (
                  <>
                    <Lock size={18} />
                    Continue to Secure Payment
                  </>
                ) : (
                  'Initiate M-Pesa Payment'
                )}
              </>
            )}
          </button>
          
          {!user?.email && paymentMethod === 'CARD' && (
            <p style={{ fontSize: '11px', color: '#ef4444', textAlign: 'center', margin: 0 }}>
              Please update your email in your profile to use card payments.
            </p>
          )}
        </div>
      </div>

      {/* Payment History Table */}
      {showPaymentHistory && (
        <div style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--t1)', marginBottom: '16px' }}>Payment History</h2>
          {historyLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <Loader2 className="animate-spin" />
            </div>
          ) : paymentHistoryData?.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--t3)', fontSize: '14px' }}>No payment history found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bd)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 8px', color: 'var(--t3)', fontWeight: 500 }}>Date</th>
                    <th style={{ padding: '12px 8px', color: 'var(--t3)', fontWeight: 500 }}>Bill #</th>
                    <th style={{ padding: '12px 8px', color: 'var(--t3)', fontWeight: 500 }}>Method</th>
                    <th style={{ padding: '12px 8px', color: 'var(--t3)', fontWeight: 500 }}>Amount</th>
                    <th style={{ padding: '12px 8px', color: 'var(--t3)', fontWeight: 500 }}>Status</th>
                    <th style={{ padding: '12px 8px', color: 'var(--t3)', fontWeight: 500 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistoryData.map((payment: any) => (
                    <tr key={payment.id} style={{ borderBottom: '1px solid var(--bd)' }}>
                      <td style={{ padding: '12px 8px', color: 'var(--t1)' }}>{new Date(payment.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--t1)' }}>{payment.bill?.billNumber}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--t1)' }}>{payment.paymentMethod}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--t1)', fontWeight: 600 }}>KES {payment.amount}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '11px', 
                          fontWeight: 500,
                          background: payment.status === 'SUCCESSFUL' ? 'rgba(16, 185, 129, 0.1)' : (payment.status === 'FAILED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
                          color: payment.status === 'SUCCESSFUL' ? '#10b981' : (payment.status === 'FAILED' ? '#ef4444' : '#f59e0b')
                        }}>
                          {payment.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {payment.status === 'SUCCESSFUL' && (
                          <button
                            onClick={() => downloadReceiptMutation.mutate(payment.id)}
                            style={{ background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Download size={14} />
                            Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
