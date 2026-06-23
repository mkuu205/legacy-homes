'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
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
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export default function PaymentsPage() {
  const params = useSearchParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const billIdParam = params.get('billId');

  const [selectedBillId, setSelectedBillId] = useState(billIdParam || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [amount, setAmount] = useState('');
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [paymentStartedAt, setPaymentStartedAt] = useState<number | null>(null);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);

  const { data: billsData } = useQuery({
    queryKey: ['unpaid-bills'],
    queryFn: async () => {
      const res = await api.get('/billing/my-bills?status=UNPAID,PARTIAL,OVERDUE');
      return res.data.data;
    },
  });

  const { data: myPaymentsData } = useQuery({
    queryKey: ['my-payments'],
    queryFn: async () => {
      const res = await api.get('/payments/my-payments');
      return res.data.data;
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => { await api.delete('/payments/my-history'); },
    onSuccess: () => {
      toast({ type: 'success', title: 'Payment history cleared' });
      setShowClearHistoryModal(false);
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
    },
    onError: (error) => toast({ type: 'error', title: 'Failed to clear history', description: getErrorMessage(error) }),
  });

  const { data: statusData, error: statusError } = useQuery({
    queryKey: ['payment-status', pendingPaymentId],
    queryFn: async () => {
      if (!pendingPaymentId) return null;
      try {
        const res = await api.get(`/payments/status/${pendingPaymentId}`);
        return res.data.data;
      } catch (err: any) {
        // If we get a 401, the interceptor will handle it, but we should stop polling if it's unrecoverable
        if (err.response?.status === 401) {
          throw err;
        }
        return null;
      }
    },
    enabled: !!pendingPaymentId,
    refetchInterval: (query) => {
      const data: any = query.state.data;
      // Stop polling if payment is successful or failed
      if (data?.status === 'SUCCESSFUL' || data?.status === 'FAILED') {
        return false;
      }
      // Stop polling on error
      if (query.state.error) {
        return false;
      }
      return 3000;
    },
    retry: false,
  });

  useEffect(() => {
    if (statusError) {
      setPendingPaymentId(null);
      setPaymentStartedAt(null);
      return;
    }

    const status = (statusData as any)?.status;
    const receipt = (statusData as any)?.mpesaReceiptCode;
    const failureReason = (statusData as any)?.failureReason;

    if (status === 'SUCCESSFUL' && pendingPaymentId) {
      toast({
        type: 'success',
        title: 'Payment Successful!',
        description: `Receipt: ${receipt || 'Confirmed'}`,
      });

      setPendingPaymentId(null);
      setPaymentStartedAt(null);

      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
      queryClient.invalidateQueries({ queryKey: ['my-bills'] });
      queryClient.invalidateQueries({ queryKey: ['resident-dashboard'] });
    }

    if (status === 'FAILED' && pendingPaymentId) {
      toast({
        type: 'error',
        title: 'Payment Failed',
        description: failureReason || 'Payment failed, cancelled, or insufficient funds.',
      });

      setPendingPaymentId(null);
      setPaymentStartedAt(null);
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
    }

    if (
      pendingPaymentId &&
      paymentStartedAt &&
      Date.now() - paymentStartedAt > 120000 // Increased to 2 minutes
    ) {
      toast({
        type: 'error',
        title: 'Polling Timeout',
        description:
          'We haven\'t received confirmation yet. If you completed the payment, it will reflect in your history shortly.',
      });

      setPendingPaymentId(null);
      setPaymentStartedAt(null);
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
    }
  }, [statusData, statusError, pendingPaymentId, paymentStartedAt, queryClient]);

  const initiateMutation = useMutation({
    mutationFn: async (data: {
      billId: string;
      residentId: string;
      phoneNumber: string;
      amount: number;
    }) => {
      const res = await api.post('/payments/initiate', data);
      return res.data.data;
    },

    onSuccess: (data) => {
      setPendingPaymentId(data.paymentId);
      setPaymentStartedAt(Date.now());

      toast({
        type: 'info',
        title: 'STK Push Sent!',
        description:
          'Check your phone and enter your M-Pesa PIN to complete payment.',
      });
    },

    onError: (error) => {
      toast({
        type: 'error',
        title: 'Payment initiation failed',
        description: getErrorMessage(error),
      });
    },
  });

  const selectedBill = billsData?.bills?.find(
    (b: any) => b.id === selectedBillId
  );

  const handlePay = () => {
    if (!selectedBillId || !phone || !amount) {
      toast({
        type: 'warning',
        title: 'Missing fields',
        description: 'Please fill all required fields.',
      });
      return;
    }

    if (!user?.id) {
      toast({
        type: 'error',
        title: 'Authentication Error',
        description: 'User session not found. Please login again.',
      });
      return;
    }

    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        type: 'warning',
        title: 'Invalid amount',
        description: 'Enter a valid payment amount.',
      });
      return;
    }

    initiateMutation.mutate({
      billId: selectedBillId,
      residentId: user.id,
      phoneNumber: phone,
      amount: amountNum,
    });
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      className="fu"
    >
      <div>
        <h1 className="pg-h">Payments</h1>
        <p className="pg-sh">Pay your water bill via M-Pesa</p>
      </div>

      <div className="g2">
        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              className="stat-ico"
              style={{
                background: 'var(--gl)',
                width: '40px',
                height: '40px',
              }}
            >
              <Smartphone size={20} style={{ color: 'var(--ac)' }} />
            </div>

            <div>
              <h2
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--t1)',
                }}
              >
                M-Pesa Payment
              </h2>

              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--t3)',
                  marginTop: '2px',
                }}
              >
                Instant STK Push to your phone
              </p>
            </div>
          </div>

          {pendingPaymentId ? (
            <div style={{ textAlign: 'center', padding: '32px 20px' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  background: 'rgba(245, 158, 11, 0.14)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}
              >
                <Smartphone size={40} style={{ color: '#fbbf24' }} />
              </div>

              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--t1)',
                  marginBottom: '8px',
                }}
              >
                Check Your Phone
              </h3>

              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--t2)',
                  marginBottom: '16px',
                }}
              >
                An M-Pesa STK Push has been sent to <strong>{phone}</strong>.
                Enter your PIN to complete payment.
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#fbbf24',
                  marginBottom: '16px',
                }}
              >
                <Loader2
                  size={16}
                  style={{ animation: 'spin 1s linear infinite' }}
                />
                Waiting for confirmation...
              </div>

              <button
                onClick={() => {
                  setPendingPaymentId(null);
                  setPaymentStartedAt(null);
                }}
                className="btn bg btn-sm"
                style={{ width: '100%' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="fg">
                <label className="lbl">Select Bill *</label>

                <select
                  value={selectedBillId}
                  onChange={(e) => {
                    setSelectedBillId(e.target.value);

                    const bill = billsData?.bills?.find(
                      (b: any) => b.id === e.target.value
                    );

                    if (bill) {
                      setAmount(bill.balance.toString());
                    }
                  }}
                  className="sel"
                >
                  <option value="">-- Select a bill --</option>

                  {billsData?.bills?.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.billNumber} — {b.billingMonth} (Balance: KES{' '}
                      {b.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {selectedBill && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '9px',
                    background: 'var(--c2)',
                    border: '1px solid var(--bd)',
                    fontSize: '12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <span>Total Bill:</span>
                    <span>KES {selectedBill.totalAmount.toLocaleString()}</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <span>Amount Paid:</span>
                    <span>KES {selectedBill.amountPaid.toLocaleString()}</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Balance Due:</span>
                    <span>KES {selectedBill.balance.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="fg">
                <label className="lbl">M-Pesa Phone Number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712345678"
                  className="inp"
                />
              </div>

              <div className="fg">
                <label className="lbl">Amount (KES) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  className="inp"
                />
              </div>

              <button
                onClick={handlePay}
                disabled={
                  initiateMutation.isPending ||
                  !selectedBillId ||
                  !phone ||
                  !amount
                }
                className="btn bp"
                style={{ width: '100%' }}
              >
                {initiateMutation.isPending ? (
                  <>
                    <Loader2
                      size={16}
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                    Sending STK Push...
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    Pay via M-Pesa
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', marginBottom: '4px' }}>
              Recent Payments
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--t2)' }}>
              Your payment transaction history
            </p>
          </div>
          {(myPaymentsData?.payments?.length > 0) && (
            <button
              onClick={() => setShowClearHistoryModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
            >
              <Trash2 size={12} /> Clear History
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '12px', fontWeight: 600, color: 'var(--t2)' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '12px', fontWeight: 600, color: 'var(--t2)' }}>Bill #</th>
                <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '12px', fontWeight: 600, color: 'var(--t2)' }}>Amount</th>
                <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '12px', fontWeight: 600, color: 'var(--t2)' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '12px', fontWeight: 600, color: 'var(--t2)' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {billsData?.bills && billsData.bills.length > 0 ? (
                billsData.bills.slice(0, 10).map((bill: any) => (
                  <tr key={bill.id} style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td style={{ padding: '12px 0', fontSize: '12px', color: 'var(--t1)' }}>
                      {new Date(bill.createdAt).toLocaleDateString('en-KE')}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: '12px', color: 'var(--t1)' }}>
                      {bill.billNumber}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: '12px', color: 'var(--t1)', textAlign: 'right' }}>
                      KES {bill.amountPaid.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: bill.status === 'PAID' ? 'rgba(16, 185, 129, 0.14)' : bill.status === 'PARTIAL' ? 'rgba(245, 158, 11, 0.14)' : 'rgba(124, 154, 184, 0.14)',
                        color: bill.status === 'PAID' ? '#10b981' : bill.status === 'PARTIAL' ? '#f59e0b' : '#7c9ab8',
                      }}>
                        {bill.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 0', fontSize: '12px', color: 'var(--ac)', cursor: 'pointer' }}>
                      {bill.mpesaReceiptCode ? (
                        <a href={`/dashboard/billing?billId=${bill.id}`} style={{ textDecoration: 'none', color: 'var(--ac)' }}>
                          View
                        </a>
                      ) : (
                        <span style={{ color: 'var(--t3)' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '32px 0', textAlign: 'center', color: 'var(--t2)', fontSize: '12px' }}>
                    No payment history yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear History Modal */}
      {showClearHistoryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ maxWidth: '380px', width: '100%', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)' }}>Clear Payment History</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '16px' }}>This will permanently delete all your payment records. This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowClearHistoryModal(false)} className="btn bs" style={{ flex: 1 }}>Cancel</button>
              <button
                onClick={() => clearHistoryMutation.mutate()}
                disabled={clearHistoryMutation.isPending}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                {clearHistoryMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
