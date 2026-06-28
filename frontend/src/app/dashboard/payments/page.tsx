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
  Receipt,
  Calendar,
  Banknote,
  FileText,
  Download,
  Home,
  ChevronLeft,
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
  const [paymentTimestamp, setPaymentTimestamp] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);

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
        setPaymentTimestamp(new Date().toLocaleString('en-KE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }));
        
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

  // Set bill from URL param only
  useEffect(() => {
    if (billIdParam && billsData) {
      const bill = billsData.find((b: any) => b.id === billIdParam);
      if (bill) {
        setSelectedBillId(bill.id);
        setAmount(bill.balance?.toString() || '');
      }
    }
  }, [billIdParam, billsData]);

  // Auto-set amount when bill is selected by user
  useEffect(() => {
    if (selectedBillId && billsData) {
      const bill = billsData.find((b: any) => b.id === selectedBillId);
      if (bill) {
        setAmount(bill.balance?.toString() || '');
      }
    } else {
      setAmount('');
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

      if (parseFloat(amount) > (selectedBill.balance || 0)) {
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
  const isFormValid = selectedBillId && amount && parseFloat(amount) > 0 && 
    (paymentMethod === 'CARD' || (paymentMethod === 'MPESA_STK_PUSH' && phone && validatePhone(phone)));

  useEffect(() => {
    if (statusData?.status === 'SUCCESSFUL') {
      setPaymentTimestamp(new Date().toLocaleString('en-KE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }));
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

  // Download PDF function - calls backend API
  const downloadPDF = async () => {
    if (!pendingPaymentId && !statusData?.id) {
      toast({ 
        type: 'error', 
        title: 'No receipt available', 
        description: 'Payment receipt not found.' 
      });
      return;
    }

    setIsDownloading(true);

    try {
      const paymentId = pendingPaymentId || statusData?.id;
      
      toast({ 
        type: 'info', 
        title: 'Generating PDF...', 
        description: 'Please wait while we prepare your receipt.' 
      });

      // Call the backend API to download the PDF
      const response = await api.get(`/payments/receipt/${paymentId}/download`, {
        responseType: 'blob'
      });

      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payment_Receipt_${statusData?.confirmationCode || 'TXN'}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({ 
        type: 'success', 
        title: 'PDF Downloaded!', 
        description: 'Your receipt has been saved.' 
      });
    } catch (error: any) {
      console.error('PDF download error:', error);
      toast({ 
        type: 'error', 
        title: 'Download failed', 
        description: error?.response?.data?.error || 'Unable to generate PDF. Please try again.' 
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isVerifying) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '20px', padding: '20px' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            border: '3px solid var(--bd)',
            borderTopColor: 'var(--ac)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Shield size={24} style={{ color: 'var(--ac)' }} />
          </div>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)', textAlign: 'center', margin: 0 }}>
          Verifying Your Payment
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--t2)', textAlign: 'center', margin: 0, maxWidth: '320px' }}>
          Please wait while we confirm your transaction with the payment provider.
        </p>
      </div>
    );
  }

  if (pendingPaymentId && statusData) {
    return (
      <div style={{ 
        maxWidth: '520px', 
        margin: '0 auto', 
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {statusData.status === 'SUCCESSFUL' && (
          <>
            {/* Success Header */}
            <div style={{ 
              textAlign: 'center',
              padding: '32px 24px 24px',
            }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #10b98120, #10b98108)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                border: '2px solid #10b98140',
              }}>
                <CheckCircle size={40} style={{ color: '#10b981' }} />
              </div>
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: 700, 
                color: '#10b981',
                margin: '0 0 6px 0'
              }}>
                Payment Successful 🎉
              </h1>
              <p style={{ 
                fontSize: '14px', 
                color: 'var(--t2)', 
                margin: 0 
              }}>
                Your payment has been confirmed and processed successfully.
              </p>
            </div>

            {/* Payment Details Card */}
            <div style={{
              background: 'var(--c1)',
              borderRadius: '16px',
              border: '1px solid var(--bd)',
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px 20px',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Banknote size={14} style={{ color: 'var(--t3)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Amount
                    </span>
                  </div>
                  <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', margin: 0 }}>
                    KES {statusData.amount?.toLocaleString() || amount || '0'}
                  </p>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Receipt size={14} style={{ color: 'var(--t3)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Receipt
                    </span>
                  </div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--t1)', margin: 0, fontFamily: 'monospace' }}>
                    {statusData.confirmationCode || statusData.receiptNumber || 'N/A'}
                  </p>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    {paymentMethod === 'MPESA_STK_PUSH' ? (
                      <Smartphone size={14} style={{ color: 'var(--t3)' }} />
                    ) : (
                      <CreditCard size={14} style={{ color: 'var(--t3)' }} />
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Method
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>
                    {paymentMethod === 'MPESA_STK_PUSH' ? 'M-Pesa' : 'Card'}
                  </p>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Calendar size={14} style={{ color: 'var(--t3)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Date
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>
                    {paymentTimestamp || new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Bill Reference */}
            {selectedBill && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'var(--c2)',
                borderRadius: '8px',
                border: '1px solid var(--bd)',
              }}>
                <FileText size={16} style={{ color: 'var(--t3)' }} />
                <span style={{ fontSize: '13px', color: 'var(--t2)' }}>
                  Bill #{selectedBill.billNumber}
                </span>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  color: '#10b981',
                  marginLeft: 'auto',
                  background: '#10b98120',
                  padding: '2px 10px',
                  borderRadius: '12px',
                }}>
                  PAID
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={() => router.push('/dashboard/billing')}
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  borderRadius: '12px', 
                  background: 'var(--ac)', 
                  color: 'white', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontSize: '15px', 
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.01)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Home size={18} />
                Return to Billing
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => router.push('/dashboard/payments/history')}
                  style={{ 
                    flex: 1,
                    padding: '12px', 
                    borderRadius: '10px', 
                    background: 'var(--c1)', 
                    color: 'var(--t1)', 
                    border: '1px solid var(--bd)', 
                    cursor: 'pointer', 
                    fontSize: '14px', 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--c2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--c1)';
                  }}
                >
                  <History size={16} />
                  History
                </button>
                <button
                  onClick={downloadPDF}
                  disabled={isDownloading}
                  style={{ 
                    flex: 1,
                    padding: '12px', 
                    borderRadius: '10px', 
                    background: isDownloading ? 'var(--bd)' : 'var(--c1)', 
                    color: isDownloading ? 'var(--t3)' : 'var(--t1)', 
                    border: '1px solid var(--bd)', 
                    cursor: isDownloading ? 'not-allowed' : 'pointer', 
                    fontSize: '14px', 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isDownloading) {
                      e.currentTarget.style.background = 'var(--c2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDownloading) {
                      e.currentTarget.style.background = 'var(--c1)';
                    }
                  }}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Download PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {statusData.status === 'PENDING' && (
          <div style={{ 
            textAlign: 'center',
            padding: '40px 24px',
            background: 'var(--c1)',
            borderRadius: '16px',
            border: '1px solid var(--bd)',
          }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                border: '3px solid var(--bd)',
                borderTopColor: 'var(--ac)',
                animation: 'spin 1s linear infinite',
              }} />
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                {paymentMethod === 'MPESA_STK_PUSH' ? (
                  <Smartphone size={24} style={{ color: 'var(--ac)' }} />
                ) : (
                  <CreditCard size={24} style={{ color: 'var(--ac)' }} />
                )}
              </div>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)', margin: '0 0 6px 0' }}>
              {paymentMethod === 'MPESA_STK_PUSH' ? 'Processing Payment' : 'Redirecting to Secure Payment'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--t2)', margin: '0 0 20px 0', lineHeight: '1.6' }}>
              {paymentMethod === 'MPESA_STK_PUSH' 
                ? 'Please check your phone for the M-Pesa STK push prompt and enter your PIN to confirm.'
                : 'Your payment is being processed by Pesapal. Please wait...'}
            </p>
            <div style={{ 
              background: 'var(--c2)', 
              padding: '16px', 
              borderRadius: '12px', 
              display: 'inline-block', 
              width: '100%',
              maxWidth: '280px'
            }}>
              <p style={{ fontSize: '11px', color: 'var(--t3)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Payment Amount
              </p>
              <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--t1)', margin: 0 }}>
                KES {statusData.amount?.toLocaleString() || amount || '0'}
              </p>
            </div>
          </div>
        )}

        {statusData.status === 'FAILED' && (
          <div style={{ 
            textAlign: 'center',
            padding: '32px 24px',
            background: 'var(--c1)',
            borderRadius: '16px',
            border: '1px solid #ef444440',
          }}>
            <div style={{ 
              width: '72px', 
              height: '72px', 
              borderRadius: '50%', 
              background: '#ef444420',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertCircle size={36} style={{ color: '#ef4444' }} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444', margin: '0 0 6px 0' }}>
              Payment Failed
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--t2)', margin: '0 0 24px 0', lineHeight: '1.6', maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>
              {statusData.failureReason?.toLowerCase().includes('cancel') 
                ? 'You cancelled the payment before it could be completed.'
                : statusData.failureReason?.toLowerCase().includes('expired')
                ? 'The payment request has expired. Please try again.'
                : 'Your payment could not be processed. Please try again or contact support.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  setPendingPaymentId(null);
                  setAmount(selectedBill?.balance?.toString() || '');
                }}
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  borderRadius: '12px', 
                  background: 'var(--ac)', 
                  color: 'white', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontSize: '15px', 
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <RefreshCw size={18} />
                Try Again
              </button>
              <button
                onClick={() => router.push('/dashboard/billing')}
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  borderRadius: '12px', 
                  background: 'var(--c1)', 
                  color: 'var(--t1)', 
                  border: '1px solid var(--bd)', 
                  cursor: 'pointer', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <ChevronLeft size={18} />
                Back to Bills
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
      {/* Header with History button restored */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={() => router.back()} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bd)', color: 'var(--t1)', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Make Payment</h1>
        
        {/* RESTORED HISTORY BUTTON */}
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
                Bill #{bill.billNumber} - KES {(bill.balance || 0).toLocaleString()}
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
          placeholder={selectedBillId ? "Amount will auto-fill" : "Select a bill first"}
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
            Outstanding balance: KES {(selectedBill.balance || 0).toLocaleString()}
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
            onClick={() => setPaymentMethod('MPESA_STK_PUSH')}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: paymentMethod === 'MPESA_STK_PUSH' ? '2px solid var(--ac)' : '1px solid var(--bd)',
              background: paymentMethod === 'MPESA_STK_PUSH' ? 'rgba(0, 198, 167, 0.05)' : 'var(--c1)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
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
            onClick={() => setPaymentMethod('CARD')}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: paymentMethod === 'CARD' ? '2px solid var(--ac)' : '1px solid var(--bd)',
              background: paymentMethod === 'CARD' ? 'rgba(0, 198, 167, 0.05)' : 'var(--c1)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
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
      {paymentMethod === 'MPESA_STK_PUSH' && (
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
      {paymentMethod === 'CARD' && (
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
