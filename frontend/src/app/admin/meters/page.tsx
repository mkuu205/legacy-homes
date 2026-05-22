'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { Gauge, Plus, Search, Edit, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';

export default function AdminMetersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReadingModal, setShowReadingModal] = useState<any>(null);
  const [newMeter, setNewMeter] = useState({ meterNumber: '', meterSerial: '', houseNumber: '', residentId: '', installationDate: '' });
  const [readingData, setReadingData] = useState({ currentReading: '', billingMonth: new Date().toISOString().slice(0, 7) });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-meters', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      const res = await api.get(`/meters?${params}`);
      return res.data.data;
    },
  });

  const { data: residentsData } = useQuery({
    queryKey: ['residents-list'],
    queryFn: async () => {
      const res = await api.get('/residents?limit=200');
      return res.data.data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof newMeter) => {
      const res = await api.post('/meters', data);
      return res.data.data;
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Meter added successfully!' });
      setShowAddModal(false);
      setNewMeter({ meterNumber: '', meterSerial: '', houseNumber: '', residentId: '', installationDate: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-meters'] });
    },
    onError: (error) => toast({ type: 'error', title: 'Failed', description: getErrorMessage(error) }),
  });

  const addReadingMutation = useMutation({
    mutationFn: async ({ meterId, ...data }: { meterId: string; currentReading: string; billingMonth: string }) => {
      const res = await api.post(`/meters/${meterId}/readings`, { ...data, currentReading: parseFloat(data.currentReading) });
      return res.data.data;
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Reading recorded!', description: 'Bill will be generated automatically.' });
      setShowReadingModal(null);
      setReadingData({ currentReading: '', billingMonth: new Date().toISOString().slice(0, 7) });
      queryClient.invalidateQueries({ queryKey: ['admin-meters'] });
    },
    onError: (error) => toast({ type: 'error', title: 'Failed', description: getErrorMessage(error) }),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fu">
      {/* Header */}
      <div className="s-hd">
        <div>
          <h1 className="pg-h">Meters</h1>
          <p className="pg-sh">{data?.pagination?.total || 0} meters registered</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn bp btn-sm"
        >
          <Plus size={14} />
          Add Meter
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }} />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by meter number, house, resident..."
          className="inp"
          style={{ paddingLeft: '40px' }}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bd)', background: 'var(--c2)' }}>
                {['Meter No.', 'Resident', 'House', 'Prev Reading', 'Curr Reading', 'Status', 'Actions'].map(h => (
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
                [...Array(6)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--bd)' }}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} style={{ padding: '12px 16px' }}>
                        <div className="skeleton" style={{ height: '16px', borderRadius: '4px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.meters?.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center' }}>
                    <Gauge size={40} style={{ color: 'var(--t2)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                    <p style={{ fontSize: '12px', color: 'var(--t2)' }}>No meters found</p>
                  </td>
                </tr>
              ) : (
                data?.meters?.map((m: any) => (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: '1px solid var(--bd)',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 198, 167, 0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--t1)' }}>
                      {m.meterNumber}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>
                        {m.resident?.fullName || '—'}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>
                        {m.resident?.accountNumber}
                      </p>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t1)' }}>
                      {m.houseNumber}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--t1)' }}>
                      {m.previousReading}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--t1)' }}>
                      {m.currentReading}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: m.status === 'ACTIVE' ? '#34d399' : '#f87171' }}>
                        {m.status === 'ACTIVE' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        {m.status}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => setShowReadingModal(m)}
                        className="btn bp btn-sm"
                      >
                        <Edit size={12} />
                        Record
                      </button>
                    </td>
                  </tr>
                ))
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

      {/* Add Meter Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '448px' }}>
            <div className="s-hd" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', marginBottom: 0, fontFamily: 'var(--f1)' }}>
                Add New Meter
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-icon bg"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {[
                { key: 'meterNumber', label: 'Meter Number', placeholder: 'MTR-A1-001' },
                { key: 'meterSerial', label: 'Serial Number', placeholder: 'SN-12345' },
                { key: 'houseNumber', label: 'House Number', placeholder: 'A1' },
                { key: 'installationDate', label: 'Installation Date', type: 'date' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key} className="fg">
                  <label className="lbl">{label}</label>
                  <input
                    type={type || 'text'}
                    value={(newMeter as any)[key]}
                    onChange={e => setNewMeter(d => ({ ...d, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="inp"
                  />
                </div>
              ))}

              <div className="fg">
                <label className="lbl">Assign to Resident</label>
                <select
                  value={newMeter.residentId}
                  onChange={e => setNewMeter(d => ({ ...d, residentId: e.target.value }))}
                  className="sel"
                >
                  <option value="">-- Select resident --</option>
                  {residentsData?.residents?.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName} ({r.houseNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => addMutation.mutate(newMeter)}
                disabled={addMutation.isPending || !newMeter.meterNumber || !newMeter.houseNumber}
                className="btn bp"
              >
                {addMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                Add Meter
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn bg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Reading Modal */}
      {showReadingModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <div className="s-hd" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', marginBottom: 0, fontFamily: 'var(--f1)' }}>
                Record Meter Reading
              </h2>
              <button
                onClick={() => setShowReadingModal(null)}
                className="btn-icon bg"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                padding: '12px',
                borderRadius: '9px',
                background: 'var(--c2)',
                border: '1px solid var(--bd)',
                marginBottom: '16px',
              }}
            >
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>
                {showReadingModal.meterNumber}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '2px' }}>
                House {showReadingModal.houseNumber} · {showReadingModal.resident?.fullName}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '4px' }}>
                Previous reading: <strong>{showReadingModal.currentReading}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div className="fg">
                <label className="lbl">Billing Month</label>
                <input
                  type="month"
                  value={readingData.billingMonth}
                  onChange={e => setReadingData(d => ({ ...d, billingMonth: e.target.value }))}
                  className="inp"
                />
              </div>

              <div className="fg">
                <label className="lbl">New Current Reading</label>
                <input
                  type="number"
                  value={readingData.currentReading}
                  onChange={e => setReadingData(d => ({ ...d, currentReading: e.target.value }))}
                  placeholder={`Greater than ${showReadingModal.currentReading}`}
                  min={showReadingModal.currentReading}
                  className="inp"
                />
                {readingData.currentReading && parseFloat(readingData.currentReading) > showReadingModal.currentReading && (
                  <p style={{ fontSize: '11px', color: 'var(--ok)', marginTop: '6px', fontWeight: 600 }}>
                    Units consumed: {(parseFloat(readingData.currentReading) - showReadingModal.currentReading).toFixed(2)} → Bill: KES {((parseFloat(readingData.currentReading) - showReadingModal.currentReading) * 250).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => addReadingMutation.mutate({ meterId: showReadingModal.id, ...readingData })}
                disabled={addReadingMutation.isPending || !readingData.currentReading || parseFloat(readingData.currentReading) <= showReadingModal.currentReading}
                className="btn bp"
              >
                {addReadingMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                Save Reading
              </button>
              <button
                onClick={() => setShowReadingModal(null)}
                className="btn bg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
