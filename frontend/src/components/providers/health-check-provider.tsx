'use client';

import { useEffect, useRef, ReactNode, useCallback } from 'react';
import { checkBackendHealth } from '@/lib/api';
import { useSystemStatusStore } from '@/stores/system-status.store';

export function HealthCheckProvider({ children }: { children: ReactNode }) {
  const status = useSystemStatusStore((state) => state.status);
  const outageDuration = useSystemStatusStore((state) => state.outageDuration);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);
  const isMountedRef = useRef(true);
  const previousStatusRef = useRef(status);

  // Get current interval from store - always reads latest values
  const getInterval = useCallback(() => {
    const currentStatus = useSystemStatusStore.getState().status;
    const currentOutage = useSystemStatusStore.getState().outageDuration;
    
    if (currentStatus === 'ONLINE') return 30000;
    
    const minutesOffline = currentOutage / 60000;
    if (minutesOffline < 5) return 30000;
    if (minutesOffline < 30) return 60000;
    return 120000;
  }, []);

  // Single source of truth for scheduling
  const scheduleNext = useCallback(() => {
    if (!isMountedRef.current) return;
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const delay = getInterval();
    timeoutRef.current = setTimeout(async () => {
      // Don't run if unmounted or already checking
      if (!isMountedRef.current || isCheckingRef.current) {
        // If already checking, try again later
        if (isMountedRef.current) {
          scheduleNext();
        }
        return;
      }

      isCheckingRef.current = true;
      
      try {
        await checkBackendHealth();
      } catch (error) {
        console.warn('Health check failed', error);
      } finally {
        isCheckingRef.current = false;
        // Always schedule the next check after this one completes
        if (isMountedRef.current) {
          scheduleNext();
        }
      }
    }, delay);
  }, [getInterval]);

  // Perform an immediate check without interfering with the scheduling loop
  const checkImmediately = useCallback(async () => {
    // Guard against duplicate immediate checks and prevent overlapping requests
    if (!isMountedRef.current || isCheckingRef.current) {
      return;
    }

    // Cancel any scheduled check
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    isCheckingRef.current = true;
    
    try {
      await checkBackendHealth();
    } catch (error) {
      console.warn('Immediate health check failed', error);
    } finally {
      isCheckingRef.current = false;
      // Resume the scheduling loop
      if (isMountedRef.current) {
        scheduleNext();
      }
    }
  }, [scheduleNext]);

  // Handle status transitions - only for ONLINE ↔ OFFLINE changes
  useEffect(() => {
    const prevStatus = previousStatusRef.current;
    
    if (prevStatus !== status) {
      const wasOnline = prevStatus === 'ONLINE';
      const isNowOnline = status === 'ONLINE';
      
      // Only check when status changes between ONLINE and OFFLINE
      if (wasOnline !== isNowOnline) {
        checkImmediately();
      }
      
      previousStatusRef.current = status;
    }
  }, [status, checkImmediately]);

  // Start the loop once on mount with an immediate initial check
  useEffect(() => {
    isMountedRef.current = true;
    previousStatusRef.current = status;
    
    // Perform immediate health check on mount to detect current status
    checkImmediately();

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        checkImmediately();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Empty deps - runs once on mount

  return <>{children}</>;
}
