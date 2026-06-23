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
    if (isAuthenticated && user?.id) {
      const socket = getSocket(user.id);

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

      return () => {
        socket.off('payment_completed');
        socket.off('bill_updated');
        socket.off('notification_created');
        socket.off('dashboard_updated');
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
