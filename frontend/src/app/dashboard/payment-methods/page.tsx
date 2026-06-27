'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { ArrowLeft, Smartphone, CreditCard, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toaster';

export default function PaymentMethodsPage() {
  const router = useRouter();
  const params = useSearchParams();
  
  const billId = params.get('billId');
  const amount = params.get('amount');

  const [selectedMethod, setSelectedMethod] = useState<'MPESA_STK_PUSH' | 'CARD_PAYMENT' | null>(null);

  const initiatePaymentMutation = useMutation({
    mutationFn: async (method: 'MPESA_STK_PUSH' | 'CARD_PAYMENT') => {
      if (!billId || !amount) {
        throw new Error('Missing bill information');
      }

      setSelectedMethod(method);

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
        // Redirect to the status tracking page
        router.push(`/dashboard/payments?paymentId=${data.paymentId}&status=PENDING`);
      } else if (data.checkoutUrl) {
        // Redirect to Pesapal as per spec
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (err) => {
      toast({ type: 'error', title: 'Payment failed', description: getErrorMessage(err) });
      setSelectedMethod(null);
    },
  });

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
          <p style={{ fontSize: '13px', color: 'var(--t2)', margin: 0 }}>
            Pay securely using Safaricom M-Pesa STK Push. You will receive a prompt on your phone to enter your PIN.
          </p>
          <button
            onClick={() => initiatePaymentMutation.mutate('MPESA_STK_PUSH')}
            disabled={initiatePaymentMutation.isPending}
            style={{ marginTop: 'auto', padding: '12px', borderRadius: '8px', background: '#00C9A7', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {initiatePaymentMutation.isPending && selectedMethod === 'MPESA_STK_PUSH' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              'Pay with M-Pesa'
            )}
          </button>
        </div>

        {/* Card Payment (Pesapal Redirect) */}
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
          <p style={{ fontSize: '13px', color: 'var(--t2)', margin: 0 }}>
            Pay using your Credit or Debit card. You will be redirected to Pesapal's secure payment gateway to complete your transaction.
          </p>
          <button
            onClick={() => initiatePaymentMutation.mutate('CARD_PAYMENT')}
            disabled={initiatePaymentMutation.isPending}
            style={{ marginTop: 'auto', padding: '12px', borderRadius: '8px', background: '#1434CB', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {initiatePaymentMutation.isPending && selectedMethod === 'CARD_PAYMENT' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              'Pay with Card'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
