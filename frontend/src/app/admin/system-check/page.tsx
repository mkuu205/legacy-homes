'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, RefreshCw, Loader2, Server, Database, Activity, ShieldCheck, AlertTriangle, X, CheckCircle2, Clock3 } from 'lucide-react';
import Link from 'next/link';

type Diagnostic = { key: string; label: string; status: 'PASS' | 'WARNING' | 'FAIL' | 'NOT_TESTED'; message: string };

type Service = {
  service: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
  severity: string;
  responseTimeMs?: number | null;
  errorMessage?: string | null;
  metadata?: (Record<string, unknown> & { diagnostics?: Diagnostic[]; configSummary?: Record<string, unknown> }) | null;
  checkedAt?: string;
  details?: {
    healthCheck: string;
    lastSuccessfulAt?: string | null;
    lastFailedAt?: string | null;
    consecutiveFailures: number;
    recentChecks: Service[];
    incidents: Incident[];
    currentIncident?: Incident | null;
    latency: { averageMs?: number | null; p50Ms?: number | null; p95Ms?: number | null; p99Ms?: number | null };
  };
};

type Incident = {
  id: string;
  service: string;
  severity: string;
  status: string;
  startedAt: string;
  lastFailureAt?: string | null;
  resolvedAt?: string | null;
  failureCount: number;
  errorMessage?: string | null;
  detectionSource?: string;
};

const labels: Record<Service['status'], string> = { ONLINE: 'Online', DEGRADED: 'Degraded', OFFLINE: 'Offline', UNKNOWN: 'Unknown' };
const colors: Record<Service['status'], string> = { ONLINE: '#10b981', DEGRADED: '#f59e0b', OFFLINE: '#ef4444', UNKNOWN: '#94a3b8' };
const icons: Record<string, ReactNode> = { 'backend-api': <Server size={18} />, postgresql: <Database size={18} />, 'database-backup-dr': <ShieldCheck size={18} /> };
const title = (service: string) => service.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : 'None recorded';
const monitoredServices = ['backend-api', 'postgresql', 'pesapal', 'tuma', 'payment-callback', 'email', 'talksasa', 'socket-io', 'authentication', 'billing', 'notifications', 'monitoring', 'database-backup-dr'];

