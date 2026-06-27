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
  RefreshCw,
  Lock,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export default function PaymentsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const billIdParam = params.get('billId');
  const paymentIdParam = params.get('paymentId');
  const orderTrackingId = params.get('OrderTrackingId'); // Pesapal redirect param

  const [selectedBillId, setSelectedBillId] = useState(billIdParam || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'MPESA_STK_PUSH' | 'CARD' | 'SAVED_CARD'>('MPESA_STK_PUSH');
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(paymentIdParam || null);
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

  // Fetch unpaid bills
  const { data: billsData, isLoading: billsLoading } = useQuery({
    queryKey: ['unpaid-bills'],
    queryFn: async () => {
      const res = await api.get('/billing/my-bills?status=UNPAID,PARTIAL,OVERDUE');
      return res.data.data?.bills || [];
    },
  });

  // Fetch saved payment methods
  const { data: savedMethods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await api.get('/payment-methods');
      return res.data.data || [];
    },
  });

  const savedCard = savedMethods.find((m: any) => m.methodType === 'SAVED_CARD' && m.isActive);

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

  // Initiate payment
  const initiatePaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBillId || !amount) {
        throw new Error('Please select a bill and enter amount');
      }

      const res = await api.post('/payments/initiate', {
        billId: selectedBillId,
        provider: paymentMethod === 'MPESA_STK_PUSH' ? 'TUMA' : 'PESAPAL',
        paymentMethod: paymentMethod === 'SAVED_CARD' ? 'SAVED_CARD' : paymentMethod,
        phoneNumber: phone,
        amount: parseFloat(amount),
      });

      return res.data.data;
    },
    onSuccess: (data) => {
      if ((paymentMethod === 'CARD' || paymentMethod === 'SAVED_CARD') && data.redirectUrl) {
        toast({ type: 'success', title: 'Redirecting to secure payment page...' });
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 800);
        return;
      }
      setPendingPaymentId(data.paymentId);
      toast({ type: 'success', title: 'Payment initiated', description: paymentMethod === 'MPESA_STK_PUSH' ? 'Please check your phone for the M-Pesa prompt' : 'Processing...' });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Payment failed', description: getErrorMessage(err) });
    },
  });

  const selectedBill = billsData?.find((b: any) => b.id === selectedBillId);
  const maxAmount = selectedBill?.balance || 0;
  const isAmountValid = amount && parseFloat(amount) > 0 && parseFloat(amount) <= maxAmount;
  const isFormValid = selectedBillId && isAmountValid;

  useEffect(() => {
    if (statusData?.status === 'SUCCESSFUL') {
      toast({ type: 'success', title: 'Payment Successful!', description: 'Your payment has been confirmed.' });
      queryClient.invalidateQueries({ queryKey: ['unpaid-bills'] });
    } else if (statusData?.status === 'FAILED') {
      toast({ type: 'error', title: 'Payment Failed', description: statusData.failureReason || 'Please try again' });
    }
  }, [statusData?.status]);

  if (isVerifying) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
        <Loader2 size={48} className="animate-spin" style={{ color: 'var(--ac)' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--t1)' }}>Verifying your payment...</h2>
        <p style={{ fontSize: '14px', color: 'var(--t2)' }}>Please wait while we confirm your transaction with Pesapal.</p>
      </div>
    );
  }

  if (pendingPaymentId && statusData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ padding: '32px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)', textAlign: 'center' }}>
          {statusData.status === 'PENDING' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <Loader2 size={48} style={{ margin: '0 auto', animation: 'spin 1s linear infinite', color: 'var(--ac)' }} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--t1)', marginBottom: '8px' }}>Waiting for confirmation...</h2>
              <p style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '20px' }}>
                {paymentMethod === 'MPESA_STK_PUSH' 
                  ? 'Please check your phone for the M-Pesa prompt and enter your PIN.' 
                  : 'We are verifying your card payment with Pesapal.'}
              </p>
              <div style={{ background: 'var(--c1)', padding: '12px', borderRadius: '8px', display: 'inline-block' }}>
                <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '0 0 4px 0' }}>Amount</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', margin: 0 }}>KES {statusData.amount}</p>
              </div>
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
                <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '0 0 8px 0' }}>Confirmation Code</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>{statusData.confirmationCode || statusData.receiptNumber}</p>
              </div>
              <button
                onClick={() => router.push('/dashboard/billing')}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
              >
                Return to Billing
              </button>
            </>
          )}

          {statusData.status === 'FAILED' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <AlertCircle size={48} style={{ margin: '0 auto', color: '#ef4444' }} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#ef4444', marginBottom: '8px' }}>Payment Failed</h2>
              <p style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '20px' }}>{statusData.failureReason || 'Your payment could not be processed.'}</p>
              <button
                onClick={() => {
                  setPendingPaymentId(null);
                }}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--t1)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={() => router.back()} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bd)', color: 'var(--t1)', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="pg-h" style={{ fontSize: '24px', marginBottom: '4px' }}>Secure Payment</h1>
          <p className="pg-sh">Complete your bill payment</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
        {/* Left: Payment Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--t1)', marginBottom: '16px' }}>1. Select Bill</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {billsLoading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>
              ) : billsData?.length === 0 ? (
                <p style={{ fontSize: '14px', color: 'var(--t3)' }}>No unpaid bills found.</p>
              ) : (
                billsData?.map((bill: any) => (
                  <div 
                    key={bill.id}
                    onClick={() => {
                      setSelectedBillId(bill.id);
                      setAmount(bill.balance.toString());
                    }}
                    style={{ 
                      padding: '16px', 
                      borderRadius: '10px', 
                      border: selectedBillId === bill.id ? '2px solid var(--ac)' : '1px solid var(--bd)',
                      background: selectedBillId === bill.id ? 'rgba(0, 198, 167, 0.05)' : 'var(--c1)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>Bill #{bill.billNumber}</p>
                      <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '4px 0 0 0' }}>Due: {new Date(bill.dueDate).toLocaleDateString()}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)', margin: 0 }}>KES {bill.balance.toLocaleString()}</p>
                      {selectedBillId === bill.id && <span style={{ fontSize: '10px', color: 'var(--ac)', fontWeight: 700 }}>SELECTED</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--t1)', marginBottom: '16px' }}>2. Payment Method</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={() => setPaymentMethod('MPESA_STK_PUSH')}
                style={{ 
                  padding: '16px', 
                  borderRadius: '10px', 
                  border: paymentMethod === 'MPESA_STK_PUSH' ? '2px solid var(--ac)' : '1px solid var(--bd)',
                  background: paymentMethod === 'MPESA_STK_PUSH' ? 'rgba(0, 198, 167, 0.05)' : 'var(--c1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <Smartphone size={24} color={paymentMethod === 'MPESA_STK_PUSH' ? 'var(--ac)' : 'var(--t2)'} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>M-Pesa STK</span>
              </button>
              <button
                onClick={() => setPaymentMethod('CARD')}
                style={{ 
                  padding: '16px', 
                  borderRadius: '10px', 
                  border: paymentMethod === 'CARD' ? '2px solid var(--ac)' : '1px solid var(--bd)',
                  background: paymentMethod === 'CARD' ? 'rgba(0, 198, 167, 0.05)' : 'var(--c1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <CreditCard size={24} color={paymentMethod === 'CARD' ? 'var(--ac)' : 'var(--t2)'} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>Card Payment</span>
              </button>
            </div>

            {paymentMethod === 'MPESA_STK_PUSH' && (
              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>M-Pesa Phone Number</label>
                <input 
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0712345678"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c1)', color: 'var(--t1)' }}
                />
              </div>
            )}

            {paymentMethod === 'CARD' && (
              <div style={{ marginTop: '20px', padding: '16px', borderRadius: '8px', background: 'rgba(0, 198, 167, 0.05)', border: '1px solid rgba(0, 198, 167, 0.2)', display: 'flex', gap: '12px' }}>
                <ShieldCheck size={20} style={{ color: 'var(--ac)', flexShrink: 0 }} />
                <p style={{ fontSize: '12px', color: 'var(--t2)', margin: 0, lineHeight: '1.5' }}>
                  Your payment is securely processed by Pesapal. Legacy Homes never stores or processes your card details.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary & Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)', position: 'sticky', top: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--t1)', marginBottom: '20px' }}>Payment Summary</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--t3)' }}>Resident</span>
                <span style={{ color: 'var(--t1)', fontWeight: 500 }}>{user?.fullName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--t3)' }}>Bill Number</span>
                <span style={{ color: 'var(--t1)', fontWeight: 500 }}>{selectedBill?.billNumber || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--t3)' }}>Method</span>
                <span style={{ color: 'var(--t1)', fontWeight: 500 }}>{paymentMethod === 'MPESA_STK_PUSH' ? 'M-Pesa' : 'Card'}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--bd)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)' }}>Total Amount</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ac)' }}>KES {amount ? parseFloat(amount).toLocaleString() : '0'}</span>
              </div>
            </div>

            <button
              onClick={() => initiatePaymentMutation.mutate()}
              disabled={!isFormValid || initiatePaymentMutation.isPending}
              style={{ 
                width: '100%', 
                padding: '14px', 
                borderRadius: '10px', 
                background: 'var(--ac)', 
                color: 'white', 
                border: 'none', 
                fontSize: '15px', 
                fontWeight: 700, 
                cursor: isFormValid ? 'pointer' : 'not-allowed',
                opacity: isFormValid ? 1 : 0.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {initiatePaymentMutation.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {paymentMethod === 'CARD' ? 'Continue to Secure Payment' : 'Pay Now'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: 0.6 }}>
              <Lock size={12} />
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
