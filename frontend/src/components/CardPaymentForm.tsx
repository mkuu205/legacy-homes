'use client';

import { useState } from 'react';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';

interface CardPaymentFormProps {
  onSubmit?: (cardData: CardData) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export interface CardData {
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  billingAddress: string;
  billingCity: string;
  billingPostalCode: string;
}

export default function CardPaymentForm({ onSubmit, isLoading = false, disabled = false }: CardPaymentFormProps) {
  const [formData, setFormData] = useState<CardData>({
    cardholderName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    billingAddress: '',
    billingCity: '',
    billingPostalCode: '',
  });

  const [errors, setErrors] = useState<Partial<CardData>>({});
  const [cardBrand, setCardBrand] = useState<'VISA' | 'MASTERCARD' | 'AMEX' | null>(null);

  // Detect card brand from card number
  const detectCardBrand = (number: string): 'VISA' | 'MASTERCARD' | 'AMEX' | null => {
    const cleaned = number.replace(/\s/g, '');
    if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(cleaned)) return 'VISA';
    if (/^5[1-5][0-9]{14}$/.test(cleaned)) return 'MASTERCARD';
    if (/^3[47][0-9]{13}$/.test(cleaned)) return 'AMEX';
    return null;
  };

  // Format card number with spaces
  const formatCardNumber = (value: string): string => {
    const cleaned = value.replace(/\s/g, '').replace(/[^0-9]/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ').slice(0, 19);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<CardData> = {};

    if (!formData.cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name is required';
    }

    const cardNum = formData.cardNumber.replace(/\s/g, '');
    if (!cardNum || cardNum.length < 13 || cardNum.length > 19) {
      newErrors.cardNumber = 'Invalid card number';
    }

    if (!formData.expiryMonth || parseInt(formData.expiryMonth) < 1 || parseInt(formData.expiryMonth) > 12) {
      newErrors.expiryMonth = 'Invalid month';
    }

    const currentYear = new Date().getFullYear();
    const expYear = parseInt(formData.expiryYear);
    if (!formData.expiryYear || expYear < currentYear || expYear > currentYear + 20) {
      newErrors.expiryYear = 'Invalid year';
    }

    if (!formData.cvv || formData.cvv.length < 3 || formData.cvv.length > 4) {
      newErrors.cvv = 'Invalid CVV';
    }

    if (!formData.billingAddress.trim()) {
      newErrors.billingAddress = 'Address is required';
    }

    if (!formData.billingCity.trim()) {
      newErrors.billingCity = 'City is required';
    }

    if (!formData.billingPostalCode.trim()) {
      newErrors.billingPostalCode = 'Postal code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData({ ...formData, cardNumber: formatted });
    setCardBrand(detectCardBrand(formatted));
    if (errors.cardNumber) setErrors({ ...errors, cardNumber: undefined });
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      const month = value.slice(0, 2);
      const year = value.slice(2, 4);
      setFormData({ ...formData, expiryMonth: month, expiryYear: year });
    } else {
      setFormData({ ...formData, expiryMonth: value });
    }
  };

  const handleCVVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setFormData({ ...formData, cvv: value });
    if (errors.cvv) setErrors({ ...errors, cvv: undefined });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit?.(formData);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear + i);

  return (
    <div style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--c1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ac)' }}>
          <CreditCard size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>Card Details</h3>
          <p style={{ fontSize: '12px', color: 'var(--t3)', margin: '4px 0 0 0' }}>Enter your payment card information</p>
        </div>
      </div>

