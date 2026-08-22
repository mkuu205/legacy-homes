'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Download, RefreshCw, ShieldCheck, Wrench, Smartphone } from 'lucide-react';

type Release = { versionName: string; versionCode: number; releaseNotes?: string | null; downloadUrl: string; fileName: string; fileSizeBytes: number; checksumSha256: string; publishedAt?: string | null };
type Data = { release: Release | null; maintenance: { enabled: boolean; message?: string | null } };

export default function AppDownloadsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/app-releases/current').then((response) => setData(response.data.data)).catch(() => setError('Unable to load app release information.')).finally(() => setLoading(false));
  }, []);

  const size = data?.release ? `${(data.release.fileSizeBytes / 1024 / 1024).toFixed(1)} MB` : '';
  return <main className="page" style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
    <div style={{ marginBottom: 24 }}><p className="eyebrow">MOBILE ACCESS</p><h1 className="pg-h">App Downloads</h1><p style={{ color: 'var(--t2)', marginTop: 6 }}>Download the official Legacy Homes Android app and keep your resident services close at hand.</p></div>
    {data?.maintenance?.enabled && <div style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(245,158,11,.35)', background: 'rgba(245,158,11,.08)', display: 'flex', gap: 12, marginBottom: 18 }}><Wrench size={20} color="#f59e0b" /><div><strong>App maintenance in progress</strong><p style={{ margin: '4px 0 0', color: 'var(--t2)' }}>{data.maintenance.message || 'The Android app is temporarily being updated. Please try again shortly.'}</p></div></div>}
    {loading ? <div className="card" style={{ padding: 28, textAlign: 'center' }}><RefreshCw size={22} className="spin" /> Loading app information...</div> : error ? <div className="card" style={{ padding: 28, color: '#ef4444' }}>{error}</div> : data?.release ? <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}><div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--gl)', display: 'grid', placeItems: 'center', color: 'var(--ac)' }}><Smartphone size={26} /></div><div><h2 style={{ margin: 0, color: 'var(--t1)' }}>Legacy Homes Android</h2><p style={{ margin: '4px 0 0', color: 'var(--t2)' }}>Latest version {data.release.versionName}</p></div></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}><span className="badge">Version {data.release.versionName}</span><span className="badge">{size}</span><span className="badge">Official release</span></div>
      {data.release.releaseNotes && <div style={{ marginBottom: 20 }}><h3 style={{ fontSize: 14, color: 'var(--t1)' }}>What’s new</h3><p style={{ whiteSpace: 'pre-wrap', color: 'var(--t2)', lineHeight: 1.6 }}>{data.release.releaseNotes}</p></div>}
      <a href={data.release.downloadUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}><Download size={16} /> Download APK</a>
      <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--bd)', color: 'var(--t3)', fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}><ShieldCheck size={16} /><span>Only install APK files downloaded from the official Legacy Homes dashboard. Android may ask you to allow installation from your browser the first time.</span></div>
      <p style={{ marginTop: 12, color: 'var(--t3)', fontSize: 11, wordBreak: 'break-all' }}>SHA-256: {data.release.checksumSha256}</p>
    </div> : <div className="card" style={{ padding: 28, textAlign: 'center' }}><Smartphone size={28} style={{ color: 'var(--t3)' }} /><h2 style={{ color: 'var(--t1)' }}>No app release yet</h2><p style={{ color: 'var(--t2)' }}>The latest Android download will appear here when it is published.</p></div>}
  </main>;
}
