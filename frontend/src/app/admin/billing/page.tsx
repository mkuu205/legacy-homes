'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { FileText, Search, RefreshCw, Loader2, CheckCircle, Clock, AlertCircle, Trash2, Download, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

export default function AdminBillingPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(new Date().toISOString().slice(0, 7));
  const [forceGenerate, setForceGenerate] = useState(false);
  const [generateDueDate, setGenerateDueDate] = useState('');
  const [generateWaterUnitRate, setGenerateWaterUnitRate] = useState('');
  const [generateLateFee, setGenerateLateFee] = useState('');
  const [generatePeriodStart, setGeneratePeriodStart] = useState('');
  const [generatePeriodEnd, setGeneratePeriodEnd] = useState('');
  const [showPreviewSummary, setShowPreviewSummary] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{ type: 'single' | 'bulk' | 'month' | 'unpaid'; id?: string } | null>(null);
  const [deleteMonth, setDeleteMonth] = useState('');

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

  const bills = data?.bills || [];
  const pagination = data?.pagination;

  const generateBillsMutation = useMutation({
    mutationFn: async ({ billingMonth, force }: { billingMonth: string; force: boolean }) => {
      const payload: any = { billingMonth, force };
      if (generateDueDate) payload.dueDate = generateDueDate;
      if (generateWaterUnitRate) payload.waterUnitRate = Number(generateWaterUnitRate);
      if (generateLateFee) payload.lateFee = Number(generateLateFee);
      if (generatePeriodStart) payload.billingPeriodStart = generatePeriodStart;
      if (generatePeriodEnd) payload.billingPeriodEnd = generatePeriodEnd;
      const res = await api.post('/billing/generate', payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      toast({ type: 'success', title: 'Bills generated!', description: `${data.generated} bills created.` });
      queryClient.invalidateQueries({ queryKey: ['admin-bills'] });
      setShowGenerateModal(false);
      setForceGenerate(false);
      setShowPreviewSummary(false);
      setGenerateDueDate('');
      setGenerateWaterUnitRate('');
      setGenerateLateFee('');
      setGeneratePeriodStart('');
      setGeneratePeriodEnd('');
    },
    onError: (error: any) => {
      const msg = getErrorMessage(error);
      if (msg.includes('DUPLICATE') || error?.response?.status === 409) {
        setForceGenerate(true);
        toast({ type: 'error', title: 'Duplicate Warning', description: 'Bills already exist for this month. Enable force to regenerate.' });
      } else {
        toast({ type: 'error', title: 'Failed', description: msg });
      }
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/billing/${id}`); },
    onSuccess: () => {
      toast({ type: 'success', title: 'Bill deleted' });
      queryClient.invalidateQueries({ queryKey: ['admin-bills'] });
      setShowDeleteModal(null);
    },
    onError: (err) => toast({ type: 'error', title: 'Delete failed', description: getErrorMessage(err) }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => { const res = await api.post('/billing/bulk-delete', { ids }); return res.data; },
    onSuccess: (data) => {
      toast({ type: 'success', title: `${data.deleted} bills deleted` });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin-bills'] });
      setShowDeleteModal(null);
    },
    onError: (err) => toast({ type: 'error', title: 'Bulk delete failed', description: getErrorMessage(err) }),
  });

  const deleteByMonthMutation = useMutation({
    mutationFn: async (billingMonth: string) => { const res = await api.post('/billing/delete-by-month', { billingMonth }); return res.data; },
    onSuccess: (data) => {
      toast({ type: 'success', title: `${data.deleted} bills deleted for ${deleteMonth}` });
      queryClient.invalidateQueries({ queryKey: ['admin-bills'] });
      setShowDeleteModal(null);
    },
    onError: (err) => toast({ type: 'error', title: 'Delete failed', description: getErrorMessage(err) }),
  });

  const deleteUnpaidMutation = useMutation({
    mutationFn: async () => { const res = await api.post('/billing/delete-all-unpaid'); return res.data; },
    onSuccess: (data) => {
      toast({ type: 'success', title: `${data.deleted} unpaid bills deleted` });
      queryClient.invalidateQueries({ queryKey: ['admin-bills'] });
      setShowDeleteModal(null);
    },
    onError: (err) => toast({ type: 'error', title: 'Delete failed', description: getErrorMessage(err) }),
  });

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (monthFilter) params.set('billingMonth', monthFilter);
      const res = await api.get(`/billing/export/csv?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'bills.csv'; a.click();
      URL.revokeObjectURL(url);
      toast({ type: 'success', title: 'CSV exported' });
    } catch (err) {
      toast({ type: 'error', title: 'Export failed', description: getErrorMessage(err) });
    }
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === bills.length ? [] : bills.map((b: any) => b.id));

  const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    PAID: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.14)', icon: <CheckCircle size={12} /> },
    PARTIAL: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.14)', icon: <Clock size={12} /> },
    UNPAID: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.14)', icon: <AlertCircle size={12} /> },
    OVERDUE: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.14)', icon: <AlertCircle size={12} /> },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fu">
      {/* Header */}
      <div className="s-hd" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="pg-h">Billing</h1>
          <p className="pg-sh">{pagination?.total || 0} total bills</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleExportCSV} className="btn bs btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => setShowDeleteModal({ type: 'unpaid' })} className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Trash2 size={14} /> Delete Unpaid
          </button>
          <button onClick={() => { setShowGenerateModal(true); setForceGenerate(false); }} className="btn bp btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} /> Generate Bills
          </button>
        </div>
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
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search bills..." className="inp" style={{ paddingLeft: '40px' }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="sel" style={{ minWidth: '140px' }}>
          <option value="">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
          <option value="UNPAID">Unpaid</option>
          <option value="OVERDUE">Overdue</option>
        </select>
        <input type="month" value={monthFilter} onChange={e => { setMonthFilter(e.target.value); setPage(1); }} className="inp" style={{ minWidth: '140px' }} />
        {monthFilter && (
          <button onClick={() => setShowDeleteModal({ type: 'month' })} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            <Trash2 size={12} /> Delete Month
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--ac)' }} />
          </div>
        ) : bills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--t2)' }}>
            <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>No bills found</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>
                    <input type="checkbox" checked={selectedIds.length === bills.length && bills.length > 0} onChange={toggleSelectAll} />
                  </th>
                  {['Bill #', 'Resident', 'Month', 'Total', 'Paid', 'Balance', 'Status', 'Due Date', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bills.map((bill: any) => {
                  const sc = statusConfig[bill.status] || statusConfig.UNPAID;
                  return (
                    <tr key={bill.id} style={{ borderBottom: '1px solid var(--bd)', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--c2)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '12px 16px' }}>
                        <input type="checkbox" checked={selectedIds.includes(bill.id)} onChange={() => toggleSelect(bill.id)} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--ac)', whiteSpace: 'nowrap' }}>{bill.billNumber}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>{bill.resident?.fullName || '—'}</p>
                        <p style={{ fontSize: '11px', color: 'var(--t2)' }}>{bill.resident?.accountNumber}</p>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t2)', whiteSpace: 'nowrap' }}>{bill.billingMonth}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap' }}>KES {Number(bill.totalAmount).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#34d399', whiteSpace: 'nowrap' }}>KES {Number(bill.amountPaid).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: bill.balance > 0 ? '#f87171' : 'var(--t2)', whiteSpace: 'nowrap' }}>KES {Number(bill.balance).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: sc.color, background: sc.bg }}>
                          {sc.icon}{bill.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t2)', whiteSpace: 'nowrap' }}>{new Date(bill.dueDate).toLocaleDateString('en-KE')}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => window.open(`/api/billing/${bill.id}/invoice`, '_blank')} style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--bd)', background: 'var(--c2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--t2)' }}>
                            <Download size={12} />
                          </button>
                          <button onClick={() => setShowDeleteModal({ type: 'single', id: bill.id })} style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#ef4444' }}>
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
          <span style={{ fontSize: '12px', color: 'var(--t2)' }}>Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn bs btn-sm"><ChevronLeft size={14} /></button>
            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn bs btn-sm"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* Generate Bills Modal */}
      {showGenerateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', overflowY: 'auto' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', margin: 'auto' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)', marginBottom: '4px' }}>Generate Monthly Bills</h3>
            <p style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '16px' }}>Configure billing parameters. Fields marked optional use system defaults if left blank.</p>

            {/* Required */}
            <div className="fg" style={{ marginBottom: '12px' }}>
              <label className="lbl">Billing Month *</label>
              <input type="month" value={generateMonth} onChange={e => setGenerateMonth(e.target.value)} className="inp" />
            </div>

            {/* Optional overrides */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div className="fg">
                <label className="lbl">Due Date <span style={{ fontSize: '10px', color: 'var(--t3)' }}>(optional)</span></label>
                <input type="date" value={generateDueDate} onChange={e => setGenerateDueDate(e.target.value)} className="inp" />
              </div>
              <div className="fg">
                <label className="lbl">Water Unit Rate (KES) <span style={{ fontSize: '10px', color: 'var(--t3)' }}>(optional)</span></label>
                <input type="number" min="0" step="0.01" placeholder="e.g. 250" value={generateWaterUnitRate} onChange={e => setGenerateWaterUnitRate(e.target.value)} className="inp" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div className="fg">
                <label className="lbl">Period Start <span style={{ fontSize: '10px', color: 'var(--t3)' }}>(optional)</span></label>
                <input type="date" value={generatePeriodStart} onChange={e => setGeneratePeriodStart(e.target.value)} className="inp" />
              </div>
              <div className="fg">
                <label className="lbl">Period End <span style={{ fontSize: '10px', color: 'var(--t3)' }}>(optional)</span></label>
                <input type="date" value={generatePeriodEnd} onChange={e => setGeneratePeriodEnd(e.target.value)} className="inp" />
              </div>
            </div>

            <div className="fg" style={{ marginBottom: '12px' }}>
              <label className="lbl">Late Fee (KES) <span style={{ fontSize: '10px', color: 'var(--t3)' }}>(optional)</span></label>
              <input type="number" min="0" step="0.01" placeholder="e.g. 500" value={generateLateFee} onChange={e => setGenerateLateFee(e.target.value)} className="inp" />
            </div>

            {forceGenerate && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', marginBottom: '12px' }}>
                <AlertTriangle size={16} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#fbbf24' }}>Bills already exist for this month</p>
                  <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '2px' }}>Force regeneration will delete existing unpaid bills and replace them with fresh ones based on current meter readings.</p>
                </div>
              </div>
            )}
            {forceGenerate && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--t1)', marginBottom: '16px', cursor: 'pointer' }}>
                <input type="checkbox" checked={forceGenerate} onChange={e => setForceGenerate(e.target.checked)} />
                Force regenerate (replaces existing unpaid bills)
              </label>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowGenerateModal(false); setForceGenerate(false); setGenerateDueDate(''); setGenerateWaterUnitRate(''); setGenerateLateFee(''); setGeneratePeriodStart(''); setGeneratePeriodEnd(''); }} className="btn bs" style={{ flex: 1 }}>Cancel</button>
              <button onClick={() => generateBillsMutation.mutate({ billingMonth: generateMonth, force: forceGenerate })} disabled={generateBillsMutation.isPending || !generateMonth} className="btn bp" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {generateBillsMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
                Generate Bills
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ maxWidth: '380px', width: '100%', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)' }}>
                {showDeleteModal.type === 'single' ? 'Delete Bill' : showDeleteModal.type === 'bulk' ? `Delete ${selectedIds.length} Bills` : showDeleteModal.type === 'month' ? `Delete Bills for ${monthFilter}` : 'Delete All Unpaid Bills'}
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '16px' }}>
              This action cannot be undone. All associated payments will also be deleted.
            </p>
            {showDeleteModal.type === 'month' && (
              <div className="fg" style={{ marginBottom: '12px' }}>
                <label className="lbl">Confirm Billing Month</label>
                <input type="month" value={deleteMonth || monthFilter} onChange={e => setDeleteMonth(e.target.value)} className="inp" />
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowDeleteModal(null)} className="btn bs" style={{ flex: 1 }}>Cancel</button>
              <button
                onClick={() => {
                  if (showDeleteModal.type === 'single' && showDeleteModal.id) deleteBillMutation.mutate(showDeleteModal.id);
                  else if (showDeleteModal.type === 'bulk') bulkDeleteMutation.mutate(selectedIds);
                  else if (showDeleteModal.type === 'month') deleteByMonthMutation.mutate(deleteMonth || monthFilter);
                  else deleteUnpaidMutation.mutate();
                }}
                disabled={deleteBillMutation.isPending || bulkDeleteMutation.isPending || deleteByMonthMutation.isPending || deleteUnpaidMutation.isPending}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                {(deleteBillMutation.isPending || bulkDeleteMutation.isPending || deleteByMonthMutation.isPending || deleteUnpaidMutation.isPending) ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