      {/* Security Notice */}
      <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0, 198, 167, 0.05)', border: '1px solid rgba(0, 198, 167, 0.2)', display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '20px' }}>
        <Lock size={16} style={{ color: 'var(--ac)', flexShrink: 0, marginTop: '2px' }} />
        <p style={{ fontSize: '11px', color: 'var(--t2)', margin: 0, lineHeight: '1.4' }}>
          Your card details are encrypted and processed securely via Pesapal. We never store your full card number.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Cardholder Name */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>
            Cardholder Name
          </label>
          <input
            type="text"
            placeholder="John Doe"
            value={formData.cardholderName}
            onChange={(e) => {
              setFormData({ ...formData, cardholderName: e.target.value });
              if (errors.cardholderName) setErrors({ ...errors, cardholderName: undefined });
            }}
            disabled={disabled || isLoading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: errors.cardholderName ? '1px solid #ef4444' : '1px solid var(--bd)',
              background: 'var(--c1)',
              color: 'var(--t1)',
              fontSize: '14px',
              boxSizing: 'border-box',
              opacity: disabled || isLoading ? 0.6 : 1,
            }}
          />
          {errors.cardholderName && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>{errors.cardholderName}</p>}
        </div>

        {/* Card Number */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>
            Card Number
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="4532 1234 5678 9010"
              value={formData.cardNumber}
              onChange={handleCardNumberChange}
              disabled={disabled || isLoading}
              maxLength={19}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                borderRadius: '8px',
                border: errors.cardNumber ? '1px solid #ef4444' : '1px solid var(--bd)',
                background: 'var(--c1)',
                color: 'var(--t1)',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
                opacity: disabled || isLoading ? 0.6 : 1,
              }}
            />
            {cardBrand && (
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 600, color: 'var(--ac)' }}>
                {cardBrand}
              </div>
            )}
          </div>
          {errors.cardNumber && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>{errors.cardNumber}</p>}
        </div>

        {/* Expiry and CVV Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          {/* Expiry Date */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>
              Expiry Date (MM/YY)
            </label>
            <input
              type="text"
              placeholder="12/25"
              value={formData.expiryMonth && formData.expiryYear ? `${formData.expiryMonth}/${formData.expiryYear}` : ''}
              onChange={handleExpiryChange}
              disabled={disabled || isLoading}
              maxLength={5}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: errors.expiryMonth || errors.expiryYear ? '1px solid #ef4444' : '1px solid var(--bd)',
                background: 'var(--c1)',
                color: 'var(--t1)',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
                opacity: disabled || isLoading ? 0.6 : 1,
              }}
            />
            {(errors.expiryMonth || errors.expiryYear) && (
              <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>Invalid expiry</p>
            )}
          </div>

          {/* CVV */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>
              CVV
            </label>
            <input
              type="text"
              placeholder="123"
              value={formData.cvv}
              onChange={handleCVVChange}
              disabled={disabled || isLoading}
              maxLength={4}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: errors.cvv ? '1px solid #ef4444' : '1px solid var(--bd)',
                background: 'var(--c1)',
                color: 'var(--t1)',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
                opacity: disabled || isLoading ? 0.6 : 1,
              }}
            />
            {errors.cvv && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>{errors.cvv}</p>}
          </div>
        </div>

        {/* Billing Address */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>
            Billing Address
          </label>
          <input
            type="text"
            placeholder="123 Main Street"
            value={formData.billingAddress}
            onChange={(e) => {
              setFormData({ ...formData, billingAddress: e.target.value });
              if (errors.billingAddress) setErrors({ ...errors, billingAddress: undefined });
            }}
            disabled={disabled || isLoading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: errors.billingAddress ? '1px solid #ef4444' : '1px solid var(--bd)',
              background: 'var(--c1)',
              color: 'var(--t1)',
              fontSize: '14px',
              boxSizing: 'border-box',
              opacity: disabled || isLoading ? 0.6 : 1,
            }}
          />
          {errors.billingAddress && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>{errors.billingAddress}</p>}
        </div>

        {/* City and Postal Code Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* City */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>
              City
            </label>
            <input
              type="text"
              placeholder="Nairobi"
              value={formData.billingCity}
              onChange={(e) => {
                setFormData({ ...formData, billingCity: e.target.value });
                if (errors.billingCity) setErrors({ ...errors, billingCity: undefined });
              }}
              disabled={disabled || isLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: errors.billingCity ? '1px solid #ef4444' : '1px solid var(--bd)',
                background: 'var(--c1)',
                color: 'var(--t1)',
                fontSize: '14px',
                boxSizing: 'border-box',
                opacity: disabled || isLoading ? 0.6 : 1,
              }}
            />
            {errors.billingCity && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>{errors.billingCity}</p>}
          </div>

          {/* Postal Code */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>
              Postal Code
            </label>
            <input
              type="text"
              placeholder="00100"
              value={formData.billingPostalCode}
              onChange={(e) => {
                setFormData({ ...formData, billingPostalCode: e.target.value });
                if (errors.billingPostalCode) setErrors({ ...errors, billingPostalCode: undefined });
              }}
              disabled={disabled || isLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: errors.billingPostalCode ? '1px solid #ef4444' : '1px solid var(--bd)',
                background: 'var(--c1)',
                color: 'var(--t1)',
                fontSize: '14px',
                boxSizing: 'border-box',
                opacity: disabled || isLoading ? 0.6 : 1,
              }}
            />
            {errors.billingPostalCode && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>{errors.billingPostalCode}</p>}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={disabled || isLoading}
          style={{
            marginTop: '8px',
            padding: '12px',
            borderRadius: '8px',
            background: disabled || isLoading ? '#cbd5e1' : '#1434CB',
            color: 'white',
            border: 'none',
            cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            opacity: disabled || isLoading ? 0.6 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {isLoading ? 'Processing...' : 'Save Card Details'}
        </button>
      </form>
    </div>
  );
}
