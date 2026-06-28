'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, RefreshCw, Loader2, Server, Database, Phone, CreditCard, Webhook, Mail, Settings, Clock, Globe } from 'lucide-react';
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
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const { data: healthData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const res = await api.get('/payments/system-check');
      // The backend returns { success: true, data: { ...healthData } }
      return res.data.data || res.data;
    },
    refetchInterval: 30000,
  });

  const services = healthData?.services || {};
  const timestamp = healthData?.timestamp;

  const serviceCards = [
    { id: 'backendApi', name: 'Backend API', icon: <Server size={20} />, data: services.backendApi },
    { id: 'database', name: 'PostgreSQL Database', icon: <Database size={20} />, data: services.database },
    { id: 'pesapalApi', name: 'Pesapal API', icon: <CreditCard size={20} />, data: services.pesapalApi },
    { id: 'callbackEndpoint', name: 'Payment Callback Endpoint', icon: <Webhook size={20} />, data: services.callbackEndpoint },
    { id: 'emailService', name: 'Email Service (SMTP)', icon: <Mail size={20} />, data: services.emailService },
    { id: 'environmentVariables', name: 'Environment Variables', icon: <Settings size={20} />, data: services.environmentVariables },
  ];

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
            <p className="pg-sh">Real-time health overview of all critical services</p>
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
          Refresh Status
        </button>
      </div>

      {/* Time Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--bd)', background: 'var(--c2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Clock size={20} color="var(--t2)" />
          <div>
            <p style={{ fontSize: '11px', color: 'var(--t3)', margin: 0 }}>Server Time</p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>
              {healthData?.serverTime ? new Date(healthData.serverTime).toLocaleTimeString() : '--:--'}
            </p>
          </div>
        </div>
        <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--bd)', background: 'var(--c2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Globe size={20} color="var(--t2)" />
          <div>
            <p style={{ fontSize: '11px', color: 'var(--t3)', margin: 0 }}>Application Timezone</p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>{healthData?.timezone || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <div style={{ padding: '32px', borderRadius: '14px', border: '1px solid var(--bd)', background: 'var(--c2)', textAlign: 'center' }}>
          <Loader2 size={32} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite', color: 'var(--t2)' }} />
          <p style={{ fontSize: '14px', color: 'var(--t2)' }}>Checking services status...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {serviceCards.map((service) => (
            <div 
              key={service.id} 
              onClick={() => setSelectedService(selectedService === service.id ? null : service.id)}
              style={{ 
                padding: '20px', 
                borderRadius: '14px', 
                border: '1px solid var(--bd)', 
                background: 'var(--c2)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                borderColor: selectedService === service.id ? 'var(--t1)' : 'var(--bd)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ color: 'var(--t2)' }}>{service.icon}</div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)', margin: 0 }}>{service.name}</h3>
                </div>
                <StatusIndicator status={service.data?.status || 'OFFLINE'} />
              </div>
              
              <p style={{ fontSize: '12px', color: 'var(--t3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {service.data?.message || 'No status information available'}
              </p>

              {selectedService === service.id && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--t3)' }}>Current status:</span>
                    <span style={{ fontWeight: 500, color: 'var(--t1)' }}>{service.data?.status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--t3)' }}>Last check:</span>
                    <span style={{ fontWeight: 500, color: 'var(--t1)' }}>{timestamp ? new Date(timestamp).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                  {service.data?.responseTime && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--t3)' }}>Response time:</span>
                      <span style={{ fontWeight: 500, color: 'var(--t1)' }}>{service.data.responseTime}</span>
                    </div>
                  )}
                  {service.data?.lastCallbackReceived && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--t3)' }}>Last callback:</span>
                      <span style={{ fontWeight: 500, color: 'var(--t1)' }}>{service.data.lastCallbackReceived === 'Never' ? 'Never' : new Date(service.data.lastCallbackReceived).toLocaleString()}</span>
                    </div>
                  )}
                  {service.data?.configSummary && (
                    <div style={{ marginTop: '8px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t2)', marginBottom: '4px' }}>Configuration Summary:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {Object.entries(service.data.configSummary).map(([key, value]) => (
                          <div key={key} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--bd)', color: 'var(--t2)' }}>
                            {key}: {value ? '✅' : '❌'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {service.data?.status !== 'ONLINE' && service.data?.message && (
                    <div style={{ marginTop: '8px', padding: '8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                      <p style={{ fontSize: '11px', color: '#ef4444', margin: 0 }}>{service.data.message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
