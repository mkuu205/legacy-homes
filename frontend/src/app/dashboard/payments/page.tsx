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
} from 'lucide-react';

export default function PaymentsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const billIdParam = params.get('billId');
  const paymentIdParam = params.get('paymentId');
  const statusParam = params.get('status');

  const [selectedBillId, setSelectedBillId] = useState(billIdParam || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'MPESA_STK_PUSH' | 'CARD_PAYMENT'>('MPESA_STK_PUSH');
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(paymentIdParam || null);
  const [paymentStartedAt, setPaymentStartedAt] = useState<number | null>(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  // Fetch unpaid bills
  const { data: billsData, isLoading: billsLoading } = useQuery({
    queryKey: ['unpaid-bills'],
    queryFn: async () => {
      const res = await api.get('/billing/my-bills?status=UNPAID,PARTIAL,OVERDUE');
      return res.data.data || [];
    },
  });

  // Fetch payment history
  const { data: paymentHistoryData, isLoading: historyLoading } = useQuery({
    queryKey: ['my-payments'],
    queryFn: async () => {
      const res = await api.get('/payments/my-payments');
      return res.data.data || [];
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

  // Initiate payment
  const initiatePaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBillId || !amount) {
        throw new Error('Please select a bill and enter amount');
      }

      const res = await api.post('/payments/initiate', {
        billId: selectedBillId,
        provider: 'TUMA',
        paymentMethod,
        phoneNumber: phone,
        amount: parseFloat(amount),
      });

      return res.data.data;
    },
    onSuccess: (data) => {
      setPendingPaymentId(data.paymentId);
      setPaymentStartedAt(Date.now());
      toast({ type: 'success', title: 'Payment initiated', description: 'Please check your phone for the M-Pesa prompt' });
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

  // Handle payment status updates
  useEffect(() => {
    if (statusData?.status === 'SUCCESSFUL') {
      toast({ type: 'success', title: 'Payment Successful!', description: 'Your payment has been confirmed.' });
      queryClient.invalidateQueries({ queryKey: ['unpaid-bills'] });
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
      setTimeout(() => {
        setPendingPaymentId(null);
        setAmount('');
        setSelectedBillId('');
      }, 2000);
    } else if (statusData?.status === 'FAILED') {
      toast({ type: 'error', title: 'Payment Failed', description: statusData.failureReason || 'Please try again' });
      setPendingPaymentId(null);
    }
  }, [statusData?.status]);

  if (pendingPaymentId && statusData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Payment Status */}
        <div style={{ padding: '32px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)', textAlign: 'center' }}>
          {statusData.status === 'PENDING' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <Loader2 size={48} style={{ margin: '0 auto', animation: 'spin 1s linear infinite', color: '#00C9A7' }} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--t1)', marginBottom: '8px' }}>Payment Processing</h2>
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
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>{statusData.receiptNumber}</p>
              </div>
              <button
                onClick={() => router.push('/dashboard/billing')}
                style={{ padding: '10px 24px', borderRadius: '8px', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
              >
                Return to Dashboard
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
                  setPaymentStartedAt(null);
                }}
                style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--t1)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
              >
                Try Again
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Bill Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>Select Bill</label>
            <select
              value={selectedBillId}
              onChange={(e) => {
                setSelectedBillId(e.target.value);
                setAmount('');
              }}
              disabled={billsLoading}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c1)', color: 'var(--t1)', fontSize: '13px', boxSizing: 'border-box' }}
            >
              <option value="">Choose a bill...</option>
              {billsData?.map((bill: any) => (
                <option key={bill.id} value={bill.id}>
                  {bill.billNumber} - KES {bill.balance} ({bill.status})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          {selectedBill && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>Amount (KES)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={maxAmount}
                  min="1"
                  step="100"
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c1)', color: 'var(--t1)', fontSize: '13px', boxSizing: 'border-box' }}
                />
                <button
                  onClick={() => setAmount(maxAmount.toString())}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'transparent', color: 'var(--t1)', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                >
                  Max
                </button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '6px' }}>Outstanding balance: KES {maxAmount}</p>
            </div>
          )}

          {/* Payment Method */}
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
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Smartphone size={16} />
                M-Pesa
              </button>
              <button
                onClick={() => setPaymentMethod('CARD_PAYMENT')}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: paymentMethod === 'CARD_PAYMENT' ? '2px solid #1434CB' : '1px solid var(--bd)',
                  background: paymentMethod === 'CARD_PAYMENT' ? 'rgba(20, 52, 203, 0.1)' : 'var(--c1)',
                  color: 'var(--t1)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <CreditCard size={16} />
                Card
              </button>
            </div>
          </div>

          {/* Phone Number (for M-Pesa) */}
          {paymentMethod === 'MPESA_STK_PUSH' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>Phone Number</label>
              <input
                type="tel"
                placeholder="0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c1)', color: 'var(--t1)', fontSize: '13px', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '6px' }}>You will receive an M-Pesa prompt on this number</p>
            </div>
          )}

          {/* Pay Button */}
          <button
            onClick={() => initiatePaymentMutation.mutate()}
            disabled={!isAmountValid || initiatePaymentMutation.isPending}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              background: isAmountValid ? '#00C9A7' : '#999',
              color: 'white',
              border: 'none',
              cursor: isAmountValid ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {initiatePaymentMutation.isPending ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Processing...
              </>
            ) : (
              `Pay KES ${amount || '0'}`
            )}
          </button>
        </div>
      </div>

      {/* Payment History */}
      {showPaymentHistory && (
        <div style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--t1)', marginBottom: '16px' }}>Payment History</h2>
          {historyLoading ? (
            <p style={{ fontSize: '13px', color: 'var(--t3)' }}>Loading...</p>
          ) : paymentHistoryData && paymentHistoryData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paymentHistoryData.map((payment: any) => (
                <div key={payment.id} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--t1)', margin: 0 }}>KES {payment.amount}</p>
                    <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '4px 0 0 0' }}>
                      {payment.status === 'SUCCESSFUL' ? '✓' : payment.status === 'FAILED' ? '✗' : '⏳'} {payment.status}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {payment.status === 'SUCCESSFUL' && payment.receiptNumber && (
                      <button
                        onClick={() => downloadReceiptMutation.mutate(payment.id)}
                        disabled={downloadReceiptMutation.isPending}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--bd)', background: 'transparent', color: 'var(--t1)', cursor: 'pointer', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Download size={14} />
                        Receipt
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--t3)' }}>No payments yet</p>
          )}
        </div>
      )}
    </div>
  );
}
