'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast({ type: 'error', title: 'Invalid link', description: 'Reset token is missing. Please request a new password reset link.' });
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });
      setIsSuccess(true);
      toast({ type: 'success', title: 'Password reset!', description: 'Your password has been updated successfully.' });
      // Redirect to login after a short delay
      setTimeout(() => router.push('/login'), 2500);
    } catch (error) {
      toast({ type: 'error', title: 'Reset failed', description: getErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div style={{ width: '100%', maxWidth: '448px' }}>
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-ico">
            <img
              src="https://i.ibb.co/5hvy5zXd/Chat-GPT-Image-Jun-23-2026-01-17-11-AM.png"
              alt="Legacy Homes Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--t1)', fontFamily: 'var(--f1)' }}>
            Legacy Homes
          </span>
        </div>

        {/* Card */}
        <div className="auth-card">
          {isSuccess ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  background: 'rgba(16, 185, 129, 0.1)',
                }}
              >
                <CheckCircle size={32} style={{ color: 'var(--ok)' }} />
              </div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--t1)',
                  marginBottom: '8px',
                  fontFamily: 'var(--f1)',
                }}
              >
                Password Updated!
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '24px', lineHeight: 1.5 }}>
                Your password has been reset successfully. Redirecting you to the login page…
              </p>
              <Link
                href="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--ac)',
                  textDecoration: 'none',
                }}
              >
                <ArrowLeft size={14} /> Go to Sign In
              </Link>
            </div>
          ) : !token ? (
            /* ── Missing token state ── */
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  background: 'rgba(239, 68, 68, 0.1)',
                }}
              >
                <AlertCircle size={32} style={{ color: 'var(--er)' }} />
              </div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--t1)',
                  marginBottom: '8px',
                  fontFamily: 'var(--f1)',
                }}
              >
                Invalid Reset Link
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '24px', lineHeight: 1.5 }}>
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link
                href="/forgot-password"
                className="btn bp"
                style={{ display: 'inline-flex', width: '100%', justifyContent: 'center' }}
              >
                Request New Link
              </Link>
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <Link
                  href="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--ac)',
                    textDecoration: 'none',
                  }}
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* ── Reset form ── */
            <>
              {/* Header */}
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    background: 'rgba(0, 198, 167, 0.1)',
                  }}
                >
                  <Lock size={24} style={{ color: 'var(--ac)' }} />
                </div>
                <h1
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--t1)',
                    marginBottom: '4px',
                    fontFamily: 'var(--f1)',
                  }}
                >
                  Set New Password
                </h1>
                <p style={{ fontSize: '12px', color: 'var(--t2)' }}>
                  Choose a strong password for your account.
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit(onSubmit)}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                {/* New Password */}
                <div className="fg">
                  <label className="lbl">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      {...register('newPassword')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      className="inp"
                      style={{
                        paddingRight: '40px',
                        borderColor: errors.newPassword ? 'var(--er)' : 'var(--bd)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--t2)',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p style={{ fontSize: '11px', color: 'var(--er)', marginTop: '4px' }}>
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="fg">
                  <label className="lbl">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      {...register('confirmPassword')}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      className="inp"
                      style={{
                        paddingRight: '40px',
                        borderColor: errors.confirmPassword ? 'var(--er)' : 'var(--bd)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--t2)',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p style={{ fontSize: '11px', color: 'var(--er)', marginTop: '4px' }}>
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Password requirements hint */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0, 198, 167, 0.06)',
                    border: '1px solid rgba(0, 198, 167, 0.15)',
                  }}
                >
                  <p style={{ fontSize: '11px', color: 'var(--t2)', lineHeight: 1.6 }}>
                    Password must be at least <strong style={{ color: 'var(--t1)' }}>8 characters</strong>, include an{' '}
                    <strong style={{ color: 'var(--t1)' }}>uppercase letter</strong> and a{' '}
                    <strong style={{ color: 'var(--t1)' }}>number</strong>.
                  </p>
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
                      Resetting…
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>

              {/* Back link */}
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <Link
                  href="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--ac)',
                    textDecoration: 'none',
                  }}
                >
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-wrap">
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--ac)' }} />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
