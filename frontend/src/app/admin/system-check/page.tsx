'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, RefreshCw, Loader2, Server, Database, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

type Service = {
  service: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
  severity: string;
  responseTimeMs?: number | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  checkedAt?: string;
};

const labels: Record<Service['status'], string> = {
  ONLINE: 'Online', DEGRADED: 'Degraded', OFFLINE: 'Offline', UNKNOWN: 'Unknown',
};
const colors: Record<Service['status'], string> = {
  ONLINE: '#10b981', DEGRADED: '#f59e0b', OFFLINE: '#ef4444', UNKNOWN: '#94a3b8',
};
const icons: Record<string, ReactNode> = {
  'backend-api': <Server size={18} />, postgresql: <Database size={18} />, 'database-backup-dr': <ShieldCheck size={18} />,
};
const title = (service: string) => service.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

function StatusBadge({ status }: { status: Service['status'] }) {
  return <span style={{ color: colors[status], fontSize: 12, fontWeight: 700 }}>{status === 'ONLINE' ? '●' : '◆'} {labels[status]}</span>;
}

export default function SystemCheckPage() {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['monitoring-status'],
    queryFn: async () => (await api.get('/monitoring/status')).data.data,
    refetchInterval: 30000,
  });
  const services = (data?.services || []) as Service[];
  const summary = data?.summary || { servicesOnline: 0, servicesDegraded: 0, servicesOffline: 0, activeIncidents: 0 };
  const status = data?.status || 'UNKNOWN';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin" style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 8, background: 'var(--bd)', color: 'var(--t1)' }}><ArrowLeft size={18} /></Link>
          <div><h1 className="pg-h" style={{ fontSize: 24, marginBottom: 4 }}>System Check</h1><p className="pg-sh">Operational health, incidents, performance, and disaster-recovery status</p></div>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 8, border: '1px solid var(--bd)', background: 'transparent', color: 'var(--t1)', cursor: isFetching ? 'wait' : 'pointer' }}>
          {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>

      <section style={{ padding: 22, borderRadius: 14, border: `1px solid ${colors[status === 'CRITICAL' ? 'OFFLINE' : status === 'WARNING' ? 'DEGRADED' : 'ONLINE']}55`, background: 'var(--c2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Activity size={22} color={status === 'ONLINE' ? '#10b981' : '#f59e0b'} /><div><div style={{ color: status === 'ONLINE' ? '#10b981' : '#f59e0b', fontWeight: 800, letterSpacing: '.04em' }}>{status === 'ONLINE' ? 'ALL SYSTEMS OPERATIONAL' : 'SYSTEM ATTENTION REQUIRED'}</div><div style={{ color: 'var(--t3)', fontSize: 12, marginTop: 4 }}>Last check: {data?.checkedAt ? new Date(data.checkedAt).toLocaleString() : 'Not checked'}</div></div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginTop: 20 }}>
          {[[summary.servicesOnline, 'Online', '#10b981'], [summary.servicesDegraded, 'Degraded', '#f59e0b'], [summary.servicesOffline, 'Offline', '#ef4444'], [summary.activeIncidents, 'Active incidents', '#a78bfa']].map(([value, label, color]) => <div key={String(label)} style={{ padding: 14, borderRadius: 10, background: 'rgba(255,255,255,.03)' }}><div style={{ color, fontSize: 22, fontWeight: 800 }}>{value}</div><div style={{ color: 'var(--t3)', fontSize: 11 }}>{label}</div></div>)}
        </div>
      </section>

      {isLoading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)' }}><Loader2 size={30} className="animate-spin" /> Checking services...</div> : <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(285px,1fr))', gap: 14 }}>
        {services.map((service) => <article key={service.service} onClick={() => setSelectedService(selectedService === service.service ? null : service.service)} style={{ padding: 18, borderRadius: 12, border: `1px solid ${selectedService === service.service ? colors[service.status] : 'var(--bd)'}`, background: 'var(--c2)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}><div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--t1)' }}>{icons[service.service] || <Activity size={18} />}<strong style={{ fontSize: 13 }}>{title(service.service)}</strong></div><StatusBadge status={service.status} /></div>
          <p style={{ color: 'var(--t3)', fontSize: 12, lineHeight: 1.5, margin: '12px 0 0' }}>{service.errorMessage || (service.status === 'ONLINE' ? 'Last check succeeded' : 'No additional details')}</p>
          {selectedService === service.service && <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--bd)', fontSize: 12, color: 'var(--t2)' }}><div>Severity: <strong>{service.severity}</strong></div>{service.responseTimeMs != null && <div>Latency: <strong>{service.responseTimeMs}ms</strong></div>}{service.metadata && <pre style={{ whiteSpace: 'pre-wrap', fontSize: 10, color: 'var(--t3)' }}>{JSON.stringify(service.metadata, null, 2)}</pre>}</div>}
        </article>)}
      </section>}

      <section style={{ padding: 20, borderRadius: 14, border: '1px solid #f59e0b55', background: 'var(--c2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}><AlertTriangle size={19} color="#f59e0b" /><strong style={{ color: 'var(--t1)' }}>Database Backup / DR</strong><span style={{ marginLeft: 'auto', color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>LIMITED PROTECTION</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, color: 'var(--t2)', fontSize: 12 }}><div>Provider: <strong>Neon</strong></div><div>Plan: <strong>free_v3</strong></div><div>Production branch: <strong>production</strong></div><div>History retention: <strong>6 hours</strong></div><div>Automatic snapshots: <strong>Not configured</strong></div><div>Latest restore verification: <strong style={{ color: '#10b981' }}>PASSED</strong></div></div>
        <p style={{ color: 'var(--t3)', fontSize: 12, lineHeight: 1.6, marginBottom: 0 }}>Restore capability has been verified in a temporary branch. Current Neon retention and snapshot automation do not yet prove a 24-hour RPO or 4-hour RTO; those are targets, not current guarantees.</p>
      </section>

      {data?.performance && <section style={{ padding: 20, borderRadius: 14, border: '1px solid var(--bd)', background: 'var(--c2)' }}><strong style={{ color: 'var(--t1)' }}>Performance (recorded checks)</strong><div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 14, color: 'var(--t2)', fontSize: 12 }}><span>Samples: <strong>{data.performance.samples24h}</strong></span><span>Average: <strong>{data.performance.averageMs ?? '—'}ms</strong></span><span>P50: <strong>{data.performance.p50Ms ?? '—'}ms</strong></span><span>P95: <strong>{data.performance.p95Ms ?? '—'}ms</strong></span><span>P99: <strong>{data.performance.p99Ms ?? '—'}ms</strong></span></div></section>}
    </div>
  );
}
