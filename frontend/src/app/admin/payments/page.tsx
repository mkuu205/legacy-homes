'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { CreditCard, Search, Loader2, CheckCircle, Clock, AlertCircle, Trash2, Download, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState<{ type: 'single' | 'bulk'; id?: string } | null>(null);

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

  const payments = data?.payments || [];
  const pagination = data?.pagination;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/payments/${id}`); },
    onSuccess: () => {
      toast({ type: 'success', title: 'Payment deleted' });
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      setShowDeleteModal(null);
    },
    onError: (err) => toast({ type: 'error', title: 'Delete failed', description: getErrorMessage(err) }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => { const res = await api.post('/payments/bulk-delete', { ids }); return res.data; },
    onSuccess: (data) => {
      toast({ type: 'success', title: `${data.deleted} payments deleted` });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      setShowDeleteModal(null);
    },
    onError: (err) => toast({ type: 'error', title: 'Bulk delete failed', description: getErrorMessage(err) }),
  });

  const retryMutation = useMutation({
    mutationFn: async (paymentId: string) => { const res = await api.post(`/payments/retry/${paymentId}`); return res.data; },
    onSuccess: (data) => {
      toast({ type: 'success', title: data.data?.message || 'Verification attempted' });
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    },
    onError: (err) => toast({ type: 'error', title: 'Retry failed', description: getErrorMessage(err) }),
  });

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/payments/export/csv?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'payments.csv'; a.click();
      URL.revokeObjectURL(url);
      toast({ type: 'success', title: 'CSV exported' });
    } catch (err) {
      toast({ type: 'error', title: 'Export failed', description: getErrorMessage(err) });
    }
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === payments.length ? [] : payments.map((p: any) => p.id));

  const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    SUCCESSFUL: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.14)', icon: <CheckCircle size={12} /> },
    PENDING: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.14)', icon: <Clock size={12} /> },
    FAILED: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.14)', icon: <AlertCircle size={12} /> },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fu">
      {/* Header */}
      <div className="s-hd" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="pg-h">Payments</h1>
          <p className="pg-sh">{pagination?.total || 0} total payments</p>
        </div>
        <button onClick={handleExportCSV} className="btn bs btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(0,198,167,0.08)', borderRadius: '10px', border: '1px solid rgba(0,198,167,0.2)' }}>
          <span style={{ fontSize: '13px', color: 'var(--ac)', fontWeight: 600 }}>{selectedIds.length} selected</span>
          <button onClick={() => setShowDeleteModal({ type: 'bulk' })} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            <Trash2 size={12} /> Delete Selected
          </button>
          <button onClick={() => setSelectedIds([])} style={{ fontSize: '12px', color: 'var(--t2)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search payments..." className="inp" style={{ paddingLeft: '40px' }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="sel" style={{ minWidth: '140px' }}>
          <option value="">All Status</option>
          <option value="SUCCESSFUL">Successful</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--ac)' }} />
          </div>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--t2)' }}>
            <CreditCard size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>No payments found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>
                    <input type="checkbox" checked={selectedIds.length === payments.length && payments.length > 0} onChange={toggleSelectAll} />
                  </th>
                  {['Payment ID', 'Resident', 'Amount', 'M-Pesa Code', 'Bill', 'Status', 'Date', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((payment: any) => {
                  const sc = statusConfig[payment.status] || statusConfig.PENDING;
                  return (
                    <tr key={payment.id} style={{ borderBottom: '1px solid var(--bd)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--c2)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '12px 16px' }}>
                        <input type="checkbox" checked={selectedIds.includes(payment.id)} onChange={() => toggleSelect(payment.id)} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--ac)', whiteSpace: 'nowrap' }}>{payment.paymentId}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>{payment.resident?.fullName || '—'}</p>
                        <p style={{ fontSize: '11px', color: 'var(--t2)' }}>{payment.resident?.accountNumber}</p>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: '#34d399', whiteSpace: 'nowrap' }}>KES {Number(payment.amount).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t2)', fontFamily: 'monospace' }}>{payment.mpesaReceiptCode || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t2)' }}>{payment.bill?.billNumber || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: sc.color, background: sc.bg }}>
                          {sc.icon}{payment.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t2)', whiteSpace: 'nowrap' }}>{new Date(payment.createdAt).toLocaleDateString('en-KE')}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {(payment.status === 'PENDING' || payment.status === 'FAILED') && (
                            <button onClick={() => retryMutation.mutate(payment.paymentId)} disabled={retryMutation.isPending} title="Retry verification" style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(0,198,167,0.3)', background: 'rgba(0,198,167,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--ac)' }}>
                              <RefreshCw size={12} />
                            </button>
                          )}
                          <button onClick={() => setShowDeleteModal({ type: 'single', id: payment.id })} style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ef4444' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: 'var(--t2)' }}>Page {pagination.page} of {pagination.pages}</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn bs btn-sm"><ChevronLeft size={14} /></button>
            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn bs btn-sm"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ maxWidth: '380px', width: '100%', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)' }}>
                {showDeleteModal.type === 'single' ? 'Delete Payment' : `Delete ${selectedIds.length} Payments`}
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '16px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowDeleteModal(null)} className="btn bs" style={{ flex: 1 }}>Cancel</button>
              <button
                onClick={() => {
                  if (showDeleteModal.type === 'single' && showDeleteModal.id) deleteMutation.mutate(showDeleteModal.id);
                  else bulkDeleteMutation.mutate(selectedIds);
                }}
                disabled={deleteMutation.isPending || bulkDeleteMutation.isPending}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                {(deleteMutation.isPending || bulkDeleteMutation.isPending) ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