function StatusBadge({ status }: { status: Service['status'] }) {
  return <span style={{ color: colors[status], fontSize: 14, fontWeight: 700 }}>{status === 'ONLINE' ? '●' : '◆'} {labels[status]}</span>;
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return <div style={{ padding: '10px 12px', borderRadius: 9, background: 'rgba(255,255,255,.035)' }}><div style={{ color: 'var(--t3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div><strong style={{ display: 'block', color: 'var(--t1)', fontSize: 13, marginTop: 4 }}>{value}</strong></div>;
}

function ServiceDetails({ service, onClose }: { service: Service; onClose: () => void }) {
  const details = service.details;
  const incident = details?.currentIncident;
  const diagnostics = (service.metadata?.diagnostics || []) as Diagnostic[];
  const diagnosticColors: Record<Diagnostic['status'], string> = { PASS: '#10b981', WARNING: '#f59e0b', FAIL: '#ef4444', NOT_TESTED: '#94a3b8' };
  const diagnosticGlyph: Record<Diagnostic['status'], string> = { PASS: '✓', WARNING: '⚠', FAIL: '✕', NOT_TESTED: '⏸' };
  return <div role="dialog" aria-modal="true" aria-label={`${title(service.service)} details`} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(2,6,23,.62)', display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
    <aside onClick={(event) => event.stopPropagation()} style={{ width: 'min(560px, 100%)', height: '100%', overflowY: 'auto', background: 'var(--c1)', borderLeft: '1px solid var(--bd)', padding: 22, boxShadow: '-12px 0 40px rgba(0,0,0,.25)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}><div><div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--t1)' }}>{icons[service.service] || <Activity size={19} />}<h2 style={{ margin: 0, fontSize: 20 }}>{title(service.service)}</h2></div><p style={{ color: 'var(--t3)', fontSize: 12, margin: '7px 0 0' }}>{service.service === 'tuma' || service.service === 'pesapal' ? 'Payment Provider Health' : 'Operational service health'}</p></div><button onClick={onClose} aria-label="Close service details" style={{ border: '1px solid var(--bd)', background: 'transparent', color: 'var(--t1)', borderRadius: 8, padding: 7, cursor: 'pointer' }}><X size={17} /></button></div>
      <div style={{ marginTop: 20, padding: 16, borderRadius: 12, border: `1px solid ${colors[service.status]}66`, background: 'var(--c2)' }}><StatusBadge status={service.status} /><div style={{ color: 'var(--t2)', fontSize: 12, marginTop: 10 }}>{service.errorMessage || (service.status === 'ONLINE' ? 'Latest check succeeded.' : 'No additional failure details recorded.')}</div><div style={{ color: 'var(--t3)', fontSize: 11, marginTop: 9 }}>Last checked: {formatDate(service.checkedAt)}</div></div>
      <section style={{ marginTop: 18 }}><h3 style={{ color: 'var(--t1)', fontSize: 13, margin: '0 0 10px' }}>Health check</h3><div style={{ color: 'var(--t2)', fontSize: 12, lineHeight: 1.6 }}>What was checked: <strong>{details?.healthCheck || 'Operational health check'}</strong><br />Configuration is not treated as proof of provider availability.</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8, marginTop: 10 }}><Metric label="Last successful" value={formatDate(details?.lastSuccessfulAt)} /><Metric label="Last failed" value={formatDate(details?.lastFailedAt)} /><Metric label="Consecutive failures" value={details?.consecutiveFailures ?? 0} /><Metric label="Latest latency" value={service.responseTimeMs != null ? `${service.responseTimeMs} ms` : 'Not recorded'} /></div></section>
      <section style={{ marginTop: 20 }}><h3 style={{ color: 'var(--t1)', fontSize: 13, margin: '0 0 10px' }}>Diagnostic checks</h3>{diagnostics.length ? <div style={{ display: 'grid', gap: 8 }}>{diagnostics.map((check) => <div key={check.key} style={{ padding: 10, borderRadius: 9, border: `1px solid ${diagnosticColors[check.status]}44`, background: 'rgba(255,255,255,.025)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, color: diagnosticColors[check.status], fontSize: 12, fontWeight: 700 }}><span aria-hidden="true">{diagnosticGlyph[check.status]}</span><span>{check.label}</span><span style={{ marginLeft: 'auto' }}>{check.status.replace('_', ' ')}</span></div><div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.5, marginTop: 5 }}>{check.message}</div></div>)}</div> : <div style={{ color: 'var(--t3)', fontSize: 12 }}>No individual diagnostic results were returned by the backend.</div>}</section>
      <section style={{ marginTop: 20 }}><h3 style={{ color: 'var(--t1)', fontSize: 13, margin: '0 0 10px' }}>Performance history</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 7 }}><Metric label="Average" value={details?.latency.averageMs != null ? `${details.latency.averageMs} ms` : '—'} /><Metric label="P50" value={details?.latency.p50Ms != null ? `${details.latency.p50Ms} ms` : '—'} /><Metric label="P95" value={details?.latency.p95Ms != null ? `${details.latency.p95Ms} ms` : '—'} /><Metric label="P99" value={details?.latency.p99Ms != null ? `${details.latency.p99Ms} ms` : '—'} /></div></section>
      <section style={{ marginTop: 20 }}><h3 style={{ color: 'var(--t1)', fontSize: 13, margin: '0 0 10px' }}>Recent checks</h3>{details?.recentChecks?.length ? details.recentChecks.map((check) => <div key={check.checkedAt + check.service} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderBottom: '1px solid var(--bd)', color: 'var(--t2)', fontSize: 12 }}>{check.status === 'ONLINE' ? <CheckCircle2 size={14} color="#10b981" /> : <AlertTriangle size={14} color={colors[check.status]} />}<span style={{ flex: 1 }}>{formatDate(check.checkedAt)}</span><strong style={{ color: colors[check.status] }}>{check.status}</strong><span>{check.responseTimeMs != null ? `${check.responseTimeMs} ms` : '—'}</span></div>) : <div style={{ color: 'var(--t3)', fontSize: 12 }}>No historical checks available yet.</div>}</section>
      <section style={{ marginTop: 20 }}><h3 style={{ color: 'var(--t1)', fontSize: 13, margin: '0 0 10px' }}>Incidents</h3>{incident ? <div style={{ padding: 12, borderRadius: 9, border: '1px solid #f59e0b66', background: 'rgba(245,158,11,.06)', color: 'var(--t2)', fontSize: 12 }}><strong style={{ color: '#f59e0b' }}>{incident.severity} — {incident.status}</strong><div style={{ marginTop: 7 }}>{incident.errorMessage || 'Failure detected by monitoring.'}</div><div style={{ marginTop: 7 }}>Started: {formatDate(incident.startedAt)}<br />Failures: {incident.failureCount}<br />Detected by: {incident.detectionSource || 'monitoring'}</div></div> : <div style={{ color: 'var(--t3)', fontSize: 12 }}>No active incidents</div>}{details?.incidents?.filter((item) => item.id !== incident?.id).slice(0, 5).map((item) => <div key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--bd)', color: 'var(--t2)', fontSize: 12 }}><strong>{item.status === 'RECOVERED' ? 'Recovered' : item.severity}</strong> · {formatDate(item.startedAt)}{item.resolvedAt ? ` – ${formatDate(item.resolvedAt)}` : ''}<br />Failure count: {item.failureCount}</div>)}</section>
      <section style={{ marginTop: 20, paddingBottom: 20 }}><h3 style={{ color: 'var(--t1)', fontSize: 13, margin: '0 0 10px' }}>Configuration</h3><div style={{ color: 'var(--t2)', fontSize: 12 }}>Status: <strong>{service.metadata?.configurationOnly ? 'Configuration check' : 'Configuration status not exposed'}</strong></div>{service.metadata?.configSummary != null && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>{Object.entries(service.metadata.configSummary as Record<string, boolean>).map(([key, value]) => <div key={key} style={{ padding: '5px 8px', borderRadius: 6, background: 'var(--bd)', color: value ? '#10b981' : '#ef4444', fontSize: 11 }}>{value ? '✓' : '✕'} {key}</div>)}</div>}<div style={{ color: 'var(--t3)', fontSize: 11, marginTop: 9 }}>Secret values and connection strings are never displayed.</div></section>
    </aside>
  </div>;
}

export default function SystemCheckPage() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const { data, isLoading, isFetching, isError, refetch } = useQuery({ queryKey: ['monitoring-status'], queryFn: async () => (await api.get('/monitoring/status')).data.data, refetchInterval: 30000 });
  const returnedServices = (data?.services || []) as Service[];
  const services = monitoredServices.map((serviceName) => returnedServices.find((service) => service.service === serviceName) || { service: serviceName, status: 'UNKNOWN' as const, severity: 'WARNING', errorMessage: 'Monitoring data is unavailable; no health result was returned.' });
  const summary = data?.summary || { servicesOnline: 0, servicesDegraded: 0, servicesOffline: 0, activeIncidents: 0 };
  const status = data?.status || 'UNKNOWN';
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Link href="/admin" style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 8, background: 'var(--bd)', color: 'var(--t1)' }}><ArrowLeft size={18} /></Link><div><h1 className="pg-h" style={{ fontSize: 24, marginBottom: 4 }}>System Check</h1><p className="pg-sh">Real-time health overview of all critical services</p></div></div><button onClick={() => refetch()} disabled={isFetching} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 8, border: '1px solid var(--bd)', background: 'transparent', color: 'var(--t1)', cursor: isFetching ? 'wait' : 'pointer' }}>{isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh Status</button></div>
    <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
      <div style={{ padding: '22px 26px', borderRadius: 20, border: '1px solid #274568', background: '#142a49' }}><div style={{ color: '#8ea5c2', fontSize: 13 }}>Server Time</div><strong style={{ display: 'block', color: '#f5f8ff', fontSize: 22, marginTop: 7 }}>{new Date().toLocaleTimeString()}</strong></div>
      <div style={{ padding: '22px 26px', borderRadius: 20, border: '1px solid #274568', background: '#142a49' }}><div style={{ color: '#8ea5c2', fontSize: 13 }}>Application Timezone</div><strong style={{ display: 'block', color: '#f5f8ff', fontSize: 18, marginTop: 7 }}>Africa/Nairobi</strong></div>
    </div>
    <section style={{ padding: 22, borderRadius: 14, border: `1px solid ${colors[status === 'CRITICAL' ? 'OFFLINE' : status === 'WARNING' ? 'DEGRADED' : 'ONLINE']}55`, background: 'var(--c2)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Activity size={22} color={status === 'ONLINE' ? '#10b981' : '#f59e0b'} /><div><div style={{ color: status === 'ONLINE' ? '#10b981' : '#f59e0b', fontWeight: 800, letterSpacing: '.04em' }}>{status === 'ONLINE' ? 'ALL SYSTEMS OPERATIONAL' : 'SYSTEM ATTENTION REQUIRED'}</div><div style={{ color: 'var(--t3)', fontSize: 12, marginTop: 4 }}>Last check: {data?.checkedAt ? new Date(data.checkedAt).toLocaleString() : 'Not checked'}</div></div></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginTop: 20 }}>{[[summary.servicesOnline, 'Online', '#10b981'], [summary.servicesDegraded, 'Degraded', '#f59e0b'], [summary.servicesOffline, 'Offline', '#ef4444'], [summary.activeIncidents, 'Active incidents', '#a78bfa']].map(([value, label, color]) => <div key={String(label)} style={{ padding: 14, borderRadius: 10, background: 'rgba(255,255,255,.03)' }}><div style={{ color, fontSize: 22, fontWeight: 800 }}>{value}</div><div style={{ color: 'var(--t3)', fontSize: 11 }}>{label}</div></div>)}</div></section>
    {isLoading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)' }}><Loader2 size={30} className="animate-spin" /> Checking services...</div> : <><section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(285px,1fr))', gap: 14 }}>{services.map((service) => <article key={service.service} onClick={() => setSelectedService(service)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedService(service); }} role="button" tabIndex={0} aria-label={`View ${title(service.service)} details`} style={{ padding: '24px 26px', minHeight: 132, borderRadius: 22, border: '1px solid #274568', background: '#142a49', cursor: 'pointer', boxShadow: '0 8px 22px rgba(0,0,0,.12)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#f5f8ff' }}>{icons[service.service] || <Activity size={22} />}<strong style={{ fontSize: 18 }}>{title(service.service)}</strong></div><StatusBadge status={service.status} /></div><p style={{ color: '#718bab', fontSize: 14, lineHeight: 1.5, margin: '20px 0 0' }}>{service.errorMessage || (service.status === 'ONLINE' ? 'Last check succeeded · View details' : 'View failure details')}</p></article>)}</section>{isError && <div style={{ padding: 14, borderRadius: 12, border: '1px solid #f59e0b66', background: 'rgba(245,158,11,.08)', color: '#fbbf24', fontSize: 12 }}>Monitoring data could not be loaded. The cards remain visible as UNKNOWN until the authenticated production monitoring API responds.</div>}</>}
    <section style={{ padding: 20, borderRadius: 14, border: '1px solid #f59e0b55', background: 'var(--c2)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}><AlertTriangle size={19} color="#f59e0b" /><strong style={{ color: 'var(--t1)' }}>Database Backup / DR</strong><span style={{ marginLeft: 'auto', color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>LIMITED PROTECTION</span></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, color: 'var(--t2)', fontSize: 12 }}><div>Provider: <strong>Neon</strong></div><div>Plan: <strong>free_v3</strong></div><div>Production branch: <strong>production</strong></div><div>History retention: <strong>6 hours</strong></div><div>Automatic snapshots: <strong>Not configured</strong></div><div>Latest restore verification: <strong style={{ color: '#10b981' }}>PASSED</strong></div></div><p style={{ color: 'var(--t3)', fontSize: 12, lineHeight: 1.6, marginBottom: 0 }}>Restore capability has been verified in a temporary branch. Current Neon retention and snapshot automation do not yet prove a 24-hour RPO or 4-hour RTO; those are targets, not current guarantees.</p></section>
    {data?.performance && <section style={{ padding: 20, borderRadius: 14, border: '1px solid var(--bd)', background: 'var(--c2)' }}><strong style={{ color: 'var(--t1)' }}>Performance (recorded checks)</strong><div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 14, color: 'var(--t2)', fontSize: 12 }}><span>Samples: <strong>{data.performance.samples24h}</strong></span><span>Average: <strong>{data.performance.averageMs ?? '—'}ms</strong></span><span>P50: <strong>{data.performance.p50Ms ?? '—'}ms</strong></span><span>P95: <strong>{data.performance.p95Ms ?? '—'}ms</strong></span><span>P99: <strong>{data.performance.p99Ms ?? '—'}ms</strong></span></div></section>}
    {selectedService && <ServiceDetails service={selectedService} onClose={() => setSelectedService(null)} />}
  </div>;
}
