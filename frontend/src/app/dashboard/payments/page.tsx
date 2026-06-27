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
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Lock,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
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
  const [showPhoneInput, setShowPhoneInput] = useState(false);
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
      const res = await api.get(`/payments/my-payments?providerOrderId=${trackingId}`);
      const payments = res.data.data?.payments || [];
      if (payments.length > 0) {
        const payment = payments[0];
        setPendingPaymentId(payment.id);
        
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

  // Set initial bill and amount if billIdParam is present
  useEffect(() => {
    if (billIdParam && billsData) {
      const bill = billsData.find((b: any) => b.id === billIdParam);
      if (bill) {
        setSelectedBillId(bill.id);
        setAmount(bill.balance.toString());
      }
    } else if (!selectedBillId && billsData && billsData.length > 0) {
      // Default to first bill if none selected
      setSelectedBillId(billsData[0].id);
      setAmount(billsData[0].balance.toString());
    }
  }, [billIdParam, billsData]);

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px', padding: '20px' }}>
        <Loader2 size={48} className="animate-spin" style={{ color: 'var(--ac)' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--t1)', textAlign: 'center' }}>Verifying your payment...</h2>
        <p style={{ fontSize: '14px', color: 'var(--t2)', textAlign: 'center' }}>Please wait while we confirm your transaction.</p>
      </div>
    );
  }

  if (pendingPaymentId && statusData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '500px', margin: '0 auto', padding: '16px' }}>
        <div style={{ padding: '32px 24px', borderRadius: '16px', border: '1px solid var(--bd)', background: 'var(--c2)', textAlign: 'center' }}>
          {statusData.status === 'PENDING' && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <Loader2 size={48} style={{ margin: '0 auto', animation: 'spin 1s linear infinite', color: 'var(--ac)' }} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)', marginBottom: '8px' }}>Waiting for confirmation...</h2>
              <p style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '24px', lineHeight: '1.5' }}>
                {paymentMethod === 'MPESA_STK_PUSH' 
                  ? 'Please check your phone for the M-Pesa prompt and enter your PIN.' 
                  : 'We are verifying your card payment with Pesapal.'}
              </p>
              <div style={{ background: 'var(--c1)', padding: '16px', borderRadius: '12px', display: 'inline-block', width: '100%' }}>
                <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount to Pay</p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', margin: 0 }}>KES {statusData.amount.toLocaleString()}</p>
              </div>
            </>
          )}

          {statusData.status === 'SUCCESSFUL' && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <CheckCircle size={56} style={{ margin: '0 auto', color: '#10b981' }} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>Payment Successful!</h2>
              <p style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '24px' }}>Your payment has been confirmed and processed.</p>
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'left' }}>
                <p style={{ fontSize: '11px', color: 'var(--t3)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmation Code</p>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)', margin: 0 }}>{statusData.confirmationCode || statusData.receiptNumber}</p>
              </div>
              <button
                onClick={() => router.push('/dashboard/billing')}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 700 }}
              >
                Return to Billing
              </button>
            </>
          )}

          {statusData.status === 'FAILED' && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <AlertCircle size={56} style={{ margin: '0 auto', color: '#ef4444' }} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>Payment Failed</h2>
              <p style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '24px', lineHeight: '1.5' }}>{statusData.failureReason || 'Your payment could not be processed.'}</p>
              <button
                onClick={() => {
                  setPendingPaymentId(null);
                }}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--t1)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <RefreshCw size={18} />
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '500px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Compact Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
        <button 
          onClick={() => router.back()} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bd)', color: 'var(--t1)', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Secure Payment</h1>
      </div>

      {/* Single Payment Card */}
      <div style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--bd)', background: 'var(--c2)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        
        {/* Compact Bill Summary at Top */}
        <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '12px', background: 'var(--c1)', border: '1px solid var(--bd)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--t3)', fontWeight: 500 }}>Payment for</span>
            <span style={{ fontSize: '13px', color: 'var(--t1)', fontWeight: 600 }}>Bill #{selectedBill?.billNumber || '...'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '14px', color: 'var(--t1)', fontWeight: 600 }}>Total Due</span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ac)' }}>KES {amount ? parseFloat(amount).toLocaleString() : '0'}</span>
          </div>
          {billsData && billsData.length > 1 && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--bd)' }}>
              <select 
                value={selectedBillId}
                onChange={(e) => {
                  const billId = e.target.value;
                  setSelectedBillId(billId);
                  const bill = billsData.find((b: any) => b.id === billId);
                  if (bill) setAmount(bill.balance.toString());
                }}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--bd)', background: 'transparent', color: 'var(--t1)', fontSize: '12px' }}
              >
                {billsData.map((bill: any) => (
                  <option key={bill.id} value={bill.id}>Bill #{bill.billNumber} - KES {bill.balance.toLocaleString()}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Payment Method Selector */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Method</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => setPaymentMethod('MPESA_STK_PUSH')}
              style={{ 
                padding: '14px 10px', 
                borderRadius: '12px', 
                border: paymentMethod === 'MPESA_STK_PUSH' ? '2px solid var(--ac)' : '1px solid var(--bd)',
                background: paymentMethod === 'MPESA_STK_PUSH' ? 'rgba(0, 198, 167, 0.05)' : 'var(--c1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Smartphone size={22} color={paymentMethod === 'MPESA_STK_PUSH' ? 'var(--ac)' : 'var(--t2)'} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>M-Pesa</span>
            </button>
            <button
              onClick={() => setPaymentMethod('CARD')}
              style={{ 
                padding: '14px 10px', 
                borderRadius: '12px', 
                border: paymentMethod === 'CARD' ? '2px solid var(--ac)' : '1px solid var(--bd)',
                background: paymentMethod === 'CARD' ? 'rgba(0, 198, 167, 0.05)' : 'var(--c1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <CreditCard size={22} color={paymentMethod === 'CARD' ? 'var(--ac)' : 'var(--t2)'} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>Card</span>
            </button>
          </div>
        </div>

        {/* Dynamic Content based on selection */}
        <div style={{ marginBottom: '24px' }}>
          {paymentMethod === 'MPESA_STK_PUSH' && (
            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--c1)', border: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '0 0 2px 0' }}>M-Pesa Number</p>
                  {!showPhoneInput ? (
                    <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>{phone || 'Not set'}</p>
                  ) : (
                    <input 
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0712345678"
                      autoFocus
                      style={{ width: '100%', padding: '8px 0', border: 'none', borderBottom: '2px solid var(--ac)', background: 'transparent', color: 'var(--t1)', fontSize: '15px', fontWeight: 600, outline: 'none' }}
                    />
                  )}
                </div>
                {!showPhoneInput && (
                  <button 
                    onClick={() => setShowPhoneInput(true)}
                    style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ac)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                  >
                    Change Number
                  </button>
                )}
              </div>
            </div>
          )}

          {paymentMethod === 'CARD' && (
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0, 198, 167, 0.05)', border: '1px solid rgba(0, 198, 167, 0.1)', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <ShieldCheck size={20} style={{ color: 'var(--ac)', flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: 'var(--t2)', margin: 0, lineHeight: '1.4' }}>
                Your payment will be securely processed by Pesapal.
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={() => initiatePaymentMutation.mutate()}
          disabled={!isFormValid || initiatePaymentMutation.isPending}
          style={{ 
            width: '100%', 
            padding: '16px', 
            borderRadius: '14px', 
            background: 'var(--ac)', 
            color: 'white', 
            border: 'none', 
            fontSize: '16px', 
            fontWeight: 700, 
            cursor: isFormValid ? 'pointer' : 'not-allowed',
            opacity: isFormValid ? 1 : 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0, 198, 167, 0.2)'
          }}
        >
          {initiatePaymentMutation.isPending ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              {paymentMethod === 'CARD' ? 'Continue to Secure Payment' : 'Pay Now'}
              <ChevronRight size={20} />
            </>
          )}
        </button>

        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: 0.5 }}>
          <Lock size={12} />
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Secure Transaction</span>
        </div>
      </div>
    </div>
  );
}
