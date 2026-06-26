'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Shield, Clock, Smartphone, CreditCard, Trash2, Star, Plus, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toaster';

export default function PaymentMethodsPage() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMethod, setNewMethod] = useState({ provider: 'TUMA', methodType: 'MPESA_STK', phoneNumber: '', displayName: '' });

  const { data: savedMethods, isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await api.get('/payment-methods');
      return res.data.data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/payment-methods', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      setShowAddForm(false);
      setNewMethod({ provider: 'TUMA', methodType: 'MPESA_STK', phoneNumber: '', displayName: '' });
      toast({ type: 'success', title: 'Payment method added' });
    },
    onError: (err) => toast({ type: 'error', title: 'Failed to add method', description: getErrorMessage(err) }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/payment-methods/${id}/default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast({ type: 'success', title: 'Default payment method updated' });
    },
    onError: (err) => toast({ type: 'error', title: 'Failed to set default', description: getErrorMessage(err) }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payment-methods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast({ type: 'success', title: 'Payment method removed' });
    },
    onError: (err) => toast({ type: 'error', title: 'Failed to remove method', description: getErrorMessage(err) }),
  });

  const availableMethods = [
    { id: 'mpesa-stk', name: 'MPESA STK Push', description: 'Pay directly from your M-Pesa account via Tuma', provider: 'Tuma', processingTime: '1-2 minutes', icon: Smartphone, color: '#00C9A7', badge: '📱' },
    { id: 'visa', name: 'Visa', description: 'Pay using your Visa card via Pesapal', provider: 'Pesapal', processingTime: '2-5 minutes', icon: CreditCard, color: '#1434CB', badge: '💳' },
    { id: 'mastercard', name: 'Mastercard', description: 'Pay using your Mastercard via Pesapal', provider: 'Pesapal', processingTime: '2-5 minutes', icon: CreditCard, color: '#EB001B', badge: '💳' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/dashboard/payments" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bd)', color: 'var(--t1)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="pg-h" style={{ fontSize: '24px', marginBottom: '4px' }}>Payment Methods</h1>
          <p className="pg-sh">Manage your saved payment methods</p>
        </div>
      </div>

      {/* Available Methods Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {availableMethods.map((method) => {
          const Icon = method.icon;
          return (
            <div key={method.id} style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${method.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                  {method.badge}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '2px' }}>{method.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--t3)' }}>Powered by {method.provider}</p>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--t2)', margin: 0 }}>{method.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--t3)' }}>
                <Clock size={14} />
                <span>{method.processingTime}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', fontSize: '12px', color: '#10b981', fontWeight: 500 }}>
                <Shield size={14} />
                <span>Secure Payment</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Saved Methods */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 className="pg-h" style={{ fontSize: '18px', marginBottom: 0 }}>Saved Payment Methods</h2>
          <button onClick={() => setShowAddForm(true)} className="btn bp btn-sm">
            <Plus size={14} /> Add Method
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="card" style={{ marginBottom: '16px', border: '1px solid var(--ac)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '16px' }}>Add Payment Method</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="fg">
                <label className="lbl">Provider</label>
                <select className="sel" value={newMethod.provider} onChange={e => setNewMethod(p => ({ ...p, provider: e.target.value }))}>
                  <option value="TUMA">Tuma (M-Pesa STK)</option>
                  <option value="PESAPAL">Pesapal (Card)</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Method Type</label>
                <select className="sel" value={newMethod.methodType} onChange={e => setNewMethod(p => ({ ...p, methodType: e.target.value }))}>
                  <option value="MPESA_STK">M-Pesa STK Push</option>
                  <option value="CARD">Card</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Phone Number</label>
                <input className="inp" type="tel" placeholder="0712345678" value={newMethod.phoneNumber} onChange={e => setNewMethod(p => ({ ...p, phoneNumber: e.target.value }))} />
              </div>
              <div className="fg">
                <label className="lbl">Display Name (optional)</label>
                <input className="inp" type="text" placeholder="e.g. My M-Pesa" value={newMethod.displayName} onChange={e => setNewMethod(p => ({ ...p, displayName: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowAddForm(false)} className="btn bs" style={{ flex: 1 }}>Cancel</button>
                <button
                  onClick={() => addMutation.mutate(newMethod)}
                  disabled={addMutation.isPending || !newMethod.phoneNumber}
                  className="btn bp"
                  style={{ flex: 1 }}
                >
                  {addMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                  Save Method
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '12px' }} />)}
          </div>
        ) : !savedMethods || savedMethods.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <CreditCard size={40} style={{ color: 'var(--t3)', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '4px' }}>No saved payment methods</p>
            <p style={{ fontSize: '12px', color: 'var(--t2)' }}>Save your payment methods for faster checkout next time</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {savedMethods.map((m: any) => (
              <div key={m.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: m.isDefault ? '1px solid var(--ac)' : '1px solid var(--bd)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Smartphone size={20} style={{ color: 'var(--ac)' }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>{m.displayName}</p>
                    <p style={{ fontSize: '11px', color: 'var(--t3)' }}>{m.provider} · {m.phoneNumber}</p>
                  </div>
                  {m.isDefault && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ac)', background: 'var(--gl)', padding: '2px 8px', borderRadius: '20px' }}>DEFAULT</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!m.isDefault && (
                    <button onClick={() => setDefaultMutation.mutate(m.id)} disabled={setDefaultMutation.isPending} title="Set as default" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: '4px' }}>
                      <Star size={16} />
                    </button>
                  )}
                  <button onClick={() => deleteMutation.mutate(m.id)} disabled={deleteMutation.isPending} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: '4px' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <Link href="/dashboard/payments" className="btn" style={{ background: 'var(--bd)', color: 'var(--t1)' }}>
          Back to Payments
        </Link>
      </div>
    </div>
  );
}
