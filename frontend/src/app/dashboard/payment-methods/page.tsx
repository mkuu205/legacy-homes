'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { ArrowLeft, CreditCard, Loader2, Trash2, Star, Plus, ShieldCheck } from 'lucide-react';
import { toast } from '@/components/ui/toaster';

export default function PaymentMethodsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // 1. Fetch saved payment methods
  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await api.get('/payment-methods');
      return res.data.data;
    },
  });

  // 2. Set default method mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/payment-methods/${id}/default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast({ type: 'success', title: 'Default method updated' });
    },
    onError: (err) => toast({ type: 'error', title: 'Update failed', description: getErrorMessage(err) }),
  });

  // 3. Delete method mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payment-methods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast({ type: 'success', title: 'Payment method removed' });
    },
    onError: (err) => toast({ type: 'error', title: 'Removal failed', description: getErrorMessage(err) }),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={() => router.back()} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bd)', color: 'var(--t1)', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="pg-h" style={{ fontSize: '24px', marginBottom: '4px' }}>Payment Methods</h1>
          <p className="pg-sh">Manage your saved cards and payment accounts</p>
        </div>
      </div>

      {/* Info Box */}
      <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0, 198, 167, 0.05)', border: '1px solid rgba(0, 198, 167, 0.2)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <ShieldCheck size={20} style={{ color: 'var(--ac)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: '1.5' }}>
          <strong>Secure Storage:</strong> Legacy Homes never stores your full card number or CVV. We only store a secure token from Pesapal to make your future payments faster.
        </div>
      </div>

      {/* Methods List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--ac)' }} />
          </div>
        ) : methods.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', border: '2px dashed var(--bd)', borderRadius: '16px', background: 'var(--c2)' }}>
            <CreditCard size={48} style={{ color: 'var(--t3)', marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--t1)', marginBottom: '8px' }}>No Saved Cards</h3>
            <p style={{ fontSize: '14px', color: 'var(--t3)', maxWidth: '300px', margin: '0 auto' }}>
              Your cards will appear here automatically after you complete your first successful payment via Pesapal.
            </p>
          </div>
        ) : (
          methods.map((method: any) => (
            <div 
              key={method.id} 
              style={{ 
                padding: '16px', 
                borderRadius: '14px', 
                border: '1px solid var(--bd)', 
                background: 'var(--c2)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                position: 'relative',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'var(--c1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)', border: '1px solid var(--bd)' }}>
                <CreditCard size={24} />
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>
                    {method.cardBrand} •••• {method.lastFour}
                  </h3>
                  {method.isDefault && (
                    <span style={{ fontSize: '10px', fontWeight: 700, background: 'var(--ac)', color: 'white', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      Default
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '4px 0 0 0' }}>
                  Expires {String(method.expiryMonth).padStart(2, '0')}/{method.expiryYear}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {!method.isDefault && (
                  <button 
                    onClick={() => setDefaultMutation.mutate(method.id)}
                    disabled={setDefaultMutation.isPending}
                    title="Set as default"
                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c1)', color: 'var(--t2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Star size={16} />
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (confirm('Are you sure you want to remove this card?')) {
                      deleteMutation.mutate(method.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  title="Remove card"
                  style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add New Info */}
      <div style={{ marginTop: '12px', padding: '20px', borderRadius: '16px', border: '1px solid var(--bd)', background: 'var(--c2)', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)' }}>
          <Plus size={20} />
        </div>
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--t1)', marginBottom: '4px' }}>How to add a new card?</h4>
          <p style={{ fontSize: '13px', color: 'var(--t3)', margin: 0, maxWidth: '400px' }}>
            Simply make a payment using a new card at checkout. Our system will securely save it for you after a successful transaction.
          </p>
        </div>
        <button 
          onClick={() => router.push('/dashboard/payments')}
          style={{ marginTop: '8px', padding: '10px 20px', borderRadius: '8px', background: 'var(--ac)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
        >
          Go to Payments
        </button>
      </div>
    </div>
  );
}
