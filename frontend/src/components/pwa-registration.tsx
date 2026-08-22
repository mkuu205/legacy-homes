'use client';

import { useEffect } from 'react';

export function PWARegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await registration.update();
      } catch (error) {
        // PWA support is progressive; the application remains usable without it.
        console.warn('Legacy Homes PWA registration failed', error);
      }
    };

    const updateWhenVisible = () => {
      if (document.visibilityState === 'visible') void registration?.update();
    };

    void register();
    document.addEventListener('visibilitychange', updateWhenVisible);

    return () => {
      document.removeEventListener('visibilitychange', updateWhenVisible);
    };
  }, []);

  return null;
}
