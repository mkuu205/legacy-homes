// frontend/src/components/system/ReconnectToast.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useSystemStatusStore } from '@/stores/system-status.store';
import { useToast } from '@/components/ui/use-toast';

type SystemStatus = 'ONLINE' | 'OFFLINE' | 'CHECKING' | 'ERROR' | 'MAINTENANCE' | 'NETWORK_OFFLINE' | 'SLOW' | 'WAKING_UP';

export function ReconnectToast() {
  const status = useSystemStatusStore((state) => state.status) as SystemStatus;
  const prevStatus = useRef<SystemStatus>(status);
  const { toast, dismiss } = useToast();
  const offlineToastId = useRef<string | null>(null);

  useEffect(() => {
    // Handle going offline
    if (status === 'OFFLINE' && prevStatus.current !== 'OFFLINE') {
      const { id } = toast({
        title: 'Connection Lost',
        description: 'Attempting to reconnect...',
        variant: 'destructive',
      });
      offlineToastId.current = id;
    }

    // Handle reconnection
    if (status === 'ONLINE' && prevStatus.current === 'OFFLINE') {
      // Dismiss the offline toast
      if (offlineToastId.current) {
        dismiss(offlineToastId.current);
        offlineToastId.current = null;
      }

      toast({
        title: 'Connection Restored',
        description: 'You are back online.',
        variant: 'default',
      });
    }

    // Handle network offline
    if (status === 'NETWORK_OFFLINE' && prevStatus.current !== 'NETWORK_OFFLINE') {
      toast({
        title: 'Network Offline',
        description: 'Please check your internet connection.',
        variant: 'destructive',
      });
    }

    // Handle maintenance mode
    if (status === 'MAINTENANCE' && prevStatus.current !== 'MAINTENANCE') {
      toast({
        title: 'Maintenance Mode',
        description: 'The system is currently under maintenance.',
        variant: 'destructive',
      });
    }

    // Handle slow connection
    if (status === 'SLOW' && prevStatus.current !== 'SLOW') {
      toast({
        title: 'Slow Connection',
        description: 'The server is responding slowly. Please wait...',
        variant: 'default',
      });
    }

    // Handle waking up
    if (status === 'WAKING_UP' && prevStatus.current !== 'WAKING_UP') {
      toast({
        title: 'Waking Up',
        description: 'The server is starting up. Please wait...',
        variant: 'default',
      });
    }

    // Handle checking state
    if (status === 'CHECKING' && prevStatus.current !== 'CHECKING') {
      toast({
        title: 'Checking Connection...',
        description: 'Verifying system status.',
        variant: 'default',
      });
    }

    // Handle error state
    if (status === 'ERROR' && prevStatus.current !== 'ERROR') {
      toast({
        title: 'Connection Error',
        description: 'Unable to connect to the system.',
        variant: 'destructive',
      });
    }

    prevStatus.current = status;
  }, [status, toast, dismiss]);

  return null;
}
