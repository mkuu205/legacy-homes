'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { toast } from '@/components/ui/toaster';

const SocketContext = createContext<any>(null);

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    let reconnectAttempts = 0;
    let maxReconnectAttempts = 10;
    
    if (isAuthenticated && user?.id) {
      const socket = getSocket(user.id);

      // Connection state listeners
      socket.on('connect', () => {
        reconnectAttempts = 0;
        console.log('Socket connected');
      });

      socket.on('disconnect', (reason: string) => {
        if (reason === 'io server disconnect' || reason === 'transport close') {
          // the disconnection was initiated by the server, or connection lost
          console.warn('Socket disconnected:', reason);
        }
      });

      socket.on('connect_error', (error: any) => {
        console.warn('Socket connection error:', error);
      });

      socket.on('reconnect_attempt', (attemptNumber: number) => {
        reconnectAttempts = attemptNumber;
        console.log(`Socket reconnect attempt ${attemptNumber}`);
      });

      socket.on('reconnect_failed', () => {
        console.error('Socket reconnect failed after maximum attempts');
      });

      socket.on('payment_completed', (data: any) => {
        toast({
          type: 'success',
          title: 'Payment Confirmed!',
          description: `Receipt: ${data.mpesaReceiptCode}. Your balance is now KES ${data.newBalance.toLocaleString()}.`,
        });
        
        // Invalidate all relevant queries
        queryClient.invalidateQueries({ queryKey: ['my-payments'] });
        queryClient.invalidateQueries({ queryKey: ['my-bills'] });
        queryClient.invalidateQueries({ queryKey: ['unpaid-bills'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['resident-dashboard'] });
      });

      socket.on('bill_updated', () => {
        queryClient.invalidateQueries({ queryKey: ['my-bills'] });
        queryClient.invalidateQueries({ queryKey: ['unpaid-bills'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      });

      socket.on('notification_created', (data: any) => {
        toast({
          type: 'info',
          title: 'New Notification',
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
        queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      });

      socket.on('dashboard_updated', () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['resident-dashboard'] });
      });

      socket.on('unread_count_update', (data: any) => {
        queryClient.setQueryData(['unread-notifications-count'], { count: data.unreadCount });
        queryClient.invalidateQueries({ queryKey: ['resident-dashboard'] });
      });

      // Listen for explicit reconnect triggers from connection-recovery-provider
      const handleTriggerReconnect = () => {
        if (socket.disconnected) {
          socket.connect();
        }
      };
      
      const { backendEvents } = require('@/lib/api');
      backendEvents.on('trigger-socket-reconnect', handleTriggerReconnect);

      return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('reconnect_attempt');
        socket.off('reconnect_failed');
        socket.off('payment_completed');
        socket.off('bill_updated');
        socket.off('notification_created');
        socket.off('dashboard_updated');
        socket.off('unread_count_update');
        backendEvents.removeAllListeners('trigger-socket-reconnect');
      };
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated, user?.id, queryClient]);

  return (
    <SocketContext.Provider value={null}>
      {children}
    </SocketContext.Provider>
  );
}
