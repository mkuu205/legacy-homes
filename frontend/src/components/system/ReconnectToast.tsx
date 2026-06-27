'use client';

import { useEffect, useRef } from 'react';
import { useSystemStatusStore } from '@/stores/system-status.store';
import { useToast } from '@/components/ui/use-toast'; // Assuming standard shadcn toast

export function ReconnectToast() {
  const status = useSystemStatusStore((state) => state.status);
  const prevStatus = useRef(status);
  const { toast } = useToast();

  useEffect(() => {
    if (status === 'ONLINE' && prevStatus.current !== 'ONLINE' && prevStatus.current !== 'CHECKING') {
      toast({
        title: 'Connection restored.',
        description: 'You are back online.',
        variant: 'default',
        className: 'bg-green-600 text-white',
      });
    }
    prevStatus.current = status;
  }, [status, toast]);

  return null;
}
