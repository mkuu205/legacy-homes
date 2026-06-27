'use client';

import { ReactNode } from 'react';
import { useSystemStatusStore } from '@/stores/system-status.store';
import { MaintenanceScreen } from '@/components/system/MaintenanceScreen';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import { ReconnectToast } from '@/components/system/ReconnectToast';

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const status = useSystemStatusStore((state) => state.status);

  // Define all states that should show the maintenance screen
  const isMaintenanceMode = status === 'MAINTENANCE' || 
                           status === 'OFFLINE' || 
                           status === 'WAKING_UP' || 
                           status === 'NETWORK_OFFLINE';

  if (isMaintenanceMode) {
    return <MaintenanceScreen />;
  }

  return (
    <>
      <ReconnectToast />
      {children}
    </>
  );
}
