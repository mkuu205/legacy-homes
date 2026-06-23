'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { MessageSquare, Search, Send, Loader2, X } from 'lucide-react';

export default function AdminSupportPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tickets', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/support?${params}`);
      return res.data.data;
    },
  });

  const { data: ticketDetail } = useQuery({
    queryKey: ['ticket-detail', selectedTicket?.id],
    queryFn: async () => {
      const res = await api.get(`/support/${selectedTicket.id}`);
      return res.data.data;
    },
    enabled: !!selectedTicket,
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const res = await api.post(`/support/${id}/reply`, { message });
      return res.data.data;
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Reply sent!' });
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['ticket-detail', selectedTicket?.id] });
    },
    onError: (error) => toast({ type: 'error', title: 'Failed', description: getErrorMessage(error) }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/support/${id}/status`, { status });
      return res.data.data;
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Status updated!' });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-detail', selectedTicket?.id] });
    },
  });

  const statusColors: Record<string, string> = {
    OPEN: 'var(--in)',
    PENDING: '#fbbf24',
    RESOLVED: 'var(--ok)',
    CLOSED: 'var(--t2)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fu">
      {/* Header */}
      <div>
        <h1 className="pg-h">Support Tickets</h1>
        <p className="pg-sh">{data?.pagination?.total || 0} total tickets</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="sm:flex-row">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search tickets..."
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
          <option value="OPEN">Open</option>
          <option value="PENDING">Pending</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Two Column Layout */}
      <div className="g2">
        {/* Ticket List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--bd)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div className="skeleton" style={{ height: '16px', borderRadius: '4px', width: '60%' }} />
                  <div className="skeleton" style={{ height: '12px', borderRadius: '4px', width: '80%' }} />
                </div>
              ))
            ) : data?.tickets?.length === 0 ? (
              <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                <MessageSquare size={40} style={{ color: 'var(--t2)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                <p style={{ fontSize: '12px', color: 'var(--t2)' }}>No tickets found</p>
              </div>
            ) : (
              data?.tickets?.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--bd)',
                    background: selectedTicket?.id === t.id ? 'rgba(0, 198, 167, 0.08)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTicket?.id !== t.id) {
                      e.currentTarget.style.background = 'rgba(0, 198, 167, 0.03)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTicket?.id !== t.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>
                        {t.subject}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '4px' }}>
                        {t.resident?.fullName} · {t.ticketId}
                      </p>
                    </div>
                    <div
                      className="badge"
                      style={{
                        background: `${statusColors[t.status]}20`,
                        color: statusColors[t.status],
                        fontSize: '10px',
                        flexShrink: 0,
                      }}
                    >
                      {t.status}
                    </div>
                  </div>
                  <p style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '6px' }}>
                    {t.category} · {new Date(t.updatedAt).toLocaleDateString('en-KE')} · {t.replies?.length || 0} replies
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Ticket Detail */}
        {selectedTicket ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '600px' }}>
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                borderBottom: '1px solid var(--bd)',
              }}
            >
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t1)', fontFamily: 'var(--f1)' }}>
                  {ticketDetail?.subject || selectedTicket.subject}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '4px' }}>
                  {selectedTicket.ticketId} · {selectedTicket.resident?.fullName}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={ticketDetail?.status || selectedTicket.status}
                  onChange={e => updateStatusMutation.mutate({ id: selectedTicket.id, status: e.target.value })}
                  className="sel"
                  style={{ minWidth: '100px', fontSize: '11px', padding: '6px 8px' }}
                >
                  <option value="OPEN">Open</option>
                  <option value="PENDING">Pending</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="btn-icon bg"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '9px',
                  background: 'var(--c2)',
                  border: '1px solid var(--bd)',
                  fontSize: '12px',
                  color: 'var(--t1)',
                  lineHeight: 1.5,
                }}
              >
                {ticketDetail?.description || selectedTicket.description}
              </div>

              {ticketDetail?.replies?.map((r: any) => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexDirection: r.isAdmin ? 'row-reverse' : 'row',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '7px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '11px',
                      fontWeight: 700,
                      background: r.isAdmin ? 'var(--ac)' : 'var(--c2)',
                      color: r.isAdmin ? 'white' : 'var(--t1)',
                      fontFamily: 'var(--f1)',
                    }}
                  >
                    {r.user?.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <div
                    style={{
                      maxWidth: '280px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      background: r.isAdmin ? 'var(--ac)' : 'var(--c2)',
                      color: r.isAdmin ? 'white' : 'var(--t1)',
                      borderTopRightRadius: r.isAdmin ? '2px' : '8px',
                      borderTopLeftRadius: r.isAdmin ? '8px' : '2px',
                      lineHeight: 1.4,
                    }}
                  >
                    <p>{r.message}</p>
                    <p style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
                      {new Date(r.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '12px 16px',
                borderTop: '1px solid var(--bd)',
              }}
            >
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && replyText.trim() && replyMutation.mutate({ id: selectedTicket.id, message: replyText })}
                placeholder="Type your reply..."
                className="inp"
                style={{ flex: 1, fontSize: '12px', padding: '8px 12px' }}
              />
              <button
                onClick={() => replyText.trim() && replyMutation.mutate({ id: selectedTicket.id, message: replyText })}
                disabled={replyMutation.isPending || !replyText.trim()}
                className="btn bp"
                style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {replyMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            <div style={{ textAlign: 'center' }}>
              <MessageSquare size={40} style={{ color: 'var(--t2)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
              <p style={{ fontSize: '12px', color: 'var(--t2)' }}>Select a ticket to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
