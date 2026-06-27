'use client';

import { useEffect, ReactNode } from 'react';
import { checkBackendHealth } from '@/lib/api';
import { useSystemStatusStore } from '@/stores/system-status.store';

export function HealthCheckProvider({ children }: { children: ReactNode }) {
  const status = useSystemStatusStore((state) => state.status);
  const outageDuration = useSystemStatusStore((state) => state.outageDuration);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const performHealthCheck = async () => {
      try {
        await checkBackendHealth();
      } catch (error) {
        // Errors are already handled by the API interceptors and checkBackendHealth method
        console.warn('Background health check failed', error);
      }
    };

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

    // Initial check on mount
    performHealthCheck();

    intervalId = setInterval(performHealthCheck, pollingInterval);

    return () => clearInterval(intervalId);
  }, [status, outageDuration]);

  return <>{children}</>;
}
