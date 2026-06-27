'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { backendEvents, api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export function ConnectionRecoveryProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);
  const isRecovering = useRef(false);

  useEffect(() => {
    const handleBackendOnline = async () => {
      // Prevent concurrent recoveries
      if (isRecovering.current) return;
      isRecovering.current = true;

      try {
        const { isAuthenticated } = useAuthStore.getState();
        
        if (isAuthenticated) {
          // 1. Fetch /api/me first to verify account status
          try {
            await api.get('/me'); // Typically /me or /auth/me in this API structure
          } catch (error: any) {
            if (error.response?.status === 401 || error.response?.status === 403) {
              logout(true);
              isRecovering.current = false;
              return;
            }
          }

          // 2. Invalidate in sequence to minimize stale data
          // Notifications
          await queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
          await queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
          
          // Dashboard
          await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          await queryClient.invalidateQueries({ queryKey: ['resident-dashboard'] });
          
          // Bills
          await queryClient.invalidateQueries({ queryKey: ['my-bills'] });
          await queryClient.invalidateQueries({ queryKey: ['unpaid-bills'] });
          
          // Payments
          await queryClient.invalidateQueries({ queryKey: ['my-payments'] });
          
          // Payment methods
          await queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
          
          // Profile
          await queryClient.invalidateQueries({ queryKey: ['profile'] });
          
          // The socket provider will handle its own reconnection natively when it detects online
          backendEvents.emit('trigger-socket-reconnect');
        }
      } finally {
        // Debounce recovery to prevent spam
        setTimeout(() => {
          isRecovering.current = false;
        }, 5000);
      }
    };

    const unsubscribe = backendEvents.on('backend-online', handleBackendOnline);

    return () => {
      unsubscribe();
    };
  }, [queryClient, logout]);

  return <>{children}</>;
}
