'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreditCard, Search, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function AdminPaymentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: statsData } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: async () => {
      const res = await api.get('/payments/stats');
      return res.data.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/payments?${params}`);
      return res.data.data;
    },
  });

  const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    SUCCESSFUL: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.14)', icon: <CheckCircle size={12} /> },
    PENDING: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.14)', icon: <Clock size={12} /> },
    FAILED: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.14)', icon: <AlertCircle size={12} /> },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fu">
      {/* Header */}
      <div>
        <h1 className="pg-h">Payments</h1>
        <p className="pg-sh">All M-Pesa transactions</p>
      </div>

      {/* Stats */}
      {statsData && (
        <div className="g4">
          {[
            { label: 'Total Revenue', value: `KES ${(statsData.totalRevenue || 0).toLocaleString()}`, color: 'var(--ok)' },
            { label: 'Successful', value: statsData.successful || 0, color: 'var(--ok)' },
            { label: 'Pending', value: statsData.pending || 0, color: '#fbbf24' },
            { label: 'Failed', value: statsData.failed || 0, color: '#f87171' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat card">
              <p style={{ fontSize: '20px', fontWeight: 700, color, marginBottom: '4px' }}>
                {value}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="sm:flex-row">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search payments..."
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
          <option value="SUCCESSFUL">Successful</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bd)', background: 'var(--c2)' }}>
                {['Payment ID', 'Resident', 'Amount', 'M-Pesa Receipt', 'Phone', 'Status', 'Date'].map(h => (
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
                    {[...Array(7)].map((_, j) => (
                      <td key={j} style={{ padding: '12px 16px' }}>
                        <div className="skeleton" style={{ height: '16px', borderRadius: '4px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.payments?.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center' }}>
                    <CreditCard size={40} style={{ color: 'var(--t2)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                    <p style={{ fontSize: '12px', color: 'var(--t2)' }}>No payments found</p>
                  </td>
                </tr>
              ) : (
                data?.payments?.map((p: any) => {
                  const s = statusConfig[p.status] || statusConfig.FAILED;
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid var(--bd)',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 198, 167, 0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--t1)' }}>
                        {p.paymentId}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>
                          {p.resident?.fullName}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>
                          House {p.resident?.houseNumber}
                        </p>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--t1)' }}>
                        KES {p.amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--t1)' }}>
                        {p.mpesaReceiptCode || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t1)' }}>
                        {p.phone}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="badge" style={{ background: s.bg, color: s.color, fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                          {s.icon} {p.status}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--t2)' }}>
                        {new Date(p.createdAt).toLocaleDateString('en-KE')}
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
