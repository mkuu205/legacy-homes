'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { Users, Plus, Search, Eye, Edit, Loader2, X, Trash2, AlertTriangle, Key, UserX, UserCheck, ChevronLeft, ChevronRight, CreditCard, FileText, Download } from 'lucide-react';

export default function AdminResidentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newResident, setNewResident] = useState({ fullName: '', email: '', phone: '', houseNumber: '', password: 'Resident@2024!', nationalId: '' });
  const [selectedResident, setSelectedResident] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<any>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState<{ type: 'bills' | 'payments'; resident: any } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-residents', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/residents?${params}`);
      return res.data.data;
    },
  });

  const residents = data?.residents || [];
  const pagination = data?.pagination;

  const historyQuery = useQuery({
    queryKey: ['resident-history', showHistoryModal?.type, showHistoryModal?.resident?.id],
    queryFn: async () => {
      if (!showHistoryModal) return null;
      const { type, resident } = showHistoryModal;
      if (type === 'bills') {
        const res = await api.get(`/billing/statement/${resident.id}`);
        return res.data.data;
      } else {
        const res = await api.get(`/payments?residentId=${resident.id}&limit=50`);
        return res.data.data;
      }
    },
    enabled: !!showHistoryModal,
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof newResident) => {
      const res = await api.post('/residents', data);
      return res.data.data;
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Resident added successfully!' });
      setShowAddModal(false);
      setNewResident({ fullName: '', email: '', phone: '', houseNumber: '', password: 'Resident@2024!', nationalId: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-residents'] });
    },
    onError: (error) => toast({ type: 'error', title: 'Failed to add resident', description: getErrorMessage(error) }),
  });

  const editMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.put(`/residents/${data.id}`, { fullName: data.fullName, phone: data.phone });
      const res = await api.patch(`/residents/${data.id}/status`, { status: data.accountStatus });
      return res.data.data;
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Resident updated!' });
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ['admin-residents'] });
    },
    onError: (error) => toast({ type: 'error', title: 'Update failed', description: getErrorMessage(error) }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/residents/${id}/status`, { status });
      return res.data.data;
    },
    onSuccess: (_, vars) => {
      toast({ type: 'success', title: `Resident ${vars.status === 'SUSPENDED' ? 'suspended' : 'activated'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['admin-residents'] });
    },
    onError: (err) => toast({ type: 'error', title: 'Failed', description: getErrorMessage(err) }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/residents/${id}`); },
    onSuccess: () => {
      toast({ type: 'success', title: 'Resident deleted' });
      setShowDeleteModal(null);
      queryClient.invalidateQueries({ queryKey: ['admin-residents'] });
    },
    onError: (err) => toast({ type: 'error', title: 'Delete failed', description: getErrorMessage(err) }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      const res = await api.post(`/residents/${id}/reset-password`, { newPassword });
      return res.data;
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Password reset successfully' });
      setShowResetPasswordModal(null);
      setNewPassword('');
    },
    onError: (err) => toast({ type: 'error', title: 'Reset failed', description: getErrorMessage(err) }),
  });

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/residents/export/csv', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'residents.csv'; a.click();
      URL.revokeObjectURL(url);
      toast({ type: 'success', title: 'Residents CSV exported' });
    } catch (err) {
      toast({ type: 'error', title: 'Export failed', description: getErrorMessage(err) });
    }
  };

  const statusColors: Record<string, { bg: string; color: string }> = {
    ACTIVE: { bg: 'rgba(16, 185, 129, 0.14)', color: '#34d399' },
    SUSPENDED: { bg: 'rgba(239, 68, 68, 0.14)', color: '#f87171' },
    INACTIVE: { bg: 'rgba(124, 154, 184, 0.14)', color: 'var(--t2)' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fu">
      {/* Header */}
      <div className="s-hd" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="pg-h">Residents</h1>
          <p className="pg-sh">{pagination?.total || 0} total residents</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExportCSV} className="btn bs btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn bp btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Add Resident
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search residents..." className="inp" style={{ paddingLeft: '40px' }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="sel" style={{ minWidth: '140px' }}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--ac)' }} />
          </div>
        ) : residents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--t2)' }}>
            <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>No residents found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                  {['Resident', 'Account #', 'House', 'Phone', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {residents.map((resident: any) => {
                  const sc = statusColors[resident.accountStatus] || statusColors.INACTIVE;
                  return (
                    <tr key={resident.id} style={{ borderBottom: '1px solid var(--bd)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--c2)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--gl)', border: '1px solid rgba(0,198,167,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'var(--ac)', flexShrink: 0 }}>
                            {resident.profilePicture ? <img src={resident.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '7px' }} /> : resident.fullName?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>{resident.fullName}</p>
                            <p style={{ fontSize: '11px', color: 'var(--t2)' }}>{resident.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--ac)', fontFamily: 'monospace' }}>{resident.accountNumber}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t2)' }}>{resident.houseNumber || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t2)' }}>{resident.phone || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: sc.color, background: sc.bg }}>
                          {resident.accountStatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t2)', whiteSpace: 'nowrap' }}>{new Date(resident.createdAt).toLocaleDateString('en-KE')}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <button onClick={() => { setSelectedResident(resident); setShowViewModal(true); }} title="View" style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--bd)', background: 'var(--c2)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--t2)' }}>
                            <Eye size={12} />
                          </button>
                          <button onClick={() => { setSelectedResident(resident); setEditData({ ...resident }); setShowEditModal(true); }} title="Edit" style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(0,198,167,0.3)', background: 'rgba(0,198,167,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--ac)' }}>
                            <Edit size={12} />
                          </button>
                          <button onClick={() => { setShowHistoryModal({ type: 'bills', resident }); }} title="View Bills" style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--bd)', background: 'var(--c2)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--t2)' }}>
                            <FileText size={12} />
                          </button>
                          <button onClick={() => { setShowHistoryModal({ type: 'payments', resident }); }} title="View Payments" style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--bd)', background: 'var(--c2)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--t2)' }}>
                            <CreditCard size={12} />
                          </button>
                          <button onClick={() => { setShowResetPasswordModal(resident); }} title="Reset Password" style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#fbbf24' }}>
                            <Key size={12} />
                          </button>
                          {resident.accountStatus === 'ACTIVE' ? (
                            <button onClick={() => statusMutation.mutate({ id: resident.id, status: 'SUSPENDED' })} title="Suspend" style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ef4444' }}>
                              <UserX size={12} />
                            </button>
                          ) : (
                            <button onClick={() => statusMutation.mutate({ id: resident.id, status: 'ACTIVE' })} title="Activate" style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#34d399' }}>
                              <UserCheck size={12} />
                            </button>
                          )}
                          <button onClick={() => setShowDeleteModal(resident)} title="Delete" style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ef4444' }}>
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

      {/* Add Resident Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)' }}>Add New Resident</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Full Name', key: 'fullName', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Phone', key: 'phone', type: 'tel' },
                { label: 'House Number', key: 'houseNumber', type: 'text' },
                { label: 'National ID', key: 'nationalId', type: 'text' },
                { label: 'Initial Password', key: 'password', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key} className="fg">
                  <label className="lbl">{label}</label>
                  <input type={type} value={(newResident as any)[key]} onChange={e => setNewResident(d => ({ ...d, [key]: e.target.value }))} className="inp" />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button onClick={() => setShowAddModal(false)} className="btn bs" style={{ flex: 1 }}>Cancel</button>
                <button onClick={() => addMutation.mutate(newResident)} disabled={addMutation.isPending} className="btn bp" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  {addMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                  Add Resident
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Resident Modal */}
      {showViewModal && selectedResident && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)' }}>Resident Details</h3>
              <button onClick={() => setShowViewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                ['Full Name', selectedResident.fullName],
                ['Email', selectedResident.email],
                ['Phone', selectedResident.phone || '—'],
                ['Account Number', selectedResident.accountNumber],
                ['House Number', selectedResident.houseNumber || '—'],
                ['National ID', selectedResident.nationalId || '—'],
                ['Status', selectedResident.accountStatus],
                ['Email Verified', selectedResident.emailVerified ? 'Yes' : 'No'],
                ['Joined', new Date(selectedResident.createdAt).toLocaleDateString('en-KE')],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bd)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--t2)' }}>{label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => { setShowViewModal(false); setShowHistoryModal({ type: 'bills', resident: selectedResident }); }} className="btn bs btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <FileText size={12} /> View Bills
              </button>
              <button onClick={() => { setShowViewModal(false); setShowHistoryModal({ type: 'payments', resident: selectedResident }); }} className="btn bs btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <CreditCard size={12} /> View Payments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Resident Modal */}
      {showEditModal && editData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)' }}>Edit Resident</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="fg">
                <label className="lbl">Full Name</label>
                <input value={editData.fullName} onChange={e => setEditData((d: any) => ({ ...d, fullName: e.target.value }))} className="inp" />
              </div>
              <div className="fg">
                <label className="lbl">Phone</label>
                <input value={editData.phone || ''} onChange={e => setEditData((d: any) => ({ ...d, phone: e.target.value }))} className="inp" />
              </div>
              <div className="fg">
                <label className="lbl">Account Status</label>
                <select value={editData.accountStatus} onChange={e => setEditData((d: any) => ({ ...d, accountStatus: e.target.value }))} className="sel">
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowEditModal(false)} className="btn bs" style={{ flex: 1 }}>Cancel</button>
                <button onClick={() => editMutation.mutate(editData)} disabled={editMutation.isPending} className="btn bp" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  {editMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ maxWidth: '380px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)' }}>Reset Password</h3>
              <button onClick={() => { setShowResetPasswordModal(null); setNewPassword(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '12px' }}>
              Reset password for <strong style={{ color: 'var(--t1)' }}>{showResetPasswordModal.fullName}</strong>
            </p>
            <div className="fg" style={{ marginBottom: '16px' }}>
              <label className="lbl">New Password</label>
              <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="inp" placeholder="Enter new password" />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowResetPasswordModal(null); setNewPassword(''); }} className="btn bs" style={{ flex: 1 }}>Cancel</button>
              <button onClick={() => resetPasswordMutation.mutate({ id: showResetPasswordModal.id, newPassword })} disabled={!newPassword || resetPasswordMutation.isPending} className="btn bp" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {resetPasswordMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Key size={14} />}
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Resident Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ maxWidth: '380px', width: '100%', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)' }}>Delete Resident</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '16px' }}>
              Are you sure you want to permanently delete <strong style={{ color: 'var(--t1)' }}>{showDeleteModal.fullName}</strong>? All their bills, payments, and notifications will be removed.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowDeleteModal(null)} className="btn bs" style={{ flex: 1 }}>Cancel</button>
              <button onClick={() => deleteMutation.mutate(showDeleteModal.id)} disabled={deleteMutation.isPending} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {deleteMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ maxWidth: '640px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)' }}>
                {showHistoryModal.type === 'bills' ? 'Bill History' : 'Payment History'} — {showHistoryModal.resident.fullName}
              </h3>
              <button onClick={() => setShowHistoryModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)' }}><X size={18} /></button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {historyQuery.isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--ac)' }} />
                </div>
              ) : showHistoryModal.type === 'bills' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(historyQuery.data?.bills || []).map((bill: any) => (
                    <div key={bill.id} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ac)' }}>{bill.billNumber}</span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: bill.status === 'PAID' ? 'rgba(16,185,129,0.14)' : 'rgba(248,113,113,0.14)', color: bill.status === 'PAID' ? '#34d399' : '#f87171', fontWeight: 600 }}>{bill.status}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--t2)' }}>{bill.billingMonth}</span>
                        <span style={{ fontSize: '12px', color: 'var(--t1)', fontWeight: 600 }}>KES {Number(bill.totalAmount).toLocaleString()}</span>
                        <span style={{ fontSize: '12px', color: bill.balance > 0 ? '#f87171' : 'var(--t2)' }}>Balance: KES {Number(bill.balance).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  {(historyQuery.data?.bills || []).length === 0 && <p style={{ textAlign: 'center', color: 'var(--t2)', padding: '24px' }}>No bills found</p>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(historyQuery.data?.payments || []).map((payment: any) => (
                    <div key={payment.id} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--ac)' }}>{payment.paymentId}</span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: payment.status === 'SUCCESSFUL' ? 'rgba(16,185,129,0.14)' : 'rgba(248,113,113,0.14)', color: payment.status === 'SUCCESSFUL' ? '#34d399' : '#f87171', fontWeight: 600 }}>{payment.status}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#34d399' }}>KES {Number(payment.amount).toLocaleString()}</span>
                        {payment.mpesaReceiptCode && <span style={{ fontSize: '12px', color: 'var(--t2)', fontFamily: 'monospace' }}>{payment.mpesaReceiptCode}</span>}
                        <span style={{ fontSize: '12px', color: 'var(--t2)' }}>{new Date(payment.createdAt).toLocaleDateString('en-KE')}</span>
                      </div>
                    </div>
                  ))}
                  {(historyQuery.data?.payments || []).length === 0 && <p style={{ textAlign: 'center', color: 'var(--t2)', padding: '24px' }}>No payments found</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
