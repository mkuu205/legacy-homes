'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  Database,
  Globe,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Server,
  ShieldCheck,
  Settings2,
  Webhook,
  X,
} from 'lucide-react';
import Link from 'next/link';

type ServiceStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
type DiagnosticStatus = 'PASS' | 'WARNING' | 'FAIL' | 'NOT_TESTED';

type Diagnostic = {
  key: string;
  label: string;
  status: DiagnosticStatus;
  message: string;
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

type Service = {
  service: string;
  status: ServiceStatus;
  severity?: string;
  responseTimeMs?: number | null;
  errorMessage?: string | null;
  checkedAt?: string;
  metadata?: {
    diagnostics?: Diagnostic[];
    configSummary?: Record<string, unknown>;
  } & Record<string, unknown>;
  details?: {
    healthCheck?: string;
    lastSuccessfulAt?: string | null;
    lastFailedAt?: string | null;
    consecutiveFailures: number;
    recentChecks: Service[];
    incidents: Incident[];
    currentIncident?: Incident | null;
    latency: {
      averageMs?: number | null;
      p50Ms?: number | null;
      p95Ms?: number | null;
      p99Ms?: number | null;
    };
  };
};

type MonitoringData = {
  status?: 'ONLINE' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  checkedAt?: string;
  serverTime?: string;
  source?: string;
  services?: Service[];
  incidents?: Incident[];
  summary?: {
    servicesOnline: number;
    servicesDegraded: number;
    servicesOffline: number;
    activeIncidents: number;
    uptime24h?: number | null;
  };
  performance?: {
    samples24h: number;
    averageMs?: number | null;
    p50Ms?: number | null;
    p95Ms?: number | null;
    p99Ms?: number | null;
  };
};

const monitoredServices = [
  'backend-api',
  'postgresql',
  'pesapal',
  'tuma',
  'payment-callback',
  'email',
  'talksasa',
  'environment-variables',
  'socket-io',
  'authentication',
  'billing',
  'notifications',
  'database-backup-dr',
];

const statusColor: Record<ServiceStatus, string> = {
  ONLINE: '#10b981',
  DEGRADED: '#f59e0b',
  OFFLINE: '#ef4444',
  UNKNOWN: '#94a3b8',
};

const statusLabel: Record<ServiceStatus, string> = {
  ONLINE: 'Online',
  DEGRADED: 'Degraded',
  OFFLINE: 'Offline',
  UNKNOWN: 'Unknown',
};

const diagnosticColor: Record<DiagnosticStatus, string> = {
  PASS: '#10b981',
  WARNING: '#f59e0b',
  FAIL: '#ef4444',
  NOT_TESTED: '#94a3b8',
};

const diagnosticGlyph: Record<DiagnosticStatus, string> = {
  PASS: '✓',
  WARNING: '⚠',
  FAIL: '✕',
  NOT_TESTED: '⏸',
};

const serviceTitle: Record<string, string> = {
  'backend-api': 'Backend API',
  postgresql: 'PostgreSQL Database',
  pesapal: 'Pesapal API',
  tuma: 'TUMA API',
  'payment-callback': 'Payment Callback Endpoint',
  email: 'Email Service',
  talksasa: 'TalkSasa SMS',
  'environment-variables': 'Environment Variables',
  'socket-io': 'Realtime Transport',
  authentication: 'Authentication',
  billing: 'Billing',
  notifications: 'Notifications',
  'database-backup-dr': 'Database Backup / DR',
};

const serviceIcon: Record<string, ReactNode> = {
  'backend-api': <Server size={19} />,
  postgresql: <Database size={19} />,
  pesapal: <CreditCard size={19} />,
  tuma: <CreditCard size={19} />,
  'payment-callback': <Webhook size={19} />,
  email: <Mail size={19} />,
  talksasa: <Phone size={19} />,
  'environment-variables': <Settings2 size={19} />,
  'database-backup-dr': <ShieldCheck size={19} />,
  'socket-io': <Globe size={19} />,
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Invalid timestamp' : date.toLocaleString();
};

const formatTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString();
};

function StatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: statusColor[status], fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
      <span aria-hidden="true">{status === 'ONLINE' ? '●' : '◆'}</span>
      {statusLabel[status]}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ minWidth: 0, padding: '11px 12px', borderRadius: 10, background: 'rgba(255,255,255,.035)' }}>
      <div style={{ color: 'var(--t3)', fontSize: 10, letterSpacing: '.05em', textTransform: 'uppercase' }}>{label}</div>
      <strong style={{ display: 'block', overflow: 'hidden', color: 'var(--t1)', fontSize: 13, marginTop: 4, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</strong>
    </div>
  );
}

