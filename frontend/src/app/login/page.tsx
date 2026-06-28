'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ArrowRight, AlertCircle, RefreshCw, Bell } from 'lucide-react';
import { api, getErrorMessage, checkBackendHealth, backendEvents } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useSystemStatusStore } from '@/stores/system-status.store';
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
  
  // Maintenance mode state
  const backendStatus = useSystemStatusStore((state) => state.status);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
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
        description: 'Legacy Homes services are back online.\nYou may now sign in.',
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

              {/* Login Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--t2)' }}>Login</span>
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

  // Normal Login UI
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
                  color: 'var(--t3)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
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
            style={{ width: '100%', marginTop: '10px' }}
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

        {/* Footer */}
        <div style={{ marginTop: '26px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--t2)' }}>
            Don't have an account?{' '}
            <Link href="/register" style={{ fontWeight: 600, color: 'var(--ac)', textDecoration: 'none' }}>
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
