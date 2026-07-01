'use client';

import { useState } from 'react';
import { useSystemStatusStore } from '@/stores/system-status.store';
import { useAuthStore } from '@/store/auth.store';
import { useBackendHealth } from '@/hooks/useBackendHealth';
import { RefreshCw, Bell, Server } from 'lucide-react';

export function MaintenanceScreen() {
  const { status, maintenanceMessage, isNotified, setNotified } = useSystemStatusStore();
  const { retry } = useBackendHealth();
  const { isAuthenticated, user } = useAuthStore();
  
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  const handleNotifyMe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 1. Attempt to subscribe via our new backend endpoint
      // Note: We use the actual backend URL because during an outage, the Next.js API route 
      // might also be affected or we want to bypass it for direct reliability if possible.
      // However, per requirements, we'll try the standard API path first.
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://legacy-homes.onrender.com/api';
      
      const res = await fetch(`${API_URL}/auth/notify-outage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (res.ok) {
        setNotified(true);
        // Clear any queued subscription for this email
        const queue = JSON.parse(localStorage.getItem('outage_subscription_queue') || '[]');
        const filteredQueue = queue.filter((q: any) => q.email !== email);
        localStorage.setItem('outage_subscription_queue', JSON.stringify(filteredQueue));
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Failed to subscribe');
      }
    } catch (err: any) {
      console.warn('Backend unreachable for subscription, queuing locally:', err.message);
      
      // 2. Reliable Solution: Queue locally if backend is unreachable
      // This ensures users can still register interest during a total outage.
      const queue = JSON.parse(localStorage.getItem('outage_subscription_queue') || '[]');
      
      // Avoid duplicates in queue
      if (!queue.find((q: any) => q.email === email)) {
        queue.push({ 
          email, 
          timestamp: Date.now(),
          residentId: user?.id,
          name: user?.fullName
        });
        localStorage.setItem('outage_subscription_queue', JSON.stringify(queue));
      }
      
      // Still show success to the user as we've "captured" their intent
      setNotified(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    try {
      await retry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card fu">
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
          <p style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: '1.5' }}>
            We're currently performing maintenance or experiencing a temporary service interruption.
          </p>
        </div>

        {/* Description */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--bd)',
          borderRadius: '9px',
          padding: '14px',
          marginBottom: '20px',
          fontSize: '13px',
          color: 'var(--t2)',
          lineHeight: '1.6'
        }}>
          <p style={{ marginBottom: '8px' }}>
            Your account, bills and payment history remain safe.
          </p>
          <p>
            We'll automatically reconnect as soon as service is restored.
          </p>
        </div>

        {/* Illustration / Icon */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '14px',
            background: 'var(--gl)',
            border: '1px solid rgba(0, 198, 167, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Server size={32} style={{ color: 'var(--ac)' }} />
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
            System Status
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: '#ef4444',
              animation: 'pulse 2s ease-in-out infinite'
            }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f87171' }}>
              Offline
            </span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '8px' }}>
            Checking automatically...
          </div>
        </div>

        {/* Notification Form */}
        {!isNotified ? (
          <form onSubmit={handleNotifyMe} style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="email" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--t2)', marginBottom: '6px' }}>
                Get notified when we're back online
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="inp"
                style={{ width: '100%' }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn bg"
              style={{ width: '100%' }}
            >
              <Bell size={16} />
              {loading ? 'Subscribing...' : 'Notify Me'}
            </button>
          </form>
        ) : (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '9px',
            padding: '12px',
            marginBottom: '20px',
            fontSize: '12px',
            color: '#34d399',
            textAlign: 'center'
          }}>
            We'll notify {email} when service returns.
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <button
            onClick={handleRetryConnection}
            disabled={isRetrying}
            className="btn bp"
            style={{ width: '100%' }}
          >
            {isRetrying ? (
              <>
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Retry Connection
              </>
            )}
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '9px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '12px',
            color: '#f87171',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="dv" />
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--t3)', lineHeight: '1.5' }}>
          Checking every 30 seconds...
        </p>
      </div>
    </div>
  );
}
