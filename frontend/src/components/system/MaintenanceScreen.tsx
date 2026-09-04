'use client';

import { useState } from 'react';
import { useSystemStatusStore } from '@/stores/system-status.store';
import { useBackendHealth } from '@/hooks/useBackendHealth';
import { RefreshCw, Server } from 'lucide-react';

export function MaintenanceScreen() {
  const { maintenanceMessage } = useSystemStatusStore();
  const { retry } = useBackendHealth();
  const [isRetrying, setIsRetrying] = useState(false);

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
        <div className="auth-logo">
          <div className="auth-logo-ico">
            <img
              src="/brand/legacy-homes-logo.png"
              alt="Legacy Homes Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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

        <div style={{ marginBottom: '26px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--t1)', marginBottom: '6px', fontFamily: 'var(--f1)' }}>
            Service Temporarily Unavailable
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: '1.5' }}>
            {maintenanceMessage || "We're currently performing maintenance or experiencing a temporary service interruption."}
          </p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--bd)', borderRadius: '9px', padding: '14px', marginBottom: '20px', fontSize: '13px', color: 'var(--t2)', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '8px' }}>Your account, bills and payment history remain safe.</p>
          <p>We&apos;ll automatically reconnect as soon as service is restored.</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '14px', background: 'var(--gl)', border: '1px solid rgba(0, 198, 167, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Server size={32} style={{ color: 'var(--ac)' }} />
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--bd)', borderRadius: '9px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            System Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f87171' }}>Offline</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '8px' }}>Checking automatically...</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <button onClick={handleRetryConnection} disabled={isRetrying} className="btn bp" style={{ width: '100%' }}>
            {isRetrying ? (
              <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />Retrying...</>
            ) : (
              <><RefreshCw size={16} />Retry Connection</>
            )}
          </button>
        </div>

        <div className="dv" />
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--t3)', lineHeight: '1.5' }}>Checking every 30 seconds...</p>
      </div>
    </div>
  );
}
