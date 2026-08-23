'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { usePWA } from '@/hooks/usePWA';
import { ArrowRight, Download, RefreshCw, ShieldCheck, Smartphone, Wrench } from 'lucide-react';

type Release = {
  versionName: string;
  versionCode: number;
  releaseNotes?: string | null;
  downloadUrl: string;
  fileName: string;
  fileSizeBytes: number;
  checksumSha256: string;
  publishedAt?: string | null;
};

type Data = {
  release: Release | null;
  maintenance: { enabled: boolean; message?: string | null };
};

export default function AppDownloadsPage() {
  const { isInstallable, installApp } = usePWA();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/app-releases/current')
      .then((response) => setData(response.data.data))
      .catch(() => setError('Unable to load app release information.'))
      .finally(() => setLoading(false));
  }, []);

  const size = data?.release ? `${(data.release.fileSizeBytes / 1024 / 1024).toFixed(1)} MB` : '';

  return (
    <main className="page" style={{ maxWidth: 920, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <p className="eyebrow">MOBILE ACCESS</p>
        <h1 className="pg-h">Download / Install PWA</h1>
        <p style={{ color: 'var(--t2)', marginTop: 6 }}>
          Use Legacy Homes like an app from your browser, without an app store.
        </p>
      </div>

      <section className="card" aria-labelledby="install-pwa-title" style={{ padding: 24, marginBottom: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ flex: '1 1 420px' }}>
            <p className="eyebrow">TAKE LEGACY HOMES WITH YOU</p>
            <h2 id="install-pwa-title" style={{ color: 'var(--t1)', margin: '8px 0' }}>Install the Legacy Homes PWA.</h2>
            <p style={{ color: 'var(--t2)', lineHeight: 1.6, margin: 0 }}>
              Get a faster, app-like way to check bills, make payments, and stay connected. The PWA works from your browser and can be added to your home screen without an app store.
            </p>
          </div>
          <div style={{ flex: '0 1 260px' }}>
            {isInstallable ? (
              <button type="button" className="btn btn-primary" onClick={() => void installApp()} style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                Install PWA <ArrowRight size={17} />
              </button>
            ) : (
              <a href="/login" className="btn btn-primary" style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                Open Legacy Homes <ArrowRight size={17} />
              </a>
            )}
            <p style={{ color: 'var(--t3)', fontSize: 12, lineHeight: 1.5, margin: '12px 0 0' }}>
              On Android Chrome, use the install button or browser menu. On iPhone, tap Share, then “Add to Home Screen.”
            </p>
          </div>
        </div>
      </section>

      {data?.maintenance?.enabled && (
        <div style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(245,158,11,.35)', background: 'rgba(245,158,11,.08)', display: 'flex', gap: 12, marginBottom: 18 }}>
          <Wrench size={20} color="#f59e0b" />
          <div><strong>Android app maintenance in progress</strong><p style={{ margin: '4px 0 0', color: 'var(--t2)' }}>{data.maintenance.message || 'The Android app is temporarily being updated. Please try again shortly.'}</p></div>
        </div>
      )}

      <section aria-labelledby="android-release-title">
        <div style={{ marginBottom: 12 }}>
          <p className="eyebrow">OPTIONAL ANDROID APK</p>
          <h2 id="android-release-title" style={{ color: 'var(--t1)', margin: 0 }}>Download the Android app</h2>
        </div>
        {loading ? (
          <div className="card" style={{ padding: 28, textAlign: 'center' }}><RefreshCw size={22} className="spin" /> Loading app information...</div>
        ) : error ? (
          <div className="card" style={{ padding: 28, color: '#ef4444' }}>{error}</div>
        ) : data?.release ? (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--gl)', display: 'grid', placeItems: 'center', color: 'var(--ac)' }}><Smartphone size={26} /></div>
              <div><h3 style={{ margin: 0, color: 'var(--t1)' }}>Legacy Homes Android</h3><p style={{ margin: '4px 0 0', color: 'var(--t2)' }}>Latest version {data.release.versionName}</p></div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}><span className="badge">Version {data.release.versionName}</span><span className="badge">{size}</span><span className="badge">Official release</span></div>
            {data.release.releaseNotes && <div style={{ marginBottom: 20 }}><h4 style={{ fontSize: 14, color: 'var(--t1)' }}>What’s new</h4><p style={{ whiteSpace: 'pre-wrap', color: 'var(--t2)', lineHeight: 1.6 }}>{data.release.releaseNotes}</p></div>}
            <a href={data.release.downloadUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}><Download size={16} /> Download APK</a>
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--bd)', color: 'var(--t3)', fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}><ShieldCheck size={16} /><span>Only install APK files downloaded from the official Legacy Homes dashboard. Android may ask you to allow installation from your browser the first time.</span></div>
            <p style={{ marginTop: 12, color: 'var(--t3)', fontSize: 11, wordBreak: 'break-all' }}>SHA-256: {data.release.checksumSha256}</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 28, textAlign: 'center' }}><Smartphone size={28} style={{ color: 'var(--t3)' }} /><h3 style={{ color: 'var(--t1)' }}>No Android release yet</h3><p style={{ color: 'var(--t2)' }}>The PWA is ready to install now. An Android APK will appear here when it is published.</p></div>
        )}
      </section>
    </main>
  );
}
