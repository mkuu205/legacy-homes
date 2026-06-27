'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useSystemStatusStore } from '@/stores/system-status.store';
import { MaintenanceScreen } from '@/components/system/MaintenanceScreen';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import { ReconnectToast } from '@/components/system/ReconnectToast';

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const status = useSystemStatusStore((state) => state.status);
  const pathname = usePathname();

  // Define all states that should show the maintenance screen
  const isMaintenanceMode = status === 'MAINTENANCE' || 
                           status === 'OFFLINE' || 
                           status === 'WAKING_UP' || 
                           status === 'NETWORK_OFFLINE';

  // Maintenance screen should only be shown on /login and /maintenance pages
  // This allows the landing page and other public pages to remain accessible
  const shouldShowMaintenance = isMaintenanceMode && (
    pathname === '/login' || 
    pathname === '/maintenance' || 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/admin')
  );

  if (shouldShowMaintenance) {
    return <MaintenanceScreen />;
  }

  return (
    <>
      <ReconnectToast />
      {children}
    </>
  );
}
