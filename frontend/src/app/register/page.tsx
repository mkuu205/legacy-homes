'use client';

import { useState, useEffect } from 'react';
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
  AlertCircle,
  RefreshCw,
  Bell
} from 'lucide-react';
import { api, getErrorMessage, checkBackendHealth, backendEvents } from '@/lib/api';
import { useSystemStatusStore } from '@/stores/system-status.store';
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
  
  // Maintenance mode state
  const backendStatus = useSystemStatusStore((state) => state.status);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Monitor backend status and update maintenance mode
  useEffect(() => {
    // Define all states that should show the maintenance screen
    const isOffline = backendStatus === 'OFFLINE' || 
                     backendStatus === 'WAKING_UP' || 
                     backendStatus === 'MAINTENANCE' || 
                     backendStatus === 'NETWORK_OFFLINE';
    
    setIsMaintenanceMode(isOffline);
    
    if (isOffline) {
      setLastChecked(new Date());
    }
  }, [backendStatus]);

  // Listen for backend recovery
  useEffect(() => {
    const unsubscribe = backendEvents.on('backend-online', () => {
      setIsMaintenanceMode(false);
      toast({
        type: 'success',
        title: 'Service Restored',
        description: 'Legacy Homes services are back online.\nYou may now register your account.',
      });
    });

    return unsubscribe;
  }, []);

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    try {
      await checkBackendHealth();
      setLastChecked(new Date());

      // Check if still in any outage state
      const isStillOffline = backendStatus === 'OFFLINE' || 
                            backendStatus === 'WAKING_UP' || 
                            backendStatus === 'MAINTENANCE' || 
                            backendStatus === 'NETWORK_OFFLINE';

      if (isStillOffline) {
        toast({
          type: 'info',
          title: 'Service Still Unavailable',
          description: 'The service is still unavailable. Please try again shortly.',
        });
      }
    } catch (error) {
      setLastChecked(new Date());
      toast({
        type: 'info',
        title: 'Service Still Unavailable',
        description: 'The service is still unavailable. Please try again shortly.',
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleNotifyMe = () => {
    toast({
      type: 'info',
      title: 'Notification',
      description: 'We will notify you when the service is restored.',
    });
  };

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

  // Maintenance Mode UI
  if (isMaintenanceMode) {
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
              Service Temporarily Unavailable
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--t2)' }}>
              Our servers are temporarily unavailable.
            </p>
          </div>

          {/* Alert Box */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '9px',
            padding: '12px 14px',
            marginBottom: '20px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start'
          }}>
            <AlertCircle size={18} style={{ color: '#f87171', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: '1.5' }}>
              This may be due to scheduled maintenance, a server restart, or a temporary outage.
              <br />
              There is nothing you need to do. Please try again shortly.
            </div>
          </div>

          {/* Status Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--bd)',
            borderRadius: '9px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              Service Status
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Backend Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--t2)' }}>Backend Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ color: '#f87171', fontWeight: 600 }}>
                    {backendStatus === 'MAINTENANCE' ? 'Maintenance' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Website Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--t2)' }}>Website</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ color: '#34d399', fontWeight: 600 }}>Online</span>
                </div>
              </div>

              {/* Registration Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--t2)' }}>Registration</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>Temporarily Disabled</span>
                </div>
              </div>

              {/* Last Checked */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderTop: '1px solid var(--bd)', paddingTop: '10px', marginTop: '10px' }}>
                <span style={{ color: 'var(--t3)' }}>Last Checked</span>
                <span style={{ color: 'var(--t2)', fontSize: '12px' }}>
                  {lastChecked ? lastChecked.toLocaleTimeString() : 'Checking...'}
                </span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleRetryConnection}
              disabled={isRetrying}
              className="btn bp"
              style={{ width: '100%' }}
            >
              {isRetrying ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Retry Connection
                </>
              )}
            </button>

            <button
              onClick={handleNotifyMe}
              className="btn bg"
              style={{ width: '100%' }}
            >
              <Bell size={16} />
              Notify Me
            </button>
          </div>

          {/* Divider */}
          <div className="dv" style={{ margin: '16px 0' }} />

          {/* Help Text */}
          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--t3)', lineHeight: '1.5' }}>
            If the problem persists, please contact our support team or check back in a few moments.
          </p>
        </div>
      </div>
    );
  }

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
