'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Droplets, Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', data);
      setSent(true);
    } catch (error) {
      toast({ type: 'error', title: 'Error', description: getErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '448px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gl)', border: '1px solid rgba(0, 198, 167, 0.25)' }}>
            <Droplets size={16} style={{ color: 'var(--ac)' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--t1)', fontFamily: 'var(--f1)' }}>Legacy Homes</span>
        </div>

        {/* Card */}
        <div className="card">
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', background: 'rgba(16, 185, 129, 0.1)' }}>
                <CheckCircle size={32} style={{ color: 'var(--ok)' }} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--t1)', marginBottom: '8px', fontFamily: 'var(--f1)' }}>
                Check Your Email
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '24px', lineHeight: 1.5 }}>
                If this email is registered, you&apos;ll receive a password reset link shortly. The link expires in 1 hour.
              </p>
              <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--ac)', textDecoration: 'none' }}>
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', background: 'rgba(0, 198, 167, 0.1)' }}>
                  <Mail size={24} style={{ color: 'var(--ac)' }} />
                </div>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)', marginBottom: '4px', fontFamily: 'var(--f1)' }}>
                  Forgot Password?
                </h1>
                <p style={{ fontSize: '12px', color: 'var(--t2)' }}>
                  Enter your email and we&apos;ll send a reset link.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="fg">
                  <label className="lbl">Email Address</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@example.com"
                    className="inp"
                    style={{
                      borderColor: errors.email ? 'var(--er)' : 'var(--bd)',
                    }}
                  />
                  {errors.email && (
                    <p style={{ fontSize: '11px', color: 'var(--er)', marginTop: '4px' }}>
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn bp"
                  style={{ width: '100%' }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              {/* Back Link */}
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--ac)', textDecoration: 'none' }}>
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
