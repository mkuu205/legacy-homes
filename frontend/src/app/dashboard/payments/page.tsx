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
} from 'lucide-react';

export default function PaymentsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const billIdParam = params.get('billId');
  const paymentIdParam = params.get('paymentId');
  const orderTrackingId = params.get('OrderTrackingId');

  const [selectedBillId, setSelectedBillId] = useState(billIdParam || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'MPESA_STK_PUSH' | 'CARD'>('MPESA_STK_PUSH');
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(paymentIdParam || null);
  const [isVerifying, setIsVerifying] = useState(!!orderTrackingId);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Handle Pesapal Redirect Back
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

  // Set initial bill if only one exists
  useEffect(() => {
    if (isInitialLoad && billsData && billsData.length > 0) {
      if (billsData.length === 1) {
        setSelectedBillId(billsData[0].id);
      } else if (billIdParam) {
        const bill = billsData.find((b: any) => b.id === billIdParam);
        if (bill) {
          setSelectedBillId(bill.id);
        }
      }
      setIsInitialLoad(false);
    }
  }, [billsData, billIdParam, isInitialLoad]);

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
      if (!selectedBillId) {
        throw new Error('Please select a bill');
      }

      const payload: any = {
        billId: selectedBillId,
        provider: paymentMethod === 'MPESA_STK_PUSH' ? 'TUMA' : 'PESAPAL',
        paymentMethod: paymentMethod,
      };

      if (paymentMethod === 'MPESA_STK_PUSH') {
        if (!phone) throw new Error('Phone number is required');
        payload.phoneNumber = phone;
      }

      const res = await api.post('/payments/initiate', payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      if (paymentMethod === 'CARD' && data.redirectUrl) {
        toast({ type: 'success', title: 'Redirecting to secure payment page...' });
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 800);
        return;
      }
      setPendingPaymentId(data.paymentId);
      toast({ type: 'success', title: 'Payment initiated', description: 'Please check your phone for the M-Pesa prompt' });
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Payment failed', description: getErrorMessage(err) });
    },
  });

  const selectedBill = billsData?.find((b: any) => b.id === selectedBillId);
  const isFormValid = selectedBillId && (paymentMethod === 'CARD' || (paymentMethod === 'MPESA_STK_PUSH' && phone));

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
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={() => router.back()} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bd)', color: 'var(--t1)', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Make Payment</h1>
      </div>

      {/* Select Bill */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '8px' }}>
          Select Bill
        </label>
        {billsLoading ? (
          <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c1)', color: 'var(--t2)' }}>
            Loading bills...
          </div>
        ) : billsData && billsData.length > 0 ? (
          <select 
            value={selectedBillId}
            onChange={(e) => setSelectedBillId(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              borderRadius: '8px', 
              border: '1px solid var(--bd)', 
              background: 'var(--c1)', 
              color: 'var(--t1)', 
              fontSize: '14px',
              outline: 'none'
            }}
          >
            <option value="">Select a bill...</option>
            {billsData.map((bill: any) => (
              <option key={bill.id} value={bill.id}>
                Bill #{bill.billNumber} - KES {bill.balance.toLocaleString()}
              </option>
            ))}
          </select>
        ) : (
          <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c1)', textAlign: 'center' }}>
            <p style={{ color: 'var(--t2)', margin: 0 }}>No unpaid bills found</p>
            <button 
              onClick={() => router.push('/dashboard/billing')}
              style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '6px', background: 'var(--ac)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px' }}
            >
              View Billing
            </button>
          </div>
        )}
      </div>

      {/* Bill Details */}
      {selectedBill && (
        <div style={{ 
          marginBottom: '24px', 
          padding: '16px', 
          borderRadius: '8px', 
          border: '1px solid var(--bd)', 
          background: 'var(--c1)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--t3)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bill Number</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>{selectedBill.billNumber}</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--t3)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Billing Month</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>{selectedBill.billingMonth}</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--t3)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount Due</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>KES {selectedBill.amountDue?.toLocaleString()}</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--t3)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due Date</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>{selectedBill.dueDate}</p>
            </div>
          </div>
          {selectedBill.balance && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--t2)' }}>Balance</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ac)' }}>KES {selectedBill.balance.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Method */}
      {selectedBill && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '8px' }}>
              Payment Method
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: paymentMethod === 'MPESA_STK_PUSH' ? '2px solid var(--ac)' : '1px solid var(--bd)',
                background: paymentMethod === 'MPESA_STK_PUSH' ? 'rgba(0, 198, 167, 0.05)' : 'var(--c1)',
                cursor: 'pointer',
                flex: 1
              }}>
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value="MPESA_STK_PUSH"
                  checked={paymentMethod === 'MPESA_STK_PUSH'}
                  onChange={() => setPaymentMethod('MPESA_STK_PUSH')}
                  style={{ margin: 0 }}
                />
                <Smartphone size={18} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>M-Pesa</span>
              </label>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: paymentMethod === 'CARD' ? '2px solid var(--ac)' : '1px solid var(--bd)',
                background: paymentMethod === 'CARD' ? 'rgba(0, 198, 167, 0.05)' : 'var(--c1)',
                cursor: 'pointer',
                flex: 1
              }}>
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value="CARD"
                  checked={paymentMethod === 'CARD'}
                  onChange={() => setPaymentMethod('CARD')}
                  style={{ margin: 0 }}
                />
                <CreditCard size={18} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>Card</span>
              </label>
            </div>
          </div>

          {/* Phone Number - M-Pesa only */}
          {paymentMethod === 'MPESA_STK_PUSH' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '8px' }}>
                Phone Number
              </label>
              <div style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid var(--bd)', 
                background: 'var(--c1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                {!showPhoneInput ? (
                  <>
                    <span style={{ fontSize: '15px', color: 'var(--t1)' }}>{phone || 'Not set'}</span>
                    <button 
                      onClick={() => setShowPhoneInput(true)}
                      style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ac)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Use another number
                    </button>
                  </>
                ) : (
                  <>
                    <input 
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0712345678"
                      autoFocus
                      style={{ 
                        flex: 1,
                        padding: '4px 0', 
                        border: 'none', 
                        borderBottom: '2px solid var(--ac)', 
                        background: 'transparent', 
                        color: 'var(--t1)', 
                        fontSize: '15px', 
                        outline: 'none' 
                      }}
                    />
                    <button 
                      onClick={() => setShowPhoneInput(false)}
                      style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '12px' }}
                    >
                      Use default
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Card info */}
          {paymentMethod === 'CARD' && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '12px', 
              borderRadius: '8px', 
              background: 'rgba(0, 198, 167, 0.05)', 
              border: '1px solid rgba(0, 198, 167, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Lock size={16} style={{ color: 'var(--ac)' }} />
              <p style={{ fontSize: '13px', color: 'var(--t2)', margin: 0 }}>
                Your card payment will be securely processed by Pesapal.
              </p>
            </div>
          )}

          {/* Payment Button */}
          <button
            onClick={() => initiatePaymentMutation.mutate()}
            disabled={!isFormValid || initiatePaymentMutation.isPending}
            style={{ 
              width: '100%', 
              padding: '14px', 
              borderRadius: '8px', 
              background: isFormValid ? 'var(--ac)' : 'var(--bd)', 
              color: isFormValid ? 'white' : 'var(--t3)', 
              border: 'none', 
              fontSize: '15px', 
              fontWeight: 600, 
              cursor: isFormValid ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {initiatePaymentMutation.isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              paymentMethod === 'CARD' ? 'Continue to Secure Payment' : 'Pay with M-Pesa'
            )}
          </button>
        </>
      )}
    </div>
  );
}
