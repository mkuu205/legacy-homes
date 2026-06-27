// frontend/src/components/system/ReconnectToast.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useSystemStatusStore } from '@/stores/system-status.store';
import { useToast } from '@/components/ui/use-toast';

type SystemStatus = 'ONLINE' | 'OFFLINE' | 'CHECKING' | 'ERROR';

export function ReconnectToast() {
  const status = useSystemStatusStore((state) => state.status) as SystemStatus;
  const prevStatus = useRef<SystemStatus>(status);
  const { toast } = useToast();
  const offlineToastId = useRef<string | null>(null);

  useEffect(() => {
    // Handle going offline
    if (status === 'OFFLINE' && prevStatus.current !== 'OFFLINE') {
      const { id } = toast({
        title: 'Connection Lost',
        description: 'Attempting to reconnect...',
        variant: 'destructive',
        duration: Infinity,
      });
      offlineToastId.current = id;
    }

    // Handle reconnection
    if (status === 'ONLINE' && prevStatus.current === 'OFFLINE') {
      // Dismiss the offline toast
      if (offlineToastId.current) {
        toast.dismiss(offlineToastId.current);
        offlineToastId.current = null;
      }

      toast({
        title: 'Connection Restored',
        description: 'You are back online.',
        variant: 'success', // ✅ Using success variant instead of className
        duration: 4000,
      });
    }

    // Handle checking state
    if (status === 'CHECKING' && prevStatus.current !== 'CHECKING') {
      toast({
        title: 'Checking Connection...',
        description: 'Verifying system status.',
        variant: 'default',
        duration: 3000,
      });
    }

    // Handle error state
    if (status === 'ERROR' && prevStatus.current !== 'ERROR') {
      toast({
        title: 'Connection Error',
        description: 'Unable to connect to the system.',
        variant: 'destructive',
        duration: 5000,
      });
    }

    prevStatus.current = status;
  }, [status, toast]);

  return null;
}
