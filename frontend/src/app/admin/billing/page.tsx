'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { FileText, Search, RefreshCw, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function AdminBillingPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bills', search, statusFilter, monthFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (monthFilter) params.set('billingMonth', monthFilter);
      const res = await api.get(`/billing?${params}`);
      return res.data.data;
    },
  });

  const generateBillsMutation = useMutation({
    mutationFn: async (billingMonth: string) => {
      const res = await api.post('/billing/generate', { billingMonth });
      return res.data.data;
    },
    onSuccess: (data) => {
      toast({ type: 'success', title: 'Bills generated!', description: `${data.generated} bills created.` });
      queryClient.invalidateQueries({ queryKey: ['admin-bills'] });
    },
    onError: (error) => toast({ type: 'error', title: 'Failed', description: getErrorMessage(error) }),
  });

  const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    PAID: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.14)', icon: <CheckCircle size={12} /> },
    PARTIAL: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.14)', icon: <Clock size={12} /> },
    UNPAID: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.14)', icon: <AlertCircle size={12} /> },
    OVERDUE: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.14)', icon: <AlertCircle size={12} /> },
  };

  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fu">
      {/* Header */}
      <div className="s-hd" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="pg-h">Billing</h1>
          <p className="pg-sh">{data?.pagination?.total || 0} total bills</p>
        </div>
        <button
          onClick={() => generateBillsMutation.mutate(currentMonth)}
          disabled={generateBillsMutation.isPending}
          className="btn bp btn-sm"
        >
          {generateBillsMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
          Generate Bills ({currentMonth})
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="sm:flex-row">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search bills..."
            className="inp"
            style={{ paddingLeft: '40px' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="sel"
          style={{ minWidth: '140px' }}
        >
          <option value="">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
          <option value="UNPAID">Unpaid</option>
          <option value="OVERDUE">Overdue</option>
        </select>
        <input
          type="month"
          value={monthFilter}
          onChange={e => { setMonthFilter(e.target.value); setPage(1); }}
          className="inp"
          style={{ minWidth: '140px' }}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bd)', background: 'var(--c2)' }}>
                {['Bill No.', 'Resident', 'Month', 'Units', 'Total', 'Paid', 'Balance', 'Status', 'Due Date'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--t2)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--bd)' }}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j} style={{ padding: '12px 16px' }}>
                        <div className="skeleton" style={{ height: '16px', borderRadius: '4px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.bills?.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 16px', textAlign: 'center' }}>
                    <FileText size={40} style={{ color: 'var(--t2)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                    <p style={{ fontSize: '12px', color: 'var(--t2)' }}>No bills found</p>
                  </td>
                </tr>
              ) : (
                data?.bills?.map((b: any) => {
                  const s = statusConfig[b.status] || statusConfig.UNPAID;
                  return (
                    <tr
                      key={b.id}
                      style={{
                        borderBottom: '1px solid var(--bd)',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 198, 167, 0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--t1)' }}>
                        {b.billNumber}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>
                          {b.resident?.fullName}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>
                          House {b.resident?.houseNumber}
                        </p>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t1)' }}>
                        {b.billingMonth}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--t1)' }}>
                        {b.unitsConsumed}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--t1)' }}>
                        KES {b.totalAmount.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--ok)' }}>
                        KES {b.amountPaid.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: b.balance > 0 ? '#f87171' : 'var(--ok)' }}>
                        KES {b.balance.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="badge" style={{ background: s.bg, color: s.color, fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                          {s.icon} {b.status}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--t2)' }}>
                        {new Date(b.dueDate).toLocaleDateString('en-KE')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && data.pagination.pages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: '1px solid var(--bd)',
            }}
          >
            <p style={{ fontSize: '12px', color: 'var(--t2)' }}>
              Page {data.pagination.page} of {data.pagination.pages}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn bg btn-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === data.pagination.pages}
                className="btn bg btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
