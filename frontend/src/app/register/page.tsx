'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/toaster';

const schema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z
    .string()
    .regex(/^(07|01)\d{8}$/, 'Enter a valid Kenyan phone number (e.g. 0712345678)'),
  houseNumber: z.string().min(1, 'House number is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[A-Z])(?=.*\d)/, 'Must include uppercase letter and number'),
  confirmPassword: z.string(),
  nationalId: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        houseNumber: data.houseNumber,
        password: data.password,
        nationalId: data.nationalId || null,
      };

      const res = await api.post('/auth/register', payload);

      const { userId } = res.data.data;

      toast({
        type: 'success',
        title: 'Account created!',
        description: 'Check your email for the verification code.',
      });

      router.push(
        `/verify-otp?userId=${userId}&email=${encodeURIComponent(data.email)}`
      );
    } catch (error) {
      const errorText = getErrorMessage(error);

      setErrorMsg(errorText);

      toast({
        type: 'error',
        title: 'Registration failed',
        description: errorText,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: '520px' }}>
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
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--t1)',
                fontFamily: 'var(--f1)',
              }}
            >
              Legacy Homes
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--t2)',
                marginTop: '2px',
              }}
            >
              Water Billing System
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--t1)',
              marginBottom: '6px',
              fontFamily: 'var(--f1)',
            }}
          >
            Create your account
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--t2)' }}>
            Join Legacy Homes Water Billing System
          </p>
        </div>

        {/* Error handled via toast notification */}

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div className="fg">
            <label className="lbl">Full Name *</label>
            <input
              {...register('fullName')}
              type="text"
              placeholder="John Kamau"
              className="inp"
            />
            {errors.fullName && (
              <p style={{ fontSize: '12px', color: '#f87171', marginTop: '5px' }}>
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className="g2">
            <div className="fg">
              <label className="lbl">Email Address *</label>
              <input
                {...register('email')}
                type="email"
                placeholder="john@example.com"
                className="inp"
              />
              {errors.email && (
                <p style={{ fontSize: '12px', color: '#f87171', marginTop: '5px' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="fg">
              <label className="lbl">Phone Number *</label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="0712345678"
                className="inp"
              />
              {errors.phone && (
                <p style={{ fontSize: '12px', color: '#f87171', marginTop: '5px' }}>
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <div className="g2">
            <div className="fg">
              <label className="lbl">House Number *</label>
              <input
                {...register('houseNumber')}
                type="text"
                placeholder="e.g. A1, B2"
                className="inp"
              />
              {errors.houseNumber && (
                <p style={{ fontSize: '12px', color: '#f87171', marginTop: '5px' }}>
                  {errors.houseNumber.message}
                </p>
              )}
            </div>

            <div className="fg">
              <label className="lbl">
                National ID{' '}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 400,
                    color: 'var(--t3)',
                  }}
                >
                  (optional)
                </span>
              </label>
              <input
                {...register('nationalId')}
                type="text"
                placeholder="12345678"
                className="inp"
              />
            </div>
          </div>

          <div className="g2">
            <div className="fg">
              <label className="lbl">Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
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
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="fg">
              <label className="lbl">Confirm Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat password"
                  className="inp"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn bp"
            style={{ width: '100%', marginTop: '8px' }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Creating account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="dv" />

        <p
          style={{
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--t2)',
          }}
        >
          Already have an account?{' '}
          <Link
            href="/login"
            style={{
              color: 'var(--ac)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
