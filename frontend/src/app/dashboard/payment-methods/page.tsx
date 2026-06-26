'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, CheckCircle, Loader2, Phone, CreditCard } from 'lucide-react';
import { toast } from '@/components/ui/toaster';

export default function PaymentMethodsPage() {
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<'MPESA_STK_PUSH' | 'CARD_PAYMENT' | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    saveCard: false,
  });
  const [detectedCardBrand, setDetectedCardBrand] = useState<'VISA' | 'MASTERCARD' | null>(null);

  const { data: savedCards, isLoading: cardsLoading } = useQuery({
    queryKey: ['saved-cards'],
    queryFn: async () => {
      const res = await api.get('/payment-methods');
      return res.data.data || [];
    },
  });

  // Detect card brand from card number
  const detectCardBrand = (cardNumber: string) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(cleaned)) {
      setDetectedCardBrand('VISA');
    } else if (/^5[1-5][0-9]{14}$/.test(cleaned)) {
      setDetectedCardBrand('MASTERCARD');
    } else {
      setDetectedCardBrand(null);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
    const formatted = value.replace(/(\d{4})/g, '$1 ').trim();
    setCardData({ ...cardData, cardNumber: formatted });
    detectCardBrand(value);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9/]/g, '');
    if (value.length <= 5) {
      if (value.length === 2 && !value.includes('/')) {
        setCardData({ ...cardData, expiryMonth: value, expiryYear: '' });
      } else if (value.includes('/')) {
        const [month, year] = value.split('/');
        setCardData({ ...cardData, expiryMonth: month, expiryYear: year });
      }
    }
  };

  const handleCVVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setCardData({ ...cardData, cvv: value });
  };

  const addCardMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/payment-methods', {
        provider: 'PESAPAL',
        methodType: 'SAVED_CARD',
        displayName: `${detectedCardBrand} ending in ${cardData.cardNumber.slice(-4)}`,
        lastFour: cardData.cardNumber.slice(-4),
        cardBrand: detectedCardBrand,
        expiryMonth: parseInt(cardData.expiryMonth),
        expiryYear: parseInt(`20${cardData.expiryYear}`),
        ...data,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-cards'] });
      setShowCardForm(false);
      setCardData({ cardNumber: '', cardholderName: '', expiryMonth: '', expiryYear: '', cvv: '', saveCard: false });
      setDetectedCardBrand(null);
      toast({ type: 'success', title: 'Card added successfully' });
    },
    onError: (err) => toast({ type: 'error', title: 'Failed to add card', description: getErrorMessage(err) }),
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payment-methods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-cards'] });
      toast({ type: 'success', title: 'Card removed' });
    },
    onError: (err) => toast({ type: 'error', title: 'Failed to remove card', description: getErrorMessage(err) }),
  });

  const isCardValid = cardData.cardNumber.length >= 15 && cardData.cardholderName && cardData.expiryMonth && cardData.expiryYear && cardData.cvv && detectedCardBrand;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/dashboard/payments" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bd)', color: 'var(--t1)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="pg-h" style={{ fontSize: '24px', marginBottom: '4px' }}>Choose Payment Method</h1>
          <p className="pg-sh">Select how you want to pay your water bill</p>
        </div>
      </div>

      {/* Payment Methods Selection */}
      {!selectedMethod ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* M-Pesa STK Push */}
          <button
            onClick={() => setSelectedMethod('MPESA_STK_PUSH')}
            style={{
              padding: '24px',
              borderRadius: '14px',
              border: '2px solid var(--bd)',
              background: 'var(--c2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#00C9A7';
              (e.currentTarget as HTMLElement).style.background = 'rgba(0, 201, 167, 0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)';
              (e.currentTarget as HTMLElement).style.background = 'var(--c2)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 201, 167, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                📱
              </div>
              <div>
                <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>M-Pesa STK Push</p>
                <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '4px 0 0 0' }}>Powered by Tuma</p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--t2)', margin: 0 }}>Fast and secure payment directly from your Safaricom phone.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', fontSize: '12px', color: '#10b981', fontWeight: 500, width: 'fit-content' }}>
              <CheckCircle size={14} />
              <span>Secure Payment</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '8px 0 0 0' }}>Processing time: 1-2 minutes</p>
          </button>

          {/* Card Payment */}
          <button
            onClick={() => setSelectedMethod('CARD_PAYMENT')}
            style={{
              padding: '24px',
              borderRadius: '14px',
              border: '2px solid var(--bd)',
              background: 'var(--c2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#1434CB';
              (e.currentTarget as HTMLElement).style.background = 'rgba(20, 52, 203, 0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)';
              (e.currentTarget as HTMLElement).style.background = 'var(--c2)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(20, 52, 203, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                💳
              </div>
              <div>
                <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>Card Payment</p>
                <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '4px 0 0 0' }}>Powered by Pesapal</p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--t2)', margin: 0 }}>Pay securely using your debit or credit card. Visa and Mastercard are supported.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', fontSize: '12px', color: '#10b981', fontWeight: 500, width: 'fit-content' }}>
              <CheckCircle size={14} />
              <span>Secure Payment</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '8px 0 0 0' }}>Processing time: 2-5 minutes</p>
          </button>
        </div>
      ) : selectedMethod === 'MPESA_STK_PUSH' ? (
        <div style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button
              onClick={() => setSelectedMethod(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <ArrowLeft size={20} color="var(--t1)" />
            </button>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>M-Pesa STK Push</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '20px' }}>
            You will be redirected to enter your phone number and confirm the payment on your Safaricom phone.
          </p>
          <Link href="/dashboard/payments?method=mpesa" style={{ display: 'inline-block', padding: '12px 24px', borderRadius: '8px', background: '#00C9A7', color: 'white', textDecoration: 'none', fontWeight: 500, fontSize: '14px' }}>
            Continue with M-Pesa
          </Link>
        </div>
      ) : (
        <div style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button
              onClick={() => setSelectedMethod(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <ArrowLeft size={20} color="var(--t1)" />
            </button>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>Card Payment</h2>
          </div>

          {/* Saved Cards */}
          {!showCardForm && savedCards && savedCards.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '12px' }}>Saved Cards</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {savedCards.map((card: any) => (
                  <div key={card.id} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CreditCard size={20} color="var(--t2)" />
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--t1)', margin: 0 }}>{card.cardBrand} ending in {card.lastFour}</p>
                        <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '4px 0 0 0' }}>Expires {card.expiryMonth}/{card.expiryYear}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCardMutation.mutate(card.id)}
                      disabled={deleteCardMutation.isPending}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                    >
                      {deleteCardMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Remove'}
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowCardForm(true)}
                style={{ marginTop: '12px', padding: '10px 16px', borderRadius: '8px', border: '1px dashed var(--bd)', background: 'transparent', color: 'var(--t1)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
              >
                + Add New Card
              </button>
            </div>
          )}

          {/* Card Form */}
          {showCardForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>Card Number</label>
                <input
                  type="text"
                  placeholder="4111 1111 1111 1111"
                  value={cardData.cardNumber}
                  onChange={handleCardNumberChange}
                  maxLength={19}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c1)', color: 'var(--t1)', fontSize: '13px', boxSizing: 'border-box' }}
                />
                {detectedCardBrand && (
                  <p style={{ fontSize: '12px', color: '#10b981', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> {detectedCardBrand} detected
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>Cardholder Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={cardData.cardholderName}
                  onChange={(e) => setCardData({ ...cardData, cardholderName: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c1)', color: 'var(--t1)', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={cardData.expiryMonth && cardData.expiryYear ? `${cardData.expiryMonth}/${cardData.expiryYear}` : ''}
                    onChange={handleExpiryChange}
                    maxLength={5}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c1)', color: 'var(--t1)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={cardData.cvv}
                    onChange={handleCVVChange}
                    maxLength={4}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'var(--c1)', color: 'var(--t1)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--t1)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={cardData.saveCard}
                  onChange={(e) => setCardData({ ...cardData, saveCard: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                Save this card for future payments
              </label>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowCardForm(false);
                    setCardData({ cardNumber: '', cardholderName: '', expiryMonth: '', expiryYear: '', cvv: '', saveCard: false });
                    setDetectedCardBrand(null);
                  }}
                  style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--bd)', background: 'transparent', color: 'var(--t1)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => addCardMutation.mutate({})}
                  disabled={!isCardValid || addCardMutation.isPending}
                  style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', background: isCardValid ? '#1434CB' : '#999', color: 'white', cursor: isCardValid ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 500, border: 'none' }}
                >
                  {addCardMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Add Card'}
                </button>
              </div>
            </div>
          )}

          {!showCardForm && (!savedCards || savedCards.length === 0) && (
            <button
              onClick={() => setShowCardForm(true)}
              style={{ padding: '12px 24px', borderRadius: '8px', background: '#1434CB', color: 'white', textDecoration: 'none', fontWeight: 500, fontSize: '14px', border: 'none', cursor: 'pointer' }}
            >
              Add Card
            </button>
          )}
        </div>
      )}
    </div>
  );
}
