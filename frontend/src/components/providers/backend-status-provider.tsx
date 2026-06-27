'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { backendEvents } from '@/lib/api';
import { onlineManager } from '@tanstack/react-query';
import { useSystemStatusStore } from '@/stores/system-status.store';

export function BackendStatusProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const setStatus = useSystemStatusStore((state) => state.setStatus);

  useEffect(() => {
    // Listen for online events
    const unsubscribeOnline = backendEvents.on('backend-online', () => {
      setStatus('ONLINE');
      onlineManager.setOnline(true);
    });

    // Listen for offline events
    const unsubscribeOffline = backendEvents.on('backend-offline', () => {
      // The store handles distinguishing between OFFLINE and WAKING_UP based on state transitions
      onlineManager.setOnline(false);
    });

    // Listen for session expiry
    const unsubscribeSession = backendEvents.on('session-expired', () => {
      if (pathname !== '/login') {
        router.push('/login?expired=true');
      }
    });

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
      unsubscribeSession();
    };
  }, [router, pathname, setStatus]);

  // Keep track of offline duration
  useEffect(() => {
    const timer = setInterval(() => {
      useSystemStatusStore.getState().updateOutageDuration();
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return <>{children}</>;
}
