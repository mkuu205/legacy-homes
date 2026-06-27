'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/components/ui/toaster';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post('/auth/login', data);
      const { user, tokens } = res.data.data;
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      toast({ type: 'success', title: 'Welcome back!', description: `Hello, ${user.fullName}` });
      if (user.role === 'RESIDENT') {
        router.push('/dashboard');
      } else {
        router.push('/admin');
      }
    } catch (error) {
      const errorText = getErrorMessage(error);
      setErrorMsg(errorText);
      toast({ type: 'error', title: 'Login failed', description: errorText });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-ico">
            <img
              src="https://i.ibb.co/5hvy5zXd/Chat-GPT-Image-Jun-23-2026-01-17-11-AM.png"
              alt="Legacy Homes Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
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

        {/* Heading */}
        <div style={{ marginBottom: '26px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--t1)', marginBottom: '6px', fontFamily: 'var(--f1)' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--t2)' }}>
            Sign in to your account to continue
          </p>
        </div>

        {/* Error handled via toast notification */}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email Field */}
          <div className="fg">
            <label className="lbl">Email Address</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              className="inp"
            />
            {errors.email && (
              <p style={{ fontSize: '12px', color: '#f87171', marginTop: '5px' }}>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="fg">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
              <label className="lbl" style={{ marginBottom: 0 }}>Password</label>
              <Link href="/forgot-password" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ac)', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className="inp"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--t2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p style={{ fontSize: '12px', color: '#f87171', marginTop: '5px' }}>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn bp"
            style={{ width: '100%', marginTop: '8px' }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="dv" />

        {/* Sign Up Link */}
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--t2)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: 'var(--ac)', fontWeight: 600, textDecoration: 'none' }}>
            Create one now
          </Link>
        </p>

        {/* Features */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--bd)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            Features
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['Instant M-Pesa STK Push', 'Real-time notifications', 'AI-powered support'].map((feature) => (
              <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--t2)' }}>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--ac)', flexShrink: 0 }} />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