function flattenBooleans(value: unknown, prefix = ''): Array<[string, boolean]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'boolean') return [[path, child] as [string, boolean]];
    return flattenBooleans(child, path);
  });
}

function ServiceDetails({ service, onClose }: { service: Service; onClose: () => void }) {
  const details = service.details;
  const diagnostics = service.metadata?.diagnostics || [];
  const configChecks = flattenBooleans(service.metadata?.configSummary);
  const incident = details?.currentIncident;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`${serviceTitle[service.service] || service.service} details`} onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end', background: 'rgba(2,6,23,.68)' }}>
      <aside onClick={(event) => event.stopPropagation()} style={{ width: 'min(600px, 100%)', height: '100%', overflowY: 'auto', background: 'var(--c1)', borderLeft: '1px solid var(--bd)', boxShadow: '-16px 0 45px rgba(0,0,0,.28)' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 1, padding: '18px 20px', background: 'var(--c1)', borderBottom: '1px solid var(--bd)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, color: 'var(--t1)' }}>
              {serviceIcon[service.service] || <Activity size={19} />}
              <div style={{ minWidth: 0 }}>
                <h2 style={{ overflow: 'hidden', margin: 0, fontSize: 19, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{serviceTitle[service.service] || service.service}</h2>
                <div style={{ marginTop: 5 }}><StatusBadge status={service.status} /></div>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close service details" style={{ flex: '0 0 auto', padding: 7, border: '1px solid var(--bd)', borderRadius: 8, background: 'transparent', color: 'var(--t1)', cursor: 'pointer' }}><X size={17} /></button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 18, padding: 20 }}>
          <section style={{ padding: 15, border: `1px solid ${statusColor[service.status]}66`, borderRadius: 12, background: 'var(--c2)' }}>
            <div style={{ color: 'var(--t2)', fontSize: 13, lineHeight: 1.55 }}>{service.errorMessage || (service.status === 'ONLINE' ? 'The latest health check completed successfully.' : 'No additional health explanation was returned.')}</div>
            <div style={{ marginTop: 8, color: 'var(--t3)', fontSize: 11 }}>Checked: {formatDate(service.checkedAt)}</div>
          </section>

          <section>
            <h3 style={{ margin: '0 0 10px', color: 'var(--t1)', fontSize: 13 }}>Diagnostic checks</h3>
            {diagnostics.length ? <div style={{ display: 'grid', gap: 8 }}>{diagnostics.map((check) => <div key={check.key} style={{ padding: 11, border: `1px solid ${diagnosticColor[check.status]}44`, borderRadius: 9, background: 'rgba(255,255,255,.025)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, color: diagnosticColor[check.status], fontSize: 12, fontWeight: 800 }}><span aria-hidden="true">{diagnosticGlyph[check.status]}</span><span>{check.label}</span><span style={{ marginLeft: 'auto', fontSize: 10, whiteSpace: 'nowrap' }}>{check.status.replace('_', ' ')}</span></div><div style={{ marginTop: 5, color: 'var(--t2)', fontSize: 11, lineHeight: 1.5 }}>{check.message}</div></div>)}</div> : <div style={{ color: 'var(--t3)', fontSize: 12 }}>No individual diagnostic results were returned.</div>}
          </section>

          {(configChecks.length > 0 || service.responseTimeMs != null || details) && <section><h3 style={{ margin: '0 0 10px', color: 'var(--t1)', fontSize: 13 }}>Check summary</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}><Metric label="Last successful" value={formatDate(details?.lastSuccessfulAt)} /><Metric label="Last failed" value={formatDate(details?.lastFailedAt)} /><Metric label="Response time" value={service.responseTimeMs != null ? `${service.responseTimeMs} ms` : 'Not recorded'} /><Metric label="Failures" value={details?.consecutiveFailures ?? 0} /></div></section>}

          {configChecks.length > 0 && <section><h3 style={{ margin: '0 0 10px', color: 'var(--t1)', fontSize: 13 }}>Configuration summary</h3><div style={{ display: 'grid', gap: 7 }}>{configChecks.map(([key, value]) => <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.035)', color: value ? '#10b981' : '#ef4444', fontSize: 11 }}><span style={{ overflow: 'hidden', color: 'var(--t2)', textOverflow: 'ellipsis' }}>{key}</span><strong>{value ? 'Configured' : 'Missing'}</strong></div>)}</div></section>}

          {details && <section><h3 style={{ margin: '0 0 10px', color: 'var(--t1)', fontSize: 13 }}>Performance history</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}><Metric label="Average" value={details.latency.averageMs != null ? `${details.latency.averageMs} ms` : '—'} /><Metric label="P50" value={details.latency.p50Ms != null ? `${details.latency.p50Ms} ms` : '—'} /><Metric label="P95" value={details.latency.p95Ms != null ? `${details.latency.p95Ms} ms` : '—'} /><Metric label="P99" value={details.latency.p99Ms != null ? `${details.latency.p99Ms} ms` : '—'} /></div></section>}

          <section><h3 style={{ margin: '0 0 10px', color: 'var(--t1)', fontSize: 13 }}>Incidents</h3>{incident ? <div style={{ padding: 12, border: '1px solid #f59e0b66', borderRadius: 9, background: 'rgba(245,158,11,.06)', color: 'var(--t2)', fontSize: 12 }}><strong style={{ color: '#f59e0b' }}>{incident.severity} — {incident.status}</strong><div style={{ marginTop: 7 }}>{incident.errorMessage || 'Failure detected by monitoring.'}</div><div style={{ marginTop: 7 }}>Started: {formatDate(incident.startedAt)}<br />Failures: {incident.failureCount}</div></div> : <div style={{ color: 'var(--t3)', fontSize: 12 }}>No active incidents.</div>}</section>

          <section style={{ paddingBottom: 12 }}><h3 style={{ margin: '0 0 10px', color: 'var(--t1)', fontSize: 13 }}>Recent checks</h3>{details?.recentChecks?.length ? details.recentChecks.slice(0, 8).map((check, index) => <div key={`${check.checkedAt || 'check'}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--bd)', color: 'var(--t2)', fontSize: 11 }}><span style={{ color: statusColor[check.status] }}>{check.status === 'ONLINE' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}</span><span style={{ flex: 1 }}>{formatDate(check.checkedAt)}</span><strong style={{ color: statusColor[check.status] }}>{statusLabel[check.status]}</strong></div>) : <div style={{ color: 'var(--t3)', fontSize: 12 }}>No historical checks available yet.</div>}</section>
        </div>
      </aside>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return <div style={{ padding: 13, borderRadius: 10, background: 'rgba(255,255,255,.035)' }}><div style={{ color, fontSize: 21, fontWeight: 800 }}>{value}</div><div style={{ marginTop: 3, color: 'var(--t3)', fontSize: 11 }}>{label}</div></div>;
}

export default function SystemCheckPage() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<MonitoringData>({ queryKey: ['monitoring-status'], queryFn: async () => (await api.get('/monitoring/status')).data.data, refetchInterval: 30000, retry: 1 });
  const returnedServices = data?.services || [];
  const services = useMemo(() => monitoredServices.map((serviceName) => returnedServices.find((service) => service.service === serviceName) || { service: serviceName, status: 'UNKNOWN' as const, severity: 'WARNING', errorMessage: 'Monitoring data is unavailable; no health result was returned.' }), [returnedServices]);
  const summary = data?.summary || { servicesOnline: 0, servicesDegraded: 0, servicesOffline: 0, activeIncidents: 0 };
  const overallStatus: ServiceStatus = data?.status === 'CRITICAL' ? 'OFFLINE' : data?.status === 'WARNING' ? 'DEGRADED' : data?.status === 'ONLINE' ? 'ONLINE' : 'UNKNOWN';
  const hasLiveData = returnedServices.length > 0;

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}><div style={{ display: 'flex', alignItems: 'center', gap: 11 }}><Link href="/admin" aria-label="Back to admin dashboard" style={{ display: 'grid', width: 34, height: 34, placeItems: 'center', borderRadius: 8, background: 'var(--bd)', color: 'var(--t1)' }}><ArrowLeft size={18} /></Link><div><h1 className="pg-h" style={{ marginBottom: 3, fontSize: 24 }}>System Check</h1><p className="pg-sh">Real-time health overview of critical services</p></div></div><button type="button" onClick={() => refetch()} disabled={isFetching} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', border: '1px solid var(--bd)', borderRadius: 8, background: 'transparent', color: 'var(--t1)', cursor: isFetching ? 'wait' : 'pointer' }}>{isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {isFetching ? 'Checking…' : 'Refresh Status'}</button></header>

    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}><div style={{ padding: '17px 19px', border: '1px solid #274568', borderRadius: 16, background: '#142a49' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8ea5c2', fontSize: 12 }}><Clock3 size={15} /> Last server check</div><strong style={{ display: 'block', marginTop: 8, color: '#f5f8ff', fontSize: 16 }}>{formatDate(data?.checkedAt || data?.serverTime)}</strong></div><div style={{ padding: '17px 19px', border: '1px solid #274568', borderRadius: 16, background: '#142a49' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8ea5c2', fontSize: 12 }}><Globe size={15} /> Application timezone</div><strong style={{ display: 'block', marginTop: 8, color: '#f5f8ff', fontSize: 16 }}>Africa/Nairobi</strong></div></section>

    <section style={{ padding: 19, border: `1px solid ${statusColor[overallStatus]}55`, borderRadius: 16, background: 'var(--c2)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 11 }}><Activity size={21} color={statusColor[overallStatus]} /><div><div style={{ color: statusColor[overallStatus], fontSize: 13, fontWeight: 800, letterSpacing: '.04em' }}>{overallStatus === 'ONLINE' ? 'ALL SYSTEMS OPERATIONAL' : overallStatus === 'UNKNOWN' ? 'MONITORING DATA UNAVAILABLE' : 'SYSTEM ATTENTION REQUIRED'}</div><div style={{ marginTop: 4, color: 'var(--t3)', fontSize: 11 }}>{data?.checkedAt ? `Checked ${formatTime(data.checkedAt)}` : 'No completed health check is available.'}</div></div></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: 9, marginTop: 17 }}><SummaryCard label="Online" value={summary.servicesOnline} color="#10b981" /><SummaryCard label="Degraded" value={summary.servicesDegraded} color="#f59e0b" /><SummaryCard label="Offline" value={summary.servicesOffline} color="#ef4444" /><SummaryCard label="Active incidents" value={summary.activeIncidents} color="#a78bfa" /></div></section>

    {isError && <section role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 13, border: '1px solid #f59e0b66', borderRadius: 11, background: 'rgba(245,158,11,.08)', color: '#fbbf24', fontSize: 12 }}><AlertTriangle size={16} /><div><strong>Monitoring data could not be loaded.</strong><div style={{ marginTop: 4, color: 'var(--t2)' }}>{error instanceof Error ? error.message : 'The authenticated monitoring request failed. Cards remain Unknown until the API responds.'}</div></div></section>}

    {isLoading ? <div style={{ padding: 42, textAlign: 'center', color: 'var(--t2)' }}><Loader2 size={30} className="animate-spin" /><div style={{ marginTop: 10 }}>Checking services…</div></div> : <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(265px, 1fr))', gap: 13 }}>{services.map((service) => <article key={service.service} role="button" tabIndex={0} aria-label={`View ${serviceTitle[service.service] || service.service} diagnostics`} onClick={() => setSelectedService(service)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedService(service); } }} style={{ minHeight: 128, padding: '19px 20px', border: `1px solid ${selectedService?.service === service.service ? statusColor[service.status] : '#274568'}`, borderRadius: 18, background: '#142a49', cursor: 'pointer', boxShadow: selectedService?.service === service.service ? `0 0 0 2px ${statusColor[service.status]}22` : '0 8px 22px rgba(0,0,0,.12)' }}><div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}><div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, color: '#f5f8ff' }}>{serviceIcon[service.service] || <Activity size={19} />}<strong style={{ overflow: 'hidden', fontSize: 15, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{serviceTitle[service.service] || service.service}</strong></div><StatusBadge status={service.status} /></div><p style={{ display: '-webkit-box', overflow: 'hidden', margin: '17px 0 0', color: '#9bb0c8', fontSize: 12, lineHeight: 1.5, WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>{service.errorMessage || (service.status === 'ONLINE' ? 'Health check passed. Tap for diagnostics.' : service.status === 'UNKNOWN' ? 'No health result returned.' : 'Tap for failure details.')}</p><div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 13, color: '#718bab', fontSize: 10 }}><Clock3 size={12} /> {service.checkedAt ? `Checked ${formatTime(service.checkedAt)}` : 'Awaiting check'}<span style={{ marginLeft: 'auto' }}>View details →</span></div></article>)}</section>}

    {hasLiveData && data?.performance && <section style={{ padding: 17, border: '1px solid var(--bd)', borderRadius: 13, background: 'var(--c2)' }}><strong style={{ color: 'var(--t1)', fontSize: 13 }}>Recorded performance</strong><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: 9, marginTop: 12 }}><Metric label="Samples" value={data.performance.samples24h} /><Metric label="Average" value={data.performance.averageMs != null ? `${data.performance.averageMs} ms` : '—'} /><Metric label="P50" value={data.performance.p50Ms != null ? `${data.performance.p50Ms} ms` : '—'} /><Metric label="P95" value={data.performance.p95Ms != null ? `${data.performance.p95Ms} ms` : '—'} /><Metric label="P99" value={data.performance.p99Ms != null ? `${data.performance.p99Ms} ms` : '—'} /></div></section>}
    {selectedService && <ServiceDetails service={selectedService} onClose={() => setSelectedService(null)} />}
  </div>;
}
