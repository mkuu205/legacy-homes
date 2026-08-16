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

  const formatMoney = (value: any) => `KES ${Number(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const statusMeta = (status: string) => {
    if (status === 'SUCCESSFUL') return { label: 'Successful', color: '#34d399', background: 'rgba(16, 185, 129, 0.14)', icon: CheckCircle };
    if (status === 'PENDING') return { label: 'Pending', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.14)', icon: Loader2 };
    if (status === 'CANCELLED') return { label: 'Cancelled', color: '#a1a1aa', background: 'rgba(113, 113, 122, 0.18)', icon: AlertCircle };
    return { label: 'Failed', color: '#f87171', background: 'rgba(239, 68, 68, 0.14)', icon: AlertCircle };
  };

  if (isVerifying) {
    return (
      <div className="pg fu" style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '56px 24px', textAlign: 'center' }}>
          <Loader2 size={34} style={{ color: 'var(--ac)', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', color: 'var(--t1)', fontWeight: 800 }}>Verifying your payment</h2>
          <p style={{ color: 'var(--t2)', fontSize: '13px', marginTop: '7px' }}>Please wait while we confirm your transaction with the payment provider.</p>
        </div>
      </div>
    );
  }

  if (pendingPaymentId && statusData) {
    const status = statusMeta(statusData.status);
    const StatusIcon = status.icon;
    return (
      <div className="pg fu" style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '28px', textAlign: 'center', borderColor: `${status.color}55` }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: status.background, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <StatusIcon size={30} style={{ color: status.color, animation: statusData.status === 'PENDING' ? 'spin 1s linear infinite' : undefined }} />
          </div>
          <p style={{ fontSize: '11px', color: status.color, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{status.label}</p>
          <h1 style={{ fontSize: '26px', color: 'var(--t1)', fontWeight: 850, marginTop: '6px' }}>
            {statusData.status === 'SUCCESSFUL' ? 'Payment successful' : statusData.status === 'PENDING' ? 'Payment processing' : statusData.status === 'CANCELLED' ? 'Payment cancelled' : 'Payment failed'}
          </h1>
          <p style={{ color: 'var(--t2)', fontSize: '13px', lineHeight: 1.6, maxWidth: '460px', margin: '8px auto 0' }}>
            {statusData.status === 'PENDING' ? (paymentMethod === 'MPESA_STK_PUSH' ? 'We are waiting for confirmation from M-Pesa. Keep your phone nearby and complete the prompt.' : 'Your card payment is being processed securely by Pesapal.') : statusData.status === 'SUCCESSFUL' ? 'Your payment has been confirmed and applied to your account.' : statusData.failureReason || 'Your payment could not be completed. Please try again.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', textAlign: 'left', marginTop: '24px' }}>
            <div style={{ padding: '13px', background: 'var(--c2)', borderRadius: '12px' }}><p style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase' }}>Amount</p><p style={{ fontSize: '18px', color: 'var(--t1)', fontWeight: 800, marginTop: '4px' }}>{formatMoney(statusData.amount || amount)}</p></div>
            <div style={{ padding: '13px', background: 'var(--c2)', borderRadius: '12px' }}><p style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase' }}>Reference</p><p style={{ fontSize: '12px', color: 'var(--t1)', fontWeight: 700, wordBreak: 'break-word', marginTop: '6px' }}>{statusData.confirmationCode || statusData.paymentId || pendingPaymentId}</p></div>
          </div>
          {statusData.status === 'SUCCESSFUL' && <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}><button className="btn bg" style={{ flex: 1 }} onClick={() => router.push('/dashboard/payments/history')}><History size={15} /> Payment History</button><button className="btn bg" style={{ flex: 1 }} onClick={downloadPDF} disabled={isDownloading}>{isDownloading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={15} />} {isDownloading ? 'Generating...' : 'Download receipt'}</button></div>}
          {(statusData.status === 'FAILED' || statusData.status === 'CANCELLED') && <button className="btn bp" style={{ width: '100%', marginTop: '18px' }} onClick={() => { setPendingPaymentId(null); setAmount(selectedBill?.balance?.toString() || ''); }}><RefreshCw size={15} /> Try again</button>}
          <button className="btn bg" style={{ width: '100%', marginTop: '10px' }} onClick={() => router.push('/dashboard/billing')}><ChevronLeft size={15} /> Back to bills</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pg fu" style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <button className="btn-icon bg" onClick={() => router.back()} aria-label="Go back"><ArrowLeft size={18} /></button>
          <div><h1 className="pg-h">Payments</h1><p className="pg-sh">Manage your water bill payments securely and conveniently.</p></div>
        </div>
        <button className="btn bg" onClick={() => router.push('/dashboard/payments/history')}><History size={15} /> Payment History</button>
      </div>

      <div className="payments-layout" style={{ display: 'grid', gap: '16px', alignItems: 'start' }}>
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
            <div><p style={{ fontSize: '11px', color: 'var(--ac)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Make a payment</p><h2 style={{ fontSize: '22px', color: 'var(--t1)', fontWeight: 850, marginTop: '4px' }}>Settle your water bill</h2></div><div style={{ width: '42px', height: '42px', borderRadius: '13px', background: 'rgba(0, 198, 167, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Banknote size={21} style={{ color: 'var(--ac)' }} /></div>
          </div>

          <div style={{ padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(0, 198, 167, 0.15), var(--c2))', border: '1px solid rgba(0, 198, 167, 0.22)', marginBottom: '20px' }}><p style={{ fontSize: '11px', color: 'var(--t2)', fontWeight: 700 }}>Outstanding balance</p><p style={{ fontSize: '30px', color: 'var(--t1)', fontWeight: 900, letterSpacing: '-0.04em', marginTop: '4px' }}>{selectedBill ? formatMoney(selectedBill.balance) : 'Select a bill'}</p></div>

          <label style={{ display: 'block', fontSize: '12px', color: 'var(--t2)', fontWeight: 700, marginBottom: '7px' }}>Current bill</label>
          {billsLoading ? <div style={{ height: '44px', borderRadius: '10px', background: 'var(--c2)' }} /> : billsData && billsData.length > 0 ? <select className="inp" value={selectedBillId} onChange={(event) => setSelectedBillId(event.target.value)}><option value="">Select a bill to pay</option>{billsData.map((bill: any) => <option key={bill.id} value={bill.id}>Bill #{bill.billNumber} · {formatMoney(bill.balance)}</option>)}</select> : <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--c2)', color: 'var(--t2)', fontSize: '12px' }}>No unpaid bills found. <button className="btn bg" style={{ marginTop: '10px' }} onClick={() => router.push('/dashboard/billing')}>View billing</button></div>}

          {selectedBill && <div className="payment-details-grid" style={{ display: 'grid', gap: '10px', marginTop: '12px', padding: '13px', borderRadius: '11px', background: 'var(--c2)' }}>
            <div><p style={{ fontSize: '10px', color: 'var(--t3)' }}>Bill number</p><p style={{ fontSize: '12px', color: 'var(--t1)', fontWeight: 700, marginTop: '3px' }}>{selectedBill.billNumber || '—'}</p></div>
            <div><p style={{ fontSize: '10px', color: 'var(--t3)' }}>Due date</p><p style={{ fontSize: '12px', color: 'var(--t1)', fontWeight: 700, marginTop: '3px' }}>{selectedBill.dueDate ? new Date(selectedBill.dueDate).toLocaleDateString('en-KE') : '—'}</p></div>
            <div><p style={{ fontSize: '10px', color: 'var(--t3)' }}>Bill amount</p><p style={{ fontSize: '12px', color: 'var(--t1)', fontWeight: 700, marginTop: '3px' }}>{formatMoney(selectedBill.amount)}</p></div>
            <div><p style={{ fontSize: '10px', color: 'var(--t3)' }}>Amount paid</p><p style={{ fontSize: '12px', color: 'var(--t1)', fontWeight: 700, marginTop: '3px' }}>{formatMoney(selectedBill.amountPaid)}</p></div>
          </div>}

          <label style={{ display: 'block', fontSize: '12px', color: 'var(--t2)', fontWeight: 700, margin: '20px 0 7px' }}>Amount to pay</label>
          <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', fontSize: '12px', fontWeight: 700 }}>KES</span><input className="inp" style={{ paddingLeft: '48px', fontSize: '18px', fontWeight: 800 }} type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" inputMode="decimal" /></div>
          {selectedBill && <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginTop: '10px' }}><button type="button" className="btn bg" style={{ padding: '7px 10px', fontSize: '11px' }} onClick={() => setAmount(String(selectedBill.balance || 0))}>Pay full balance</button>{[500, 1000].filter((value) => value <= Number(selectedBill.balance || 0)).map((value) => <button key={value} type="button" className="btn bg" style={{ padding: '7px 10px', fontSize: '11px' }} onClick={() => setAmount(String(value))}>{formatMoney(value)}</button>)}</div>}

          <label style={{ display: 'block', fontSize: '12px', color: 'var(--t2)', fontWeight: 700, margin: '20px 0 9px' }}>Payment method</label>
          <div className="payment-method-grid" style={{ display: 'grid', gap: '9px' }}>
            {([['MPESA_STK_PUSH', 'M-Pesa', Smartphone, 'Tuma'], ['CARD', 'Card', CreditCard, 'Pesapal']] as const).map(([value, label, Icon, provider]) => <button key={value} type="button" onClick={() => setPaymentMethod(value)} style={{ textAlign: 'left', padding: '12px', borderRadius: '11px', border: paymentMethod === value ? '2px solid var(--ac)' : '1px solid var(--bd)', background: paymentMethod === value ? 'rgba(0, 198, 167, 0.08)' : 'var(--c2)', color: 'var(--t1)', cursor: 'pointer' }}><Icon size={17} style={{ color: paymentMethod === value ? 'var(--ac)' : 'var(--t2)' }} /><p style={{ fontSize: '12px', fontWeight: 800, marginTop: '8px' }}>{label}</p><p style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '2px' }}>{provider}</p></button>)}
          </div>

          {paymentMethod === 'MPESA_STK_PUSH' && <div style={{ marginTop: '16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}><label style={{ fontSize: '12px', color: 'var(--t2)', fontWeight: 700 }}>M-Pesa phone number</label><button type="button" onClick={() => setShowPhoneInput(true)} style={{ background: 'none', border: 0, color: 'var(--ac)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>{showPhoneInput ? '' : 'Change'}</button></div>{showPhoneInput ? <input className="inp" value={phone} onChange={(event) => { setPhone(event.target.value); setPhoneError(''); }} placeholder="e.g. 0712345678" autoFocus /> : <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--c2)', color: 'var(--t1)', fontSize: '13px' }}>{phone || 'No phone number set'}</div>}{phoneError && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '5px' }}>{phoneError}</p>}</div>}
          {paymentMethod === 'CARD' && <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '16px', padding: '12px', borderRadius: '10px', background: 'rgba(0, 198, 167, 0.06)' }}><Shield size={17} style={{ color: 'var(--ac)' }} /><div><p style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 800 }}>Secure card payment</p><p style={{ color: 'var(--t2)', fontSize: '11px', marginTop: '2px' }}>Processed through the existing Pesapal flow.</p></div></div>}

          <button type="button" className="btn bp" style={{ width: '100%', minHeight: '48px', marginTop: '20px', fontSize: '14px' }} onClick={() => { if (!selectedBillId) { toast({ type: 'error', title: 'Please select a bill', description: 'Choose a bill to pay from the list.' }); return; } if (!amount || parseFloat(amount) <= 0) { toast({ type: 'error', title: 'Invalid amount', description: 'Please enter a valid amount to pay.' }); return; } if (paymentMethod === 'MPESA_STK_PUSH' && !validatePhone(phone)) { setPhoneError('Please enter a valid Safaricom number (e.g., 0712345678)'); return; } initiatePaymentMutation.mutate(); }} disabled={!!initiatePaymentMutation.isPending || !isFormValid}>{initiatePaymentMutation.isPending ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> {paymentMethod === 'CARD' ? 'Redirecting to Pesapal...' : 'Processing payment...'}</> : <><Lock size={16} /> {paymentMethod === 'CARD' ? 'Pay with card' : 'Pay with M-Pesa'}</>}</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ padding: '20px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Shield size={18} style={{ color: 'var(--ac)' }} /><div><p style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 800 }}>Secure M-Pesa payment</p><p style={{ color: 'var(--t2)', fontSize: '11px', lineHeight: 1.5, marginTop: '3px' }}>Your payment is processed securely through the existing Legacy Homes payment provider.</p></div></div></div>
        </div>
      </div>
      <style jsx>{`
        .payments-layout {
          grid-template-columns: minmax(0, 1fr);
        }
        .payment-details-grid,
        .payment-method-grid {
          grid-template-columns: minmax(0, 1fr);
        }
        @media (min-width: 560px) {
          .payment-details-grid,
          .payment-method-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 900px) {
          .payments-layout {
            grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
          }
        }
      `}</style>
    </div>
  );
}
