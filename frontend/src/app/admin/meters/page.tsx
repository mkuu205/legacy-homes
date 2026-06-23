'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { Gauge, Plus, Search, Edit, Loader2, X, CheckCircle, AlertCircle, Trash2, Download, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

export default function AdminMetersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReadingModal, setShowReadingModal] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; meterNumber: string } | null>(null);
  const [newMeter, setNewMeter] = useState({ meterNumber: '', meterSerial: '', houseNumber: '', installationDate: '', notes: '' });
  const [readingData, setReadingData] = useState({ currentReading: '', billingMonth: new Date().toISOString().slice(0, 7) });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-meters', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/meters?${params}`);
      return res.data.data;
    },
  });

  const meters = data?.meters || [];
  const pagination = data?.pagination;

  const addMutation = useMutation({
    mutationFn: async (data: typeof newMeter) => {
      const res = await api.post('/meters', data);
      return res.data.data;
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Meter added successfully!' });
      setShowAddModal(false);
      setNewMeter({ meterNumber: '', meterSerial: '', houseNumber: '', installationDate: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-meters'] });
    },
    onError: (error) => toast({ type: 'error', title: 'Failed to add meter', description: getErrorMessage(error) }),
  });

  const addReadingMutation = useMutation({
    mutationFn: async ({ meterId, ...data }: { meterId: string; currentReading: string; billingMonth: string }) => {
      const res = await api.post(`/meters/${meterId}/readings`, { ...data, currentReading: parseFloat(data.currentReading) });
      return res.data.data;
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Reading recorded!', description: 'You can now generate bills for this month.' });
      setShowReadingModal(null);
      setReadingData({ currentReading: '', billingMonth: new Date().toISOString().slice(0, 7) });
      queryClient.invalidateQueries({ queryKey: ['admin-meters'] });
    },
    onError: (error) => toast({ type: 'error', title: 'Failed to record reading', description: getErrorMessage(error) }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/meters/${id}`); },
    onSuccess: () => {
      toast({ type: 'success', title: 'Meter deleted successfully' });
      setShowDeleteModal(null);
      queryClient.invalidateQueries({ queryKey: ['admin-meters'] });
    },
    onError: (error) => toast({ type: 'error', title: 'Delete failed', description: getErrorMessage(error) }),
  });

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/meters/export/csv', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'meters.csv'; a.click();
      URL.revokeObjectURL(url);
      toast({ type: 'success', title: 'CSV exported' });
    } catch (err) {
      toast({ type: 'error', title: 'Export failed', description: getErrorMessage(err) });
    }
  };

  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    ACTIVE: { color: '#34d399', icon: <CheckCircle size={13} /> },
    FAULTY: { color: '#f87171', icon: <AlertCircle size={13} /> },
    REPLACED: { color: '#94a3b8', icon: <AlertCircle size={13} /> },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fu">
      {/* Header */}
      <div className="s-hd" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="pg-h">Meters</h1>
          <p className="pg-sh">{pagination?.total || 0} meters registered</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExportCSV} className="btn bs btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn bp btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Add Meter
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search meter number, house, resident..."
            className="inp"
            style={{ paddingLeft: '38px' }}
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="sel" style={{ width: '140px' }}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="FAULTY">Faulty</option>
          <option value="REPLACED">Replaced</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bd)', background: 'var(--c2)' }}>
                {['Meter No.', 'Resident', 'House', 'Prev Reading', 'Curr Reading', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--bd)' }}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} style={{ padding: '12px 16px' }}>
                        <div className="skeleton" style={{ height: '16px', borderRadius: '4px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : meters.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center' }}>
                    <Gauge size={40} style={{ color: 'var(--t2)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                    <p style={{ fontSize: '12px', color: 'var(--t2)' }}>No meters found</p>
                  </td>
                </tr>
              ) : (
                meters.map((m: any) => {
                  const sc = statusConfig[m.status] || statusConfig.FAULTY;
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--bd)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,198,167,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--t1)' }}>
                        {m.meterNumber}
                        {m.meterSerial && <div style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '2px' }}>{m.meterSerial}</div>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>{m.resident?.fullName || <span style={{ color: 'var(--t3)' }}>Unassigned</span>}</p>
                        {m.resident?.accountNumber && <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>{m.resident.accountNumber}</p>}
                        {m.resident?.phone && <p style={{ fontSize: '11px', color: 'var(--t3)' }}>{m.resident.phone}</p>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t1)', fontWeight: 600 }}>{m.houseNumber || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--t2)' }}>{m.previousReading ?? 0}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--t1)' }}>{m.currentReading ?? 0}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: sc.color }}>
                          {sc.icon}{m.status}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => { setShowReadingModal(m); setReadingData({ currentReading: '', billingMonth: new Date().toISOString().slice(0, 7) }); }} className="btn bp btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Edit size={12} /> Record
                          </button>
                          <button onClick={() => setShowDeleteModal({ id: m.id, meterNumber: m.meterNumber })} className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--bd)' }}>
            <p style={{ fontSize: '12px', color: 'var(--t2)' }}>Page {pagination.page} of {pagination.pages} ({pagination.total} total)</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn bs btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ChevronLeft size={14} /> Prev
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page === pagination.pages} className="btn bs btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Meter Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.6)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '448px' }}>
            <div className="s-hd" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', marginBottom: 0 }}>Add New Meter</h2>
              <button onClick={() => setShowAddModal(false)} className="btn-icon bg"><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {[
                { key: 'meterNumber', label: 'Meter Number *', placeholder: 'MTR-A1-001' },
                { key: 'meterSerial', label: 'Serial Number', placeholder: 'SN-12345' },
                { key: 'houseNumber', label: 'House Number *', placeholder: 'A1' },
                { key: 'installationDate', label: 'Installation Date *', type: 'date' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key} className="fg">
                  <label className="lbl">{label}</label>
                  <input type={type || 'text'} value={(newMeter as any)[key]} onChange={e => setNewMeter(d => ({ ...d, [key]: e.target.value }))} placeholder={placeholder} className="inp" />
                </div>
              ))}
              <div className="fg">
                <label className="lbl">Notes</label>
                <input type="text" value={newMeter.notes} onChange={e => setNewMeter(d => ({ ...d, notes: e.target.value }))} placeholder="Optional notes" className="inp" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => addMutation.mutate(newMeter)} disabled={addMutation.isPending || !newMeter.meterNumber || !newMeter.houseNumber || !newMeter.installationDate} className="btn bp" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {addMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />} Add Meter
              </button>
              <button onClick={() => setShowAddModal(false)} className="btn bs" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Record Reading Modal */}
      {showReadingModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.6)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <div className="s-hd" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', marginBottom: 0 }}>Record Meter Reading</h2>
              <button onClick={() => setShowReadingModal(null)} className="btn-icon bg"><X size={16} /></button>
            </div>
            <div style={{ padding: '12px', borderRadius: '9px', background: 'var(--c2)', border: '1px solid var(--bd)', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>{showReadingModal.meterNumber}</p>
              <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '2px' }}>House {showReadingModal.houseNumber} · {showReadingModal.resident?.fullName || 'Unassigned'}</p>
              <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '4px' }}>Previous reading: <strong>{showReadingModal.currentReading}</strong> m³</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div className="fg">
                <label className="lbl">Billing Month</label>
                <input type="month" value={readingData.billingMonth} onChange={e => setReadingData(d => ({ ...d, billingMonth: e.target.value }))} className="inp" />
              </div>
              <div className="fg">
                <label className="lbl">New Current Reading (m³)</label>
                <input type="number" value={readingData.currentReading} onChange={e => setReadingData(d => ({ ...d, currentReading: e.target.value }))} placeholder={`Greater than ${showReadingModal.currentReading}`} min={showReadingModal.currentReading} className="inp" />
                {readingData.currentReading && parseFloat(readingData.currentReading) > showReadingModal.currentReading && (
                  <p style={{ fontSize: '11px', color: 'var(--ok)', marginTop: '6px', fontWeight: 600 }}>
                    Units consumed: {(parseFloat(readingData.currentReading) - showReadingModal.currentReading).toFixed(2)} m³ → Bill: KES {((parseFloat(readingData.currentReading) - showReadingModal.currentReading) * 250).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => addReadingMutation.mutate({ meterId: showReadingModal.id, ...readingData })} disabled={addReadingMutation.isPending || !readingData.currentReading || parseFloat(readingData.currentReading) <= showReadingModal.currentReading} className="btn bp" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {addReadingMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null} Save Reading
              </button>
              <button onClick={() => setShowReadingModal(null)} className="btn bs" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Meter Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.7)' }}>
          <div className="card" style={{ maxWidth: '380px', width: '100%', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)' }}>Delete Meter</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '6px' }}>
              Are you sure you want to delete meter <strong>{showDeleteModal.meterNumber}</strong>?
            </p>
            <p style={{ fontSize: '12px', color: '#f87171', marginBottom: '16px' }}>
              This will also delete all associated readings. Meters with active unpaid bills cannot be deleted.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowDeleteModal(null)} className="btn bs" style={{ flex: 1 }}>Cancel</button>
              <button onClick={() => deleteMutation.mutate(showDeleteModal.id)} disabled={deleteMutation.isPending} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {deleteMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
