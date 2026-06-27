'use client';

import { ReactNode } from 'react';
import { useSystemStatusStore } from '@/stores/system-status.store';
import { MaintenanceScreen } from '@/components/system/MaintenanceScreen';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import { ReconnectToast } from '@/components/system/ReconnectToast';

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const status = useSystemStatusStore((state) => state.status);

  if (status === 'MAINTENANCE') {
    return <MaintenanceScreen />;
  }

  return (
    <>
      {status === 'OFFLINE' && <OfflineBanner />}
      <ReconnectToast />
      {children}
    </>
  );
}
