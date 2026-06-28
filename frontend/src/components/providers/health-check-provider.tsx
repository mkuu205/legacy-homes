'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { checkBackendHealth } from '@/lib/api';
import { useSystemStatusStore } from '@/stores/system-status.store';

export function HealthCheckProvider({ children }: { children: ReactNode }) {
  const status = useSystemStatusStore((state) => state.status);
  const outageDuration = useSystemStatusStore((state) => state.outageDuration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const performHealthCheck = async () => {
      try {
        await checkBackendHealth();
      } catch (error) {
        // Errors are already handled by the API interceptors and checkBackendHealth method
        console.warn('Background health check failed', error);
      }
    };

    // Clear any existing timer before creating a new one
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Calculate polling interval based on adaptive strategy
    let pollingInterval = 30000; // default 30 seconds

    if (status !== 'ONLINE') {
      const minutesOffline = outageDuration / 60000;
      if (minutesOffline < 5) {
        pollingInterval = 30000; // 30 seconds
      } else if (minutesOffline < 30) {
        pollingInterval = 60000; // 60 seconds
      } else {
        pollingInterval = 120000; // 2 minutes
      }
    }

    // Initial check on mount or when status/duration changes
    // We only perform the initial check if it's the first time or status changed to offline
    performHealthCheck();

    timerRef.current = setInterval(performHealthCheck, pollingInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, outageDuration]);

  return <>{children}</>;
}
