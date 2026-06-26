'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Shield, Clock, Smartphone, CreditCard } from 'lucide-react';

export default function PaymentMethodsPage() {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const { data: methods, isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await api.get('/payments/methods');
      return res.data.data || [];
    },
  });

  const paymentMethods = [
    {
      id: 'mpesa-stk',
      name: 'MPESA STK Push',
      description: 'Pay directly from your M-Pesa account',
      provider: 'Tuma',
      processingTime: '1-2 minutes',
      icon: Smartphone,
      color: '#00C9A7',
      badge: '📱',
    },
    {
      id: 'buy-goods',
      name: 'Buy Goods STK Push',
      description: 'Alternative M-Pesa payment method',
      provider: 'PayHero',
      processingTime: '1-2 minutes',
      icon: Smartphone,
      color: '#FF6B35',
      badge: '📱',
    },
    {
      id: 'visa',
      name: 'Visa',
      description: 'Pay using your Visa card',
      provider: 'Pesapal',
      processingTime: '2-5 minutes',
      icon: CreditCard,
      color: '#1434CB',
      badge: '💳',
    },
    {
      id: 'mastercard',
      name: 'Mastercard',
      description: 'Pay using your Mastercard',
      provider: 'Pesapal',
      processingTime: '2-5 minutes',
      icon: CreditCard,
      color: '#EB001B',
      badge: '💳',
    },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="skeleton" style={{ height: '32px', width: '200px', borderRadius: '12px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '200px', borderRadius: '14px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/dashboard/payments" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bd)', color: 'var(--t1)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="pg-h" style={{ fontSize: '24px', marginBottom: '4px' }}>
            Payment Methods
          </h1>
          <p className="pg-sh">Choose your preferred payment method</p>
        </div>
      </div>

      {/* Payment Methods Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;

          return (
            <div
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              style={{
                padding: '20px',
                borderRadius: '14px',
                border: isSelected ? `2px solid ${method.color}` : '1px solid var(--bd)',
                background: isSelected ? `${method.color}08` : 'var(--c2)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
              className="card-hover"
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: `${method.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                    }}
                  >
                    {method.badge}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '2px' }}>
                      {method.name}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--t3)' }}>
                      Powered by {method.provider}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: method.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    ✓
                  </div>
                )}
              </div>

              {/* Description */}
              <p style={{ fontSize: '13px', color: 'var(--t2)', margin: 0 }}>
                {method.description}
              </p>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--t3)' }}>
                <Clock size={14} />
                <span>{method.processingTime}</span>
              </div>

              {/* Security Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  fontSize: '12px',
                  color: '#10b981',
                  fontWeight: 500,
                }}
              >
                <Shield size={14} />
                <span>Secure Payment</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Saved Cards Section */}
      <div>
        <h2 className="pg-h" style={{ fontSize: '18px', marginBottom: '16px' }}>
          Saved Payment Methods
        </h2>
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <CreditCard size={40} style={{ color: 'var(--t3)', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '4px' }}>
            No saved payment methods
          </p>
          <p style={{ fontSize: '12px', color: 'var(--t2)' }}>
            Save your payment methods for faster checkout next time
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <Link
          href="/dashboard/payments"
          className="btn"
          style={{ background: 'var(--bd)', color: 'var(--t1)' }}
        >
          Cancel
        </Link>
        <Link
          href={selectedMethod ? `/dashboard/payments?method=${selectedMethod}` : '#'}
          className="btn bp"
          style={{ opacity: selectedMethod ? 1 : 0.5, pointerEvents: selectedMethod ? 'auto' : 'none' }}
        >
          Continue with {paymentMethods.find(m => m.id === selectedMethod)?.name || 'Selected Method'}
        </Link>
      </div>
    </div>
  );
}
