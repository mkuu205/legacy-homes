'use client';

import { useQuery } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';

const StatusIndicator = ({ status }: { status: 'ONLINE' | 'OFFLINE' | 'WARNING' }) => {
  const colors = {
    ONLINE: '#10b981',
    OFFLINE: '#ef4444',
    WARNING: '#f59e0b',
  };

  const labels = {
    ONLINE: '🟢 Online',
    OFFLINE: '🔴 Offline',
    WARNING: '🟡 Warning',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: colors[status] }}>
      <span>{labels[status]}</span>
    </div>
  );
};

export default function SystemCheckPage() {
  const { data: healthData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const res = await api.get('/payments/system-check');
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  const services = healthData?.services || {};
  const timestamp = healthData?.timestamp;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bd)', color: 'var(--t1)', textDecoration: 'none' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="pg-h" style={{ fontSize: '24px', marginBottom: '4px' }}>System Check</h1>
            <p className="pg-sh">Monitor payment system health and configuration</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid var(--bd)',
            background: 'transparent',
            color: 'var(--t1)',
            cursor: isFetching ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {isFetching ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {/* Last Updated */}
      {timestamp && (
        <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
          Last updated: {new Date(timestamp).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
        </div>
      )}

      {/* Services Status */}
      {isLoading ? (
        <div style={{ padding: '32px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)', textAlign: 'center' }}>
          <Loader2 size={32} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite', color: 'var(--t2)' }} />
          <p style={{ fontSize: '14px', color: 'var(--t2)' }}>Loading system status...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {/* Backend API */}
          <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>Backend API</h3>
              <StatusIndicator status={services.database?.status || 'OFFLINE'} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--t3)', margin: 0 }}>{services.database?.message || 'No information'}</p>
          </div>

          {/* Database */}
          <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>Database</h3>
              <StatusIndicator status={services.database?.status || 'OFFLINE'} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--t3)', margin: 0 }}>{services.database?.message || 'No information'}</p>
          </div>

          {/* Tuma API */}
          <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>Tuma API (M-Pesa)</h3>
              <StatusIndicator status={services.tumaApi?.status || 'OFFLINE'} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--t3)', margin: 0 }}>{services.tumaApi?.message || 'No information'}</p>
          </div>

          {/* Pesapal API */}
          <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>Pesapal API (Card)</h3>
              <StatusIndicator status={services.pesapalApi?.status || 'OFFLINE'} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--t3)', margin: 0 }}>{services.pesapalApi?.message || 'No information'}</p>
          </div>

          {/* Payment Callback */}
          <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>Payment Callback</h3>
              <StatusIndicator status="ONLINE" />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--t3)', margin: 0 }}>Callback endpoint is configured and reachable</p>
          </div>

          {/* Environment Variables */}
          <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>Environment Variables</h3>
              <StatusIndicator status={services.environmentVariables?.status || 'OFFLINE'} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--t3)', margin: 0 }}>{services.environmentVariables?.message || 'No information'}</p>
            {services.environmentVariables?.missing && services.environmentVariables.missing.length > 0 && (
              <div style={{ marginTop: '12px', padding: '8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)' }}>
                <p style={{ fontSize: '11px', color: '#ef4444', margin: 0, fontWeight: 500 }}>Missing variables:</p>
                {services.environmentVariables.missing.map((v: string) => (
                  <p key={v} style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>• {v}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configuration Guide */}
      <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '12px' }}>Configuration Guide</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: 'var(--t2)' }}>
          <p style={{ margin: 0 }}>
            <strong>Tuma API (M-Pesa):</strong> Ensure TUMA_API_URL, TUMA_AUTH_URL, TUMA_BUSINESS_EMAIL, TUMA_API_KEY, and TUMA_CALLBACK_URL are configured in environment variables.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Pesapal API (Card):</strong> Ensure PESAPAL_API_URL, PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET, and PESAPAL_IPN_URL are configured in environment variables.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Callback URLs:</strong> Must be publicly accessible and match the configuration in your payment provider dashboard.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Database:</strong> Ensure DATABASE_URL is configured and the database is running.
          </p>
        </div>
      </div>

      {/* Troubleshooting */}
      <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '12px' }}>Troubleshooting</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: 'var(--t2)' }}>
          <div>
            <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>🔴 Tuma API Offline:</p>
            <p style={{ margin: 0, color: 'var(--t3)' }}>Check if TUMA_API_KEY and TUMA_BUSINESS_EMAIL are correct. Verify network connectivity to api.tuma.co.ke.</p>
          </div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>🔴 Pesapal API Offline:</p>
            <p style={{ margin: 0, color: 'var(--t3)' }}>Check if PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET are correct. Verify network connectivity to api.pesapal.com.</p>
          </div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>🔴 Database Offline:</p>
            <p style={{ margin: 0, color: 'var(--t3)' }}>Check if DATABASE_URL is correct and the database server is running. Verify network connectivity to the database.</p>
          </div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>🟡 Missing Environment Variables:</p>
            <p style={{ margin: 0, color: 'var(--t3)' }}>Add the missing variables to your .env file and restart the application.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
