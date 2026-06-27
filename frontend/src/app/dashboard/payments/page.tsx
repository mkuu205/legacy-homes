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
  ChevronRight,
  Shield,
  History,
} from 'lucide-react';

export default function PaymentsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const billIdParam = params.get('billId');
  const paymentIdParam = params.get('paymentId');
  const orderTrackingId = params.get('OrderTrackingId');

  const [selectedBillId, setSelectedBillId] = useState('');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'MPESA_STK_PUSH' | 'CARD'>('MPESA_STK_PUSH');
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(paymentIdParam || null);
  const [isVerifying, setIsVerifying] = useState(!!orderTrackingId);
  const [phoneError, setPhoneError] = useState('');

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

  // Fetch unpaid bills - expanded status filters
  const { data: billsData, isLoading: billsLoading, refetch: refetchBills } = useQuery({
    queryKey: ['unpaid-bills'],
    queryFn: async () => {
      try {
        // Try with expanded statuses
        const res = await api.get('/billing/my-bills?status=UNPAID,PARTIAL,OVERDUE,PAST_DUE');
        console.log('Bills response:', res.data);
        const bills = res.data.data?.bills || [];
        console.log('Bills found:', bills.length);
        return bills;
      } catch (error) {
        console.error('Error fetching bills:', error);
        return [];
      }
    },
  });

  // Set bill from URL param or auto-select first bill
  useEffect(() => {
    if (billsData && billsData.length > 0) {
      console.log('Setting bill from billsData:', billsData);
      if (billIdParam) {
        const bill = billsData.find((b: any) => b.id === billIdParam);
        if (bill) {
          setSelectedBillId(bill.id);
          setAmount(bill.balance?.toString() || bill.amountDue?.toString() || '');
        }
      } else if (!selectedBillId) {
        // Auto-select first bill if available
        const bill = billsData[0];
        setSelectedBillId(bill.id);
        setAmount(bill.balance?.toString() || bill.amountDue?.toString() || '');
      }
    }
  }, [billsData, billIdParam]);

  // Auto-set amount when bill is selected
  useEffect(() => {
    if (selectedBillId && billsData) {
      const bill = billsData.find((b: any) => b.id === selectedBillId);
      if (bill) {
        setAmount(bill.balance?.toString() || bill.amountDue?.toString() || '');
      }
    }
  }, [selectedBillId, billsData]);

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

  // Validate Kenyan phone number
  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    const regex = /^(?:\+254|0)?(7|1)\d{8}$/;
    return regex.test(cleaned);
  };

  // Initiate payment
  const initiatePaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBillId) {
        throw new Error('Please select a bill');
      }

      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Please enter a valid amount');
      }

      const selectedBill = billsData?.find((b: any) => b.id === selectedBillId);
      if (!selectedBill) {
        throw new Error('Selected bill not found');
      }

      const billBalance = selectedBill.balance || selectedBill.amountDue || 0;
      if (parseFloat(amount) > billBalance) {
        throw new Error('Amount cannot exceed the outstanding balance');
      }

      if (paymentMethod === 'MPESA_STK_PUSH') {
        if (!phone) throw new Error('Phone number is required');
        if (!validatePhone(phone)) {
          throw new Error('Please enter a valid Safaricom number (e.g., 0712345678)');
        }
      }

      const payload: any = {
        billId: selectedBillId,
        amount: parseFloat(amount),
        provider: paymentMethod === 'MPESA_STK_PUSH' ? 'TUMA' : 'PESAPAL',
        paymentMethod: paymentMethod,
      };

      if (paymentMethod === 'MPESA_STK_PUSH') {
        payload.phoneNumber = phone.replace(/\s/g, '');
      }

      const res = await api.post('/payments/initiate', payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      if (paymentMethod === 'CARD' && data.redirectUrl) {
        toast({ type: 'success', title: 'Redirecting to secure payment page...' });
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 500);
        return;
      }
      setPendingPaymentId(data.paymentId);
      toast({ type: 'success', title: 'Payment initiated', description: 'Please check your phone for the M-Pesa prompt' });
    },
    onError: (err) => {
      const message = getErrorMessage(err);
      let userFriendlyMessage = 'Unable to initiate payment. Please try again.';
      
      if (message.toLowerCase().includes('cancel')) {
        userFriendlyMessage = 'Payment was cancelled.';
      } else if (message.toLowerCase().includes('expired')) {
        userFriendlyMessage = 'STK request expired. Please try again.';
      } else if (message.toLowerCase().includes('network')) {
        userFriendlyMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast({ type: 'error', title: 'Payment failed', description: userFriendlyMessage });
    },
  });

  const selectedBill = billsData?.find((b: any) => b.id === selectedBillId);
  const billBalance = selectedBill?.balance || selectedBill?.amountDue || 0;
  const isFormValid = selectedBillId && amount && parseFloat(amount) > 0 && 
    (paymentMethod === 'CARD' || (paymentMethod === 'MPESA_STK_PUSH' && phone && validatePhone(phone)));

  useEffect(() => {
    if (statusData?.status === 'SUCCESSFUL') {
      toast({ type: 'success', title: 'Payment Successful!', description: 'Your payment has been confirmed.' });
      queryClient.invalidateQueries({ queryKey: ['unpaid-bills'] });
    } else if (statusData?.status === 'FAILED') {
      const failureReason = statusData.failureReason || 'Your payment could not be processed.';
      let userFriendlyMessage = 'Payment failed. Please try again.';
      
      if (failureReason.toLowerCase().includes('cancel')) {
        userFriendlyMessage = 'Payment was cancelled.';
      } else if (failureReason.toLowerCase().includes('expired')) {
        userFriendlyMessage = 'STK request expired. Please try again.';
      }
      
      toast({ type: 'error', title: 'Payment Failed', description: userFriendlyMessage });
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
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)', marginBottom: '8px' }}>
                {paymentMethod === 'MPESA_STK_PUSH' ? 'Processing Payment...' : 'Redirecting to secure payment...'}
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '24px', lineHeight: '1.5' }}>
                {paymentMethod === 'MPESA_STK_PUSH' 
                  ? 'Waiting for STK Push confirmation...' 
                  : 'Your payment is being processed by Pesapal.'}
              </p>
              <div style={{ background: 'var(--c1)', padding: '16px', borderRadius: '12px', display: 'inline-block', width: '100%' }}>
                <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Amount</p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', margin: 0 }}>KES {statusData.amount?.toLocaleString()}</p>
              </div>
            </>
          )}

          {statusData.status === 'SUCCESSFUL' && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <CheckCircle size={56} style={{ margin: '0 auto', color: '#10b981' }} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>Payment Successful</h2>
              <p style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '24px' }}>Your payment has been confirmed and processed.</p>
              <div style={{ background: 'var(--c1)', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--t3)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Amount</p>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', margin: 0 }}>KES {statusData.amount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--t3)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Receipt Number</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>{statusData.confirmationCode || statusData.receiptNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--t3)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Method</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>{paymentMethod === 'MPESA_STK_PUSH' ? 'M-Pesa' : 'Card'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--t3)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date & Time</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => router.push('/dashboard/billing')}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 700 }}
                >
                  Return to Billing
                </button>
                <button
                  onClick={() => router.push('/dashboard/payments/history')}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--c1)', color: 'var(--t1)', border: '1px solid var(--bd)', cursor: 'pointer', fontSize: '15px', fontWeight: 600 }}
                >
                  View Payment History
                </button>
              </div>
            </>
          )}

          {statusData.status === 'FAILED' && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <AlertCircle size={56} style={{ margin: '0 auto', color: '#ef4444' }} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>Payment Failed</h2>
              <p style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '24px', lineHeight: '1.5' }}>
                {statusData.failureReason?.toLowerCase().includes('cancel') 
                  ? 'Payment was cancelled.' 
                  : statusData.failureReason?.toLowerCase().includes('expired')
                  ? 'STK request expired. Please try again.'
                  : 'Your payment could not be processed. Please try again or contact support.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => setPendingPaymentId(null)}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--ac)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <RefreshCw size={18} />
                  Try Again
                </button>
                <button
                  onClick={() => router.push('/dashboard/billing')}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--c1)', color: 'var(--t1)', border: '1px solid var(--bd)', cursor: 'pointer', fontSize: '15px', fontWeight: 600 }}
                >
                  Back to Bills
                </button>
              </div>
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
        <button
          onClick={() => router.push('/dashboard/payments/history')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--t2)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--ac)';
            e.currentTarget.style.background = 'rgba(0, 198, 167, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--t2)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <History size={16} />
          History
        </button>
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
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">Select a bill...</option>
            {billsData.map((bill: any) => (
              <option key={bill.id} value={bill.id}>
                Bill #{bill.billNumber} - KES {(bill.balance || bill.amountDue || 0).toLocaleString()}
              </option>
            ))}
          </select>
        ) : (
          <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c1)', textAlign: 'center' }}>
            <p style={{ color: 'var(--t2)', margin: '0 0 12px 0' }}>No unpaid bills found</p>
            <button 
              onClick={() => router.push('/dashboard/billing')}
              style={{ padding: '8px 16px', borderRadius: '6px', background: 'var(--ac)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px' }}
            >
              View Billing
            </button>
          </div>
        )}
      </div>

      {/* Amount Input */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '8px' }}>
          Amount (KES) <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--bd)',
            background: 'var(--c1)',
            color: 'var(--t1)',
            fontSize: '14px',
            outline: 'none',
            fontFamily: 'inherit'
          }}
        />
        {selectedBill && (
          <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '4px 0 0 0' }}>
            Outstanding balance: KES {billBalance.toLocaleString()}
          </p>
        )}
      </div>

      {/* Payment Methods */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '10px' }}>
          Payment Method
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* M-Pesa Card */}
          <div
            onClick={() => selectedBillId && setPaymentMethod('MPESA_STK_PUSH')}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: paymentMethod === 'MPESA_STK_PUSH' ? '2px solid var(--ac)' : '1px solid var(--bd)',
              background: paymentMethod === 'MPESA_STK_PUSH' ? 'rgba(0, 198, 167, 0.05)' : 'var(--c1)',
              cursor: selectedBillId ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              opacity: selectedBillId ? 1 : 0.5
            }}
          >
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '6px', 
              background: paymentMethod === 'MPESA_STK_PUSH' ? 'var(--ac)' : 'var(--bd)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Smartphone size={16} color={paymentMethod === 'MPESA_STK_PUSH' ? 'white' : 'var(--t3)'} />
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)' }}>M-Pesa</span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--t3)', background: 'var(--bd)', padding: '2px 6px', borderRadius: '3px' }}>
                Tuma
              </span>
              {paymentMethod === 'MPESA_STK_PUSH' && (
                <ChevronRight size={14} style={{ color: 'var(--ac)', marginLeft: 'auto' }} />
              )}
            </div>
          </div>

          {/* Card Payment Card */}
          <div
            onClick={() => selectedBillId && setPaymentMethod('CARD')}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: paymentMethod === 'CARD' ? '2px solid var(--ac)' : '1px solid var(--bd)',
              background: paymentMethod === 'CARD' ? 'rgba(0, 198, 167, 0.05)' : 'var(--c1)',
              cursor: selectedBillId ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              opacity: selectedBillId ? 1 : 0.5
            }}
          >
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '6px', 
              background: paymentMethod === 'CARD' ? 'var(--ac)' : 'var(--bd)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CreditCard size={16} color={paymentMethod === 'CARD' ? 'white' : 'var(--t3)'} />
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)' }}>Card</span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--t3)', background: 'var(--bd)', padding: '2px 6px', borderRadius: '3px' }}>
                Pesapal
              </span>
              {paymentMethod === 'CARD' && (
                <ChevronRight size={14} style={{ color: 'var(--ac)', marginLeft: 'auto' }} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* M-Pesa Section */}
      {paymentMethod === 'MPESA_STK_PUSH' && selectedBillId && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '8px' }}>
            Phone Number <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ 
            padding: '12px', 
            borderRadius: '8px', 
            border: phoneError ? '2px solid #ef4444' : '1px solid var(--bd)', 
            background: 'var(--c1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {!showPhoneInput ? (
              <>
                <span style={{ fontSize: '14px', color: 'var(--t1)' }}>
                  {phone || 'Not set'}
                </span>
                <button 
                  onClick={() => setShowPhoneInput(true)}
                  style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ac)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Change
                </button>
              </>
            ) : (
              <>
                <input 
                  type="text"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPhoneError('');
                  }}
                  placeholder="e.g. 0712345678"
                  autoFocus
                  style={{ 
                    flex: 1,
                    padding: '4px 0', 
                    border: 'none', 
                    borderBottom: '2px solid var(--ac)', 
                    background: 'transparent', 
                    color: 'var(--t1)', 
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
                <button 
                  onClick={() => {
                    setShowPhoneInput(false);
                    setPhone(user?.phone || '');
                    setPhoneError('');
                  }}
                  style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '12px' }}
                >
                  Use default
                </button>
              </>
            )}
          </div>
          {phoneError && (
            <p style={{ fontSize: '12px', color: '#ef4444', margin: '4px 0 0 0' }}>
              {phoneError}
            </p>
          )}
        </div>
      )}

      {/* Card Section */}
      {paymentMethod === 'CARD' && selectedBillId && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '12px 14px', 
          borderRadius: '10px', 
          background: 'rgba(0, 198, 167, 0.05)', 
          border: '1px solid rgba(0, 198, 167, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Shield size={18} style={{ color: 'var(--ac)', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>
              Secure Card Payment
            </p>
            <p style={{ fontSize: '12px', color: 'var(--t2)', margin: '2px 0 0 0' }}>
              Visa • Mastercard • Secured by Pesapal
            </p>
          </div>
        </div>
      )}

      {/* Payment Button */}
      <button
        onClick={() => {
          if (!selectedBillId) {
            toast({ type: 'error', title: 'Please select a bill', description: 'Choose a bill to pay from the dropdown above.' });
            return;
          }
          if (!amount || parseFloat(amount) <= 0) {
            toast({ type: 'error', title: 'Invalid amount', description: 'Please enter a valid amount to pay.' });
            return;
          }
          if (paymentMethod === 'MPESA_STK_PUSH' && !validatePhone(phone)) {
            setPhoneError('Please enter a valid Safaricom number (e.g., 0712345678)');
            return;
          }
          initiatePaymentMutation.mutate();
        }}
        disabled={initiatePaymentMutation.isPending || !isFormValid}
        style={{ 
          width: '100%', 
          padding: '14px', 
          borderRadius: '10px', 
          background: isFormValid ? 'var(--ac)' : 'var(--bd)', 
          color: isFormValid ? 'white' : 'var(--t3)', 
          border: 'none', 
          fontSize: '15px', 
          fontWeight: 700, 
          cursor: isFormValid ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s'
        }}
      >
        {initiatePaymentMutation.isPending ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {paymentMethod === 'CARD' ? 'Redirecting to Pesapal...' : 'Processing Payment...'}
          </>
        ) : (
          paymentMethod === 'CARD' ? 'Pay with Card' : 'Pay with M-Pesa'
        )}
      </button>
    </div>
  );
}
