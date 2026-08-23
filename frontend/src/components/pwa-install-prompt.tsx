'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useAuthStore } from '@/store/auth.store';

type NavigatorWithStandalone = Navigator & { standalone?: boolean };
const AUTO_DISMISS_MS = 10000;
const EXIT_ANIMATION_MS = 260;

function isStandaloneMode() {
  const navigatorWithStandalone = navigator as NavigatorWithStandalone;
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
}

function isMobileDevice() {
  return window.matchMedia('(max-width: 700px)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isIOSDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function PWAInstallPrompt() {
  const { isInstallable, installApp } = usePWA();
  const { isAuthenticated, hydrated } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [iosDevice, setIosDevice] = useState(false);

  const hidePrompt = useCallback(() => {
    setIsExiting(true);
    window.setTimeout(() => {
      setVisible(false);
      setIsEntering(false);
      setIsExiting(false);
    }, EXIT_ANIMATION_MS);
  }, []);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !isMobileDevice() || isStandaloneMode()) {
      setVisible(false);
      setIsEntering(false);
      setIsExiting(false);
      return;
    }

    const dismissed = window.sessionStorage.getItem('legacy-homes-pwa-install-dismissed') === 'true';
    if (dismissed) return;

    setIosDevice(isIOSDevice());
    const showTimer = window.setTimeout(() => {
      setIsExiting(false);
      setIsEntering(true);
      setVisible(true);
      window.requestAnimationFrame(() => setIsEntering(false));
    }, 900);
    return () => window.clearTimeout(showTimer);
  }, [hydrated, isAuthenticated]);

  useEffect(() => {
    if (!visible || isExiting) return;

    const autoDismissTimer = window.setTimeout(hidePrompt, AUTO_DISMISS_MS);
    return () => window.clearTimeout(autoDismissTimer);
  }, [hidePrompt, isExiting, visible]);

  useEffect(() => {
    const handleInstalled = () => hidePrompt();
    window.addEventListener('appinstalled', handleInstalled);
    return () => window.removeEventListener('appinstalled', handleInstalled);
  }, [hidePrompt]);

  if (!hydrated || !isAuthenticated || !visible) return null;

  const dismiss = () => {
    window.sessionStorage.setItem('legacy-homes-pwa-install-dismissed', 'true');
    hidePrompt();
  };

  const handleInstall = async () => {
    if (!isInstallable) return;
    await installApp();
    hidePrompt();
  };

  return (
    <aside
      role="dialog"
      aria-label="Install the Legacy Homes app"
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        right: 12,
        zIndex: 80,
        padding: 16,
        borderRadius: 18,
        border: '1px solid rgba(14,165,233,.24)',
        background: 'linear-gradient(135deg, #071a45 0%, #0b2a63 100%)',
        boxShadow: '0 18px 45px rgba(3,15,45,.28)',
        color: '#fff',
        opacity: isExiting || isEntering ? 0 : 1,
        transform: isExiting || isEntering ? 'translateY(-18px)' : 'translateY(0)',
        transition: `transform ${EXIT_ANIMATION_MS}ms ease, opacity ${EXIT_ANIMATION_MS}ms ease`,
        willChange: 'transform, opacity',
      }}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        style={{ position: 'absolute', top: 8, right: 8, border: 0, background: 'transparent', color: 'rgba(255,255,255,.7)', cursor: 'pointer', padding: 4 }}
      >
        <X size={18} />
      </button>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingRight: 18 }}>
        <div style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 12, display: 'grid', placeItems: 'center', background: '#16a3b5', color: '#fff' }}>
          <Download size={21} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: '#7dd3fc' }}>Legacy Homes</p>
          <h2 style={{ margin: '3px 0 5px', fontSize: 18, lineHeight: 1.2 }}>Install the Legacy Homes app</h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,.76)' }}>
            {isInstallable
              ? 'Get faster access to bills, payments, and notifications from your home screen.'
              : iosDevice
                ? 'Tap Share, then “Add to Home Screen” to install the Legacy Homes app.'
                : 'Use your browser menu and choose “Install app” or “Add to Home screen.”'}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
        {isInstallable && (
          <button type="button" onClick={() => void handleInstall()} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Download size={15} /> Install app
          </button>
        )}
        <button type="button" onClick={dismiss} style={{ flex: isInstallable ? 0 : 1, border: '1px solid rgba(255,255,255,.28)', borderRadius: 9, padding: '9px 14px', background: 'transparent', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          {isInstallable ? 'Not now' : 'Got it'}
        </button>
      </div>
    </aside>
  );
}
