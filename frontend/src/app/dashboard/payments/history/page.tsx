'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  CreditCard,
  Filter,
  ReceiptText,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from '@/components/ui/toaster';
import { useMemo, useState } from 'react';

type StatusFilter = 'ALL' | 'SUCCESSFUL' | 'PENDING' | 'FAILED' | 'CANCELLED';

type PaymentRecord = {
  id: string;
  paymentId?: string;
  amount: number | string;
  status: string;
  provider?: string;
  paymentMethod?: string;
  phoneNumber?: string | null;
  providerTransactionId?: string | null;
  providerReference?: string | null;
  providerOrderId?: string | null;
  receiptNumber?: string | null;
  confirmationCode?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  bill?: { billNumber?: string | null } | null;
};

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'SUCCESSFUL', label: 'Successful' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function formatAmount(value: number | string) {
  return `KES ${Number(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getStatusDetails(status: string) {
  switch (status) {
    case 'SUCCESSFUL':
      return { label: 'Successful', icon: CheckCircle2, color: '#34d399', background: 'rgba(16, 185, 129, 0.14)' };
    case 'PENDING':
      return { label: 'Pending', icon: Clock3, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.14)' };
    case 'CANCELLED':
      return { label: 'Cancelled', icon: XCircle, color: '#a1a1aa', background: 'rgba(113, 113, 122, 0.18)' };
    case 'FAILED':
    default:
      return { label: 'Failed', icon: AlertCircle, color: '#f87171', background: 'rgba(239, 68, 68, 0.14)' };
  }
}

function getReference(payment: PaymentRecord) {
  return payment.providerTransactionId || payment.providerReference || payment.providerOrderId || payment.paymentId || '—';
}

function getPaymentMethod(payment: PaymentRecord) {
  return payment.paymentMethod || payment.provider || '—';
}

export default function PaymentsHistoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-payments'],
    queryFn: async () => {
      const allPayments: PaymentRecord[] = [];
      let page = 1;
      let pages = 1;
      const limit = 100;

      do {
        const res = await api.get(`/payments/my-payments?page=${page}&limit=${limit}`);
        const result = res.data.data || { payments: [], pagination: { total: 0, pages: 1 } };
        allPayments.push(...(result.payments || []));
        pages = Number(result.pagination?.pages || 1);
        page += 1;
      } while (page <= pages);

      return {
        payments: allPayments,
        pagination: {
          ...(allPayments.length ? { total: allPayments.length } : { total: 0 }),
          pages: 1,
          page: 1,
          limit: allPayments.length,
        },
      };
    },
  });

  const payments: PaymentRecord[] = data?.payments || [];

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => api.delete(`/payments/${paymentId}`),
    onSuccess: () => {
      toast({ type: 'success', title: 'Payment deleted', description: 'The payment record has been removed.' });
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (deleteError: any) => {
      toast({ type: 'error', title: 'Delete failed', description: deleteError?.response?.data?.message || 'You cannot delete this payment record.' });
    },
  });

  const filteredPayments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return payments.filter((payment) => {
      const searchable = [
        payment.paymentId,
        payment.status,
        payment.provider,
        payment.receiptNumber,
        payment.providerTransactionId,
        payment.providerReference,
        payment.providerOrderId,
        payment.bill?.billNumber,
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesStatus = statusFilter === 'ALL' || payment.status === statusFilter;
      const matchesDate = !dateFilter || payment.createdAt?.slice(0, 10) === dateFilter;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [dateFilter, payments, searchTerm, statusFilter]);

  const summary = useMemo(() => ({
    total: data?.pagination?.total ?? payments.length,
    amount: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    successful: payments.filter((payment) => payment.status === 'SUCCESSFUL').length,
    pending: payments.filter((payment) => payment.status === 'PENDING').length,
  }), [data?.pagination?.total, payments]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setDateFilter('');
  };

  return (
    <div className="pg fu" style={{ paddingBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <button onClick={() => router.back()} className="btn-icon bg" aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="pg-h">Payment History</h1>
            <p className="pg-sh">View and track all your Legacy Homes payments</p>
          </div>
        </div>
        <button className="btn bp" onClick={() => router.push('/dashboard/payments')}>
          Make a Payment
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginBottom: '20px' }}>
        {[
          { label: 'Total payments', value: summary.total.toLocaleString(), icon: ReceiptText, color: 'var(--ac)' },
          { label: 'Amount paid in view', value: formatAmount(summary.amount), icon: CreditCard, color: '#60a5fa' },
          { label: 'Successful payments', value: summary.successful.toLocaleString(), icon: CheckCircle2, color: '#34d399' },
          { label: 'Pending payments', value: summary.pending.toLocaleString(), icon: Clock3, color: '#fbbf24' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--t2)', fontWeight: 600 }}>{label}</span>
              <Icon size={16} style={{ color }} />
            </div>
            <p style={{ fontSize: '20px', color: 'var(--t1)', fontWeight: 800, marginTop: '10px', letterSpacing: '-0.02em' }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }} />
            <input className="inp" style={{ paddingLeft: '36px' }} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search payments, receipts, or bills" aria-label="Search payments" />
          </div>
          <div style={{ position: 'relative', flex: '0 1 170px' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', pointerEvents: 'none' }} />
            <input className="inp" style={{ paddingLeft: '36px' }} type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filter by date" />
          </div>
          <button className="btn bg" type="button" onClick={clearFilters} disabled={!searchTerm && statusFilter === 'ALL' && !dateFilter}>
            <Filter size={15} /> Clear filters
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingTop: '12px' }} aria-label="Payment status filters">
          {statusOptions.map((option) => (
            <button key={option.value} type="button" onClick={() => setStatusFilter(option.value)} className={statusFilter === option.value ? 'btn bp' : 'btn bg'} style={{ whiteSpace: 'nowrap', padding: '7px 11px', fontSize: '11px' }}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '20px' }} aria-label="Loading payments">
            {[1, 2, 3, 4].map((item) => <div key={item} style={{ height: '64px', borderRadius: '8px', background: 'var(--c2)', marginBottom: '10px', opacity: 1 - item * 0.12 }} />)}
          </div>
        ) : isError ? (
          <div style={{ padding: '56px 20px', textAlign: 'center' }}>
            <AlertCircle size={30} style={{ color: '#f87171', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--t1)', fontWeight: 700 }}>We could not load your payments</p>
            <p style={{ color: 'var(--t2)', fontSize: '12px', marginTop: '5px' }}>{(error as any)?.response?.data?.message || 'Please check your connection and try again.'}</p>
            <button className="btn bp" style={{ marginTop: '16px' }} onClick={() => refetch()}><RefreshCw size={14} /> Retry</button>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--c2)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <ReceiptText size={24} style={{ color: 'var(--t3)' }} />
            </div>
            <p style={{ color: 'var(--t1)', fontWeight: 700 }}>{payments.length ? 'No payments match these filters' : 'No payments yet'}</p>
            <p style={{ color: 'var(--t2)', fontSize: '12px', marginTop: '5px' }}>{payments.length ? 'Try changing your search or filters.' : 'Your completed and pending payments will appear here.'}</p>
            <button className="btn bp" style={{ marginTop: '16px' }} onClick={() => payments.length ? clearFilters() : router.push('/dashboard/payments')}>
              {payments.length ? 'Clear filters' : 'Make your first payment'}
            </button>
          </div>
        ) : (
          <>
            <div className="hidden md:block" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '1px solid var(--bd)' }}>
                  {['Payment', 'Amount', 'Status', 'Date', 'Reference', ''].map((heading) => <th key={heading} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{heading}</th>)}
                </tr></thead>
                <tbody>
                  {filteredPayments.map((payment) => {
                    const status = getStatusDetails(payment.status);
                    const StatusIcon = status.icon;
                    const expanded = expandedPaymentId === payment.id;
                    return <tr key={payment.id} style={{ borderBottom: '1px solid var(--bd)' }}>
                      <td style={{ padding: '15px 16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'var(--c2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CreditCard size={16} style={{ color: 'var(--ac)' }} /></div><div><p style={{ fontSize: '12px', color: 'var(--t1)', fontWeight: 700 }}>{payment.paymentId || payment.id}</p><p style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '3px' }}>{payment.bill?.billNumber ? `Bill ${payment.bill.billNumber}` : 'Legacy Homes payment'}</p></div></div></td>
                      <td style={{ padding: '15px 16px', fontSize: '13px', color: 'var(--t1)', fontWeight: 800 }}>{formatAmount(payment.amount)}</td>
                      <td style={{ padding: '15px 16px' }}><span className="badge" style={{ color: status.color, background: status.background }}><StatusIcon size={13} /> {status.label}</span></td>
                      <td style={{ padding: '15px 16px', fontSize: '11px', color: 'var(--t2)', whiteSpace: 'nowrap' }}>{formatDate(payment.createdAt)}</td>
                      <td style={{ padding: '15px 16px', fontSize: '11px', color: 'var(--t2)', fontFamily: 'monospace', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getReference(payment)}</td>
                      <td style={{ padding: '15px 16px', textAlign: 'right' }}><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}><button className="btn-icon bg" onClick={() => setExpandedPaymentId(expanded ? null : payment.id)} aria-label="View payment details">{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button><button className="btn-icon bg" onClick={() => router.push(`/dashboard/payments?paymentId=${payment.id}`)} aria-label="View receipt"><ReceiptText size={15} /></button><button className="btn-icon be" disabled={deletePaymentMutation.isPending} onClick={() => { if (confirm('Are you sure you want to delete this payment record?')) deletePaymentMutation.mutate(payment.id); }} aria-label="Delete payment"><Trash2 size={15} /></button></div></td>
                      {expanded && <td colSpan={6} style={{ padding: '0 16px 16px' }}><PaymentDetails payment={payment} /></td>}
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }}>
              {filteredPayments.map((payment) => {
                const status = getStatusDetails(payment.status);
                const StatusIcon = status.icon;
                const expanded = expandedPaymentId === payment.id;
                return <div key={payment.id} style={{ border: '1px solid var(--bd)', borderRadius: '12px', padding: '14px', background: 'var(--c2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}><div><p style={{ fontSize: '13px', color: 'var(--t1)', fontWeight: 800 }}>{formatAmount(payment.amount)}</p><p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '4px' }}>{formatDate(payment.createdAt)}</p></div><span className="badge" style={{ color: status.color, background: status.background }}><StatusIcon size={13} /> {status.label}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--bd)' }}><div><p style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase' }}>Reference</p><p style={{ fontSize: '11px', color: 'var(--t1)', fontFamily: 'monospace', marginTop: '3px', wordBreak: 'break-all' }}>{getReference(payment)}</p></div><button className="btn-icon bg" onClick={() => setExpandedPaymentId(expanded ? null : payment.id)} aria-label="View payment details">{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button></div>
                  {expanded && <div style={{ marginTop: '12px' }}><PaymentDetails payment={payment} /></div>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}><button className="btn bg" style={{ flex: 1 }} onClick={() => router.push(`/dashboard/payments?paymentId=${payment.id}`)}><ReceiptText size={14} /> Receipt</button><button className="btn be" onClick={() => { if (confirm('Are you sure you want to delete this payment record?')) deletePaymentMutation.mutate(payment.id); }} aria-label="Delete payment"><Trash2 size={14} /></button></div>
                </div>;
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PaymentDetails({ payment }: { payment: PaymentRecord }) {
  const details = [
    ['Payment method', getPaymentMethod(payment)],
    ['Provider', payment.provider || '—'],
    ['Transaction/reference', getReference(payment)],
    ['M-Pesa receipt', payment.receiptNumber || payment.confirmationCode || '—'],
    ['Related bill', payment.bill?.billNumber || '—'],
    ['Phone number', payment.phoneNumber || '—'],
    ['Last updated', formatDate(payment.updatedAt)],
  ];

  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', padding: '12px', borderRadius: '10px', background: 'var(--c2)', border: '1px solid var(--bd)' }}>
    {details.map(([label, value]) => <div key={label}><p style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p><p style={{ fontSize: '11px', color: 'var(--t1)', marginTop: '4px', wordBreak: 'break-word' }}>{value}</p></div>)}
    {payment.failureReason && <div style={{ gridColumn: '1 / -1' }}><p style={{ fontSize: '10px', color: '#f87171', textTransform: 'uppercase' }}>Failure reason</p><p style={{ fontSize: '11px', color: 'var(--t1)', marginTop: '4px' }}>{payment.failureReason}</p></div>}
  </div>;
}
