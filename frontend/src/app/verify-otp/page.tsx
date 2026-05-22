'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Droplets, Loader2, CheckCircle, RefreshCw, Mail } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/components/ui/toaster';

function VerifyOTPContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuth } = useAuthStore();

  const userId = params.get('userId') || '';
  const email = params.get('email') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (value && index === 5 && newOtp.every(d => d !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = useCallback(async (otpValue: string) => {
    if (otpValue.length !== 6) return;
    setIsLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { userId, otp: otpValue });
      const { user, tokens } = res.data.data;
      setIsSuccess(true);
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      toast({ type: 'success', title: 'Email verified!', description: 'Welcome to Legacy Homes!' });
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (error) {
      toast({ type: 'error', title: 'Verification failed', description: getErrorMessage(error) });
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }, [userId, setAuth, router]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsResending(true);
    try {
      await api.post('/auth/resend-otp', { userId });
      toast({ type: 'success', title: 'OTP resent!', description: 'Check your email for the new code.' });
      setCooldown(60);
    } catch (error) {
      toast({ type: 'error', title: 'Failed to resend', description: getErrorMessage(error) });
    } finally {
      setIsResending(false);
    }
  };

  const submitOtp = () => {
    const otpValue = otp.join('');
    if (otpValue.length === 6) handleVerify(otpValue);
  };

  if (isSuccess) {
    return (
      <div className="auth-wrap">
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '2px solid rgba(16, 185, 129, 0.2)',
          }}>
            <CheckCircle size={40} style={{ color: 'var(--ok)' }} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--t1)', marginBottom: '8px', fontFamily: 'var(--f1)' }}>
            Email Verified!
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '20px' }}>
            Redirecting to your dashboard...
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--ac)' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-ico">
            <Droplets size={20} style={{ color: 'var(--ac)' }} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', fontFamily: 'var(--f1)' }}>
              Legacy Homes
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '2px' }}>
              Water Billing System
            </div>
          </div>
        </div>

        {/* Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          background: 'var(--gl)',
          border: '1px solid rgba(0, 198, 167, 0.25)',
        }}>
          <Mail size={32} style={{ color: 'var(--ac)' }} />
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--t1)', marginBottom: '8px', fontFamily: 'var(--f1)' }}>
            Verify Your Email
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '4px' }}>
            We sent a 6-digit code to
          </p>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>
            {email}
          </p>
        </div>

        {/* OTP Input Row */}
        <div className="otp-row" onPaste={handlePaste} style={{ marginBottom: '24px' }}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`otp-b ${digit ? 'has' : ''}`}
              disabled={isLoading}
            />
          ))}
        </div>

        {/* Verify Button */}
        <button
          onClick={submitOtp}
          disabled={isLoading || otp.some(d => !d)}
          className="btn bp"
          style={{ width: '100%', marginBottom: '12px' }}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Verifying...
            </>
          ) : (
            'Verify Email'
          )}
        </button>

        {/* Resend OTP */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', color: 'var(--t2)', marginBottom: '12px' }}>
          <span>Didn&apos;t receive the code?</span>
          <button
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
            style={{
              background: 'none',
              border: 'none',
              cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: cooldown > 0 ? 'var(--t3)' : 'var(--ac)',
              opacity: cooldown > 0 ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            {isResending ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <RefreshCw size={14} />
            )}
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
          </button>
        </div>

        {/* Info */}
        <p style={{ fontSize: '12px', color: 'var(--t3)', textAlign: 'center' }}>
          Code expires in 10 minutes. Max 5 attempts.
        </p>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="auth-wrap">
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--ac)' }} />
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}
