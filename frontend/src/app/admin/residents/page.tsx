'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { Users, Plus, Search, Filter, Eye, Edit, MoreVertical, Loader2, X } from 'lucide-react';

export default function AdminResidentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newResident, setNewResident] = useState({
    fullName: '', email: '', phone: '', houseNumber: '', password: 'Resident@2024!', nationalId: '',
  });

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

  const [selectedResident, setSelectedResident] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const statusColors: Record<string, { bg: string; color: string }> = {
    ACTIVE: { bg: 'rgba(16, 185, 129, 0.14)', color: '#34d399' },
    SUSPENDED: { bg: 'rgba(239, 68, 68, 0.14)', color: '#f87171' },
    INACTIVE: { bg: 'rgba(124, 154, 184, 0.14)', color: 'var(--t2)' },
  };

  const handleViewResident = (resident: any) => {
    setSelectedResident(resident);
    setShowViewModal(true);
  };

  const handleEditResident = (resident: any) => {
    setSelectedResident(resident);
    setEditData({ ...resident });
    setShowEditModal(true);
  };

  const editMutation = useMutation({
    mutationFn: async (data: any) => {
      // Update basic info
      await api.put(`/residents/${data.id}`, {
        fullName: data.fullName,
        phone: data.phone,
      });
      
      // Update status separately as per backend implementation
      const res = await api.patch(`/residents/${data.id}/status`, {
        status: data.accountStatus,
      });
      
      return res.data.data;
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Resident updated successfully!' });
      setShowEditModal(false);
      setEditData(null);
      queryClient.invalidateQueries({ queryKey: ['admin-residents'] });
    },
    onError: (error) => toast({ type: 'error', title: 'Failed to update resident', description: getErrorMessage(error) }),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fu">
      {/* Header */}
      <div className="s-hd">
        <div>
          <h1 className="pg-h">Residents</h1>
          <p className="pg-sh">
            {data?.pagination?.total || 0} total residents
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn bp btn-sm"
        >
          <Plus size={14} />
          Add Resident
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="sm:flex-row">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, account number..."
            className="inp"
            style={{ paddingLeft: '40px' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="sel"
          style={{ minWidth: '160px' }}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bd)', background: 'var(--c2)' }}>
                {['Resident', 'Account No.', 'House', 'Phone', 'Status', 'Joined', 'Actions'].map(h => (
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
              ) : data?.residents?.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center' }}>
                    <Users size={40} style={{ color: 'var(--t2)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                    <p style={{ fontSize: '12px', color: 'var(--t2)' }}>No residents found</p>
                  </td>
                </tr>
              ) : (
                data?.residents?.map((r: any) => {
                  const s = statusColors[r.accountStatus] || statusColors.INACTIVE;
                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid var(--bd)',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 198, 167, 0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              background: 'var(--gl)',
                              border: '1px solid rgba(0, 198, 167, 0.25)',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: 'var(--ac)',
                              fontFamily: 'var(--f1)',
                            }}
                          >
                            {r.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>
                              {r.fullName}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {r.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--t1)' }}>
                        {r.accountNumber}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t1)' }}>
                        {r.houseNumber || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t1)' }}>
                        {r.phone}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="badge" style={{ background: s.bg, color: s.color, fontSize: '10px' }}>
                          {r.accountStatus}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--t2)' }}>
                        {new Date(r.createdAt).toLocaleDateString('en-KE')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button 
                            onClick={() => handleViewResident(r)}
                            className="btn-icon bg" 
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            onClick={() => handleEditResident(r)}
                            className="btn-icon bg" 
                            title="Edit"
                          >
                            <Edit size={14} />
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
                onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
                disabled={page === data.pagination.pages}
                className="btn bg btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Resident Modal */}
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
          <div className="card" style={{ width: '100%', maxWidth: '512px' }}>
            <div className="s-hd" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', marginBottom: 0, fontFamily: 'var(--f1)' }}>
                Add New Resident
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
                { key: 'fullName', label: 'Full Name', placeholder: 'John Kamau' },
                { key: 'email', label: 'Email', placeholder: 'john@example.com', type: 'email' },
                { key: 'phone', label: 'Phone', placeholder: '0712345678' },
                { key: 'houseNumber', label: 'House Number', placeholder: 'A1' },
                { key: 'nationalId', label: 'National ID (optional)', placeholder: '12345678' },
                { key: 'password', label: 'Temporary Password', placeholder: 'Resident@2024!' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key} className="fg">
                  <label className="lbl">{label}</label>
                  <input
                    type={type || 'text'}
                    value={(newResident as any)[key]}
                    onChange={e => setNewResident(d => ({ ...d, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="inp"
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => addMutation.mutate(newResident)}
                disabled={addMutation.isPending || !newResident.fullName || !newResident.email || !newResident.phone || !newResident.houseNumber}
                className="btn bp"
              >
                {addMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                Add Resident
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

      {/* View Resident Modal */}
      {showViewModal && selectedResident && (
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
          <div className="card" style={{ width: '100%', maxWidth: '512px' }}>
            <div className="s-hd" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', marginBottom: 0, fontFamily: 'var(--f1)' }}>
                Resident Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="btn-icon bg"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 700 }}>Full Name</p>
                <p style={{ fontSize: '13px', color: 'var(--t1)', marginTop: '4px' }}>{selectedResident.fullName}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 700 }}>Email</p>
                <p style={{ fontSize: '13px', color: 'var(--t1)', marginTop: '4px' }}>{selectedResident.email}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 700 }}>Phone</p>
                <p style={{ fontSize: '13px', color: 'var(--t1)', marginTop: '4px' }}>{selectedResident.phone}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 700 }}>Account Number</p>
                <p style={{ fontSize: '13px', color: 'var(--t1)', marginTop: '4px', fontFamily: 'monospace' }}>{selectedResident.accountNumber}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 700 }}>House Number</p>
                <p style={{ fontSize: '13px', color: 'var(--t1)', marginTop: '4px' }}>{selectedResident.houseNumber}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 700 }}>Status</p>
                <div style={{ marginTop: '4px' }}>
                  <div className="badge" style={{ background: statusColors[selectedResident.accountStatus]?.bg, color: statusColors[selectedResident.accountStatus]?.color, fontSize: '10px' }}>
                    {selectedResident.accountStatus}
                  </div>
                </div>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 700 }}>Joined</p>
                <p style={{ fontSize: '13px', color: 'var(--t1)', marginTop: '4px' }}>{new Date(selectedResident.createdAt).toLocaleDateString('en-KE')}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleEditResident(selectedResident)}
                className="btn bp"
              >
                Edit Resident
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="btn bg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Resident Modal */}
      {showEditModal && editData && (
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
          <div className="card" style={{ width: '100%', maxWidth: '512px' }}>
            <div className="s-hd" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', marginBottom: 0, fontFamily: 'var(--f1)' }}>
                Edit Resident
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="btn-icon bg"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div className="fg">
                <label className="lbl">Full Name</label>
                <input
                  type="text"
                  value={editData.fullName}
                  onChange={e => setEditData({ ...editData, fullName: e.target.value })}
                  className="inp"
                />
              </div>
              <div className="fg">
                <label className="lbl">Phone</label>
                <input
                  type="text"
                  value={editData.phone}
                  onChange={e => setEditData({ ...editData, phone: e.target.value })}
                  className="inp"
                />
              </div>
              <div className="fg">
                <label className="lbl">Account Status</label>
                <select
                  value={editData.accountStatus}
                  onChange={e => setEditData({ ...editData, accountStatus: e.target.value })}
                  className="sel"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => editMutation.mutate(editData)}
                disabled={editMutation.isPending}
                className="btn bp"
              >
                {editMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                Save Changes
              </button>
              <button
                onClick={() => setShowEditModal(false)}
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
