'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { MessageSquare, Bot, Send, Plus, Loader2, Ticket, Zap, X } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function SupportPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'chat' | 'tickets'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your Legacy Homes AI assistant. I can help you with billing questions, payment status, meter readings, and more. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState({ subject: '', description: '', category: 'BILLING' });
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const isNew = searchParams.get('new') === 'true';
    if (isNew) {
      setActiveTab('tickets');
      setShowNewTicket(true);
    }
  }, [searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const res = await api.get('/support/my-tickets');
      return res.data.data;
    },
  });

  const { data: selectedTicketData } = useQuery({
    queryKey: ['ticket-detail', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      const res = await api.get(`/support/${selectedTicketId}`);
      return res.data.data;
    },
    enabled: !!selectedTicketId,
  });

  const replyMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await api.post(`/support/${selectedTicketId}/reply`, { message: text });
      return res.data.data;
    },
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['ticket-detail', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      toast({ type: 'success', title: 'Reply sent!' });
    },
    onError: (error) => toast({ type: 'error', title: 'Failed to send reply', description: getErrorMessage(error) }),
  });

  const sendMessage = async () => {
    if (!input.trim() || isChatLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
    setIsChatLoading(true);
    try {
      const res = await api.post('/ai/chat', { message: userMsg });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.data.message,
        timestamp: new Date(),
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I couldn't process your request. Please try again or create a support ticket.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const createTicketMutation = useMutation({
    mutationFn: async (data: typeof ticketForm) => {
      const res = await api.post('/support', data);
      return res.data.data;
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'Ticket created!', description: 'Our team will respond within 24 hours.' });
      setShowNewTicket(false);
      setTicketForm({ subject: '', description: '', category: 'BILLING' });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
    },
    onError: (error) => {
      toast({ type: 'error', title: 'Failed to create ticket', description: getErrorMessage(error) });
    },
  });

  const statusColors: Record<string, { color: string; bg: string }> = {
    OPEN: { color: 'var(--in)', bg: 'rgba(59, 130, 246, 0.14)' },
    PENDING: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.14)' },
    RESOLVED: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.14)' },
    CLOSED: { color: 'var(--t2)', bg: 'rgba(124, 154, 184, 0.14)' },
  };

  const quickQuestions = [
    'What is my current bill?',
    'How do I pay via M-Pesa?',
    'What is my meter reading?',
    'When is my bill due?',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fu">
      {/* Header */}
      <div>
        <h1 className="pg-h">Support</h1>
        <p className="pg-sh">Get help from our AI assistant or raise a ticket</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'chat', label: 'AI Assistant', icon: Bot },
          { id: 'tickets', label: 'My Tickets', icon: Ticket },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`tab ${activeTab === id ? 'on' : ''}`}
          >
            <Icon size={14} style={{ marginRight: '4px' }} />
            {label}
          </button>
        ))}
      </div>

      {/* AI Chat */}
      {activeTab === 'chat' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '600px', padding: 0, overflow: 'hidden' }}>
          {/* Chat header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 20px',
              borderBottom: '1px solid var(--bd)',
              background: 'linear-gradient(135deg, rgba(0, 198, 167, 0.1), rgba(0, 198, 167, 0.05))',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--gl)',
                border: '1px solid rgba(0, 198, 167, 0.25)',
              }}
            >
              <Bot size={18} style={{ color: 'var(--ac)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>Legacy Homes AI</p>
              <p style={{ fontSize: '11px', color: 'var(--ac)', marginTop: '2px' }}>Always here to help</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--ok)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ok)' }} />
              Online
            </div>
          </div>

          {/* Messages */}
          <div className="chat-msgs">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'msg-u' : 'msg-a'}>
                {msg.role === 'assistant' && <div className="ai-av"><Bot size={16} style={{ color: 'var(--ac)' }} /></div>}
                <div className={msg.role === 'user' ? 'bub-u' : 'bub-a'}>
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{msg.content}</p>
                  <p style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
                    {msg.timestamp.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="msg-a">
                <div className="ai-av"><Bot size={16} style={{ color: 'var(--ac)' }} /></div>
                <div className="bub-a" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--t2)',
                        animation: `wave 1s ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          <div
            style={{
              padding: '12px',
              borderTop: '1px solid var(--bd)',
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
            }}
          >
            {quickQuestions.map(q => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="btn-sm bg"
                style={{
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  fontSize: '11px',
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="chat-foot">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about your bill, payments, or meter..."
              className="chat-inp"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isChatLoading}
              className="btn-icon bp"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {isChatLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Tickets */}
      {activeTab === 'tickets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="s-hd">
            <p style={{ fontSize: '12px', color: 'var(--t2)' }}>
              {ticketsData?.tickets?.length || 0} ticket(s)
            </p>
            <button
              onClick={() => setShowNewTicket(!showNewTicket)}
              className="btn bp btn-sm"
            >
              <Plus size={14} />
              New Ticket
            </button>
          </div>

          {/* New ticket form */}
          {showNewTicket && (
            <div className="card">
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '16px' }}>
                Create Support Ticket
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="fg">
                  <label className="lbl">Category</label>
                  <select
                    value={ticketForm.category}
                    onChange={e => setTicketForm(f => ({ ...f, category: e.target.value }))}
                    className="sel"
                  >
                    <option value="BILLING">Billing Issue</option>
                    <option value="PAYMENT">Payment Issue</option>
                    <option value="METER">Meter Issue</option>
                    <option value="ACCOUNT">Account Issue</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="fg">
                  <label className="lbl">Subject</label>
                  <input
                    value={ticketForm.subject}
                    onChange={e => setTicketForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Brief description of your issue"
                    className="inp"
                  />
                </div>

                <div className="fg">
                  <label className="lbl">Description</label>
                  <textarea
                    value={ticketForm.description}
                    onChange={e => setTicketForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe your issue in detail..."
                    rows={4}
                    className="txa"
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => createTicketMutation.mutate(ticketForm)}
                    disabled={createTicketMutation.isPending || !ticketForm.subject || !ticketForm.description}
                    className="btn bp btn-sm"
                  >
                    {createTicketMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                    Submit Ticket
                  </button>
                  <button
                    onClick={() => setShowNewTicket(false)}
                    className="btn bg btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ticket list */}
          {ticketsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '14px' }} />
              ))}
            </div>
          ) : ticketsData?.tickets?.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
              <MessageSquare size={40} style={{ color: 'var(--t2)', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '4px' }}>
                No tickets yet
              </p>
              <p style={{ fontSize: '12px', color: 'var(--t2)' }}>
                Create a ticket if you need help
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ticketsData?.tickets?.map((ticket: any) => {
                const status = statusColors[ticket.status] || statusColors.OPEN;
                return (
                  <div 
                    key={ticket.id} 
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className="card card-hover"
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>
                            {ticket.subject}
                          </p>
                          <div
                            className="badge"
                            style={{ background: status.bg, color: status.color }}
                          >
                            {ticket.status}
                          </div>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--t3)' }}>
                          {ticket.ticketId} · {ticket.category} · {new Date(ticket.createdAt).toLocaleDateString('en-KE')}
                        </p>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--t2)', flexShrink: 0 }}>
                        {ticket.replies?.length || 0} replies
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Ticket Detail View */}
      {selectedTicketId && selectedTicketData && (
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
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="s-hd" style={{ marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', marginBottom: 0, fontFamily: 'var(--f1)' }}>
                  {selectedTicketData.subject}
                </h2>
                <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px' }}>
                  {selectedTicketData.ticketId}
                </p>
              </div>
              <button
                onClick={() => setSelectedTicketId(null)}
                className="btn-icon bg"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Ticket Details */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--bd)' }}>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 700 }}>Status</p>
                <div className="badge" style={{ background: statusColors[selectedTicketData.status]?.bg, color: statusColors[selectedTicketData.status]?.color, fontSize: '10px', marginTop: '4px' }}>
                  {selectedTicketData.status}
                </div>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 700 }}>Category</p>
                <p style={{ fontSize: '12px', color: 'var(--t1)', marginTop: '4px' }}>{selectedTicketData.category}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 700 }}>Created</p>
                <p style={{ fontSize: '12px', color: 'var(--t1)', marginTop: '4px' }}>{new Date(selectedTicketData.createdAt).toLocaleDateString('en-KE')}</p>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>Description</p>
              <p style={{ fontSize: '13px', color: 'var(--t1)', lineHeight: 1.6 }}>{selectedTicketData.description}</p>
            </div>

            {/* Replies */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--bd)' }}>
              <p style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px' }}>
                Replies ({selectedTicketData.replies?.length || 0})
              </p>
              {selectedTicketData.replies && selectedTicketData.replies.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedTicketData.replies.map((reply: any, idx: number) => (
                    <div key={idx} style={{ padding: '12px', background: 'var(--c2)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)' }}>
                          {reply.user?.fullName || 'Support Team'}
                        </p>
                        <p style={{ fontSize: '10px', color: 'var(--t3)' }}>
                          {new Date(reply.createdAt).toLocaleDateString('en-KE')}
                        </p>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.5 }}>{reply.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--t3)', textAlign: 'center', padding: '16px' }}>No replies yet</p>
              )}
            </div>

            {/* Reply Input */}
            {selectedTicketData.status !== 'CLOSED' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  className="inp"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => replyMutation.mutate(replyText)}
                  disabled={replyMutation.isPending || !replyText.trim()}
                  className="btn bp btn-sm"
                >
                  {replyMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
