'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Smartphone, CreditCard, Loader2, Plus } from 'lucide-react';
import { toast } from '@/components/ui/toaster';

export default function PaymentMethodsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  
  const billId = params.get('billId');
  const amount = params.get('amount');

  const [selectedMethod, setSelectedMethod] = useState<'MPESA_STK_PUSH' | 'CARD_PAYMENT' | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [detectedCardBrand, setDetectedCardBrand] = useState<'VISA' | 'MASTERCARD' | null>(null);
  const [cardNumber, setCardNumber] = useState('');

  const { data: savedCards, isLoading: cardsLoading } = useQuery({
    queryKey: ['saved-cards'],
    queryFn: async () => {
      const res = await api.get('/payment-methods');
      return res.data.data || [];
    },
  });

  // Detect card brand automatically
  const detectCardBrand = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) {
      setDetectedCardBrand('VISA');
    } else if (/^5[1-5]/.test(cleaned)) {
      setDetectedCardBrand('MASTERCARD');
    } else {
      setDetectedCardBrand(null);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const formatted = value.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
    detectCardBrand(value);
  };

  const initiatePaymentMutation = useMutation({
    mutationFn: async (method: 'MPESA_STK_PUSH' | 'CARD_PAYMENT') => {
      if (!billId || !amount) {
        throw new Error('Missing bill information');
      }

      const res = await api.post('/payments/initiate', {
        billId,
        amount: parseFloat(amount),
        paymentMethod: method,
        provider: method === 'MPESA_STK_PUSH' ? 'TUMA' : 'PESAPAL',
      });

      return res.data.data;
    },
    onSuccess: (data, method) => {
      if (method === 'MPESA_STK_PUSH') {
        router.push(`/dashboard/payments?paymentId=${data.paymentId}&status=PENDING`);
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Payment failed', description: getErrorMessage(err) });
    },
  });

  const hasSavedCards = savedCards && savedCards.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={() => router.back()} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bd)', color: 'var(--t1)', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="pg-h" style={{ fontSize: '24px', marginBottom: '4px' }}>Choose Payment Method</h1>
          <p className="pg-sh">Select your preferred payment method</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* M-Pesa STK Push */}
        <div style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 201, 167, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00C9A7' }}>
              <Smartphone size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>M-Pesa STK Push</h3>
              <p style={{ fontSize: '12px', color: 'var(--t3)', margin: 0 }}>Fast and secure</p>
            </div>
          </div>
          <ul style={{ fontSize: '13px', color: 'var(--t2)', paddingLeft: '20px', margin: 0 }}>
            <li style={{ marginBottom: '4px' }}>Fast and secure payment using Safaricom M-Pesa.</li>
            <li>Recommended for most users.</li>
          </ul>
          <button
            onClick={() => initiatePaymentMutation.mutate('MPESA_STK_PUSH')}
            disabled={initiatePaymentMutation.isPending}
            style={{ marginTop: 'auto', padding: '12px', borderRadius: '8px', background: '#00C9A7', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {initiatePaymentMutation.isPending && selectedMethod === 'MPESA_STK_PUSH' ? <Loader2 size={18} className="animate-spin" /> : 'Continue'}
          </button>
        </div>

        {/* Card Payment */}
        <div style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(20, 52, 203, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1434CB' }}>
              <CreditCard size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>Card Payment</h3>
              <p style={{ fontSize: '12px', color: 'var(--t3)', margin: 0 }}>Visa or Mastercard</p>
            </div>
          </div>
          <ul style={{ fontSize: '13px', color: 'var(--t2)', paddingLeft: '20px', margin: 0 }}>
            <li style={{ marginBottom: '4px' }}>Secure payment through Pesapal.</li>
            <li style={{ marginBottom: '4px' }}>Card type detected automatically.</li>
            <li>Do not choose Visa or Mastercard manually.</li>
          </ul>

          {hasSavedCards && !showCardForm ? (
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => initiatePaymentMutation.mutate('CARD_PAYMENT')}
                style={{ padding: '12px', borderRadius: '8px', background: '#1434CB', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Use Saved Card
              </button>
              <button
                onClick={() => setShowCardForm(true)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'transparent', color: 'var(--t1)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Plus size={16} /> Use Another Card
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>Card Number</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    maxLength={19}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c1)', color: 'var(--t1)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                  {detectedCardBrand && (
                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: '#1434CB' }}>
                      {detectedCardBrand}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => initiatePaymentMutation.mutate('CARD_PAYMENT')}
                disabled={initiatePaymentMutation.isPending || !cardNumber}
                style={{ padding: '12px', borderRadius: '8px', background: '#1434CB', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {initiatePaymentMutation.isPending && selectedMethod === 'CARD_PAYMENT' ? <Loader2 size={18} className="animate-spin" /> : 'Continue'}
              </button>
              {showCardForm && (
                <button
                  onClick={() => setShowCardForm(false)}
                  style={{ padding: '8px', background: 'none', border: 'none', color: 'var(--t3)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {hasSavedCards && (
        <button
          onClick={() => initiatePaymentMutation.mutate('MPESA_STK_PUSH')}
          style={{ alignSelf: 'center', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'transparent', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer' }}
        >
          Use M-Pesa Instead
        </button>
      )}
    </div>
  );
}
