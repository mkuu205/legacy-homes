'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { SocketProvider } from '@/components/socket-provider';
import { BackendStatusProvider } from '@/components/providers/backend-status-provider';
import { SystemStartupProvider } from '@/components/providers/system-startup-provider';
import { HealthCheckProvider } from '@/components/providers/health-check-provider';
import { ConnectionRecoveryProvider } from '@/components/providers/connection-recovery-provider';
import { MaintenanceProvider } from '@/components/providers/maintenance-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BackendStatusProvider>
        <SystemStartupProvider>
          <HealthCheckProvider>
            <SocketProvider>
              <ConnectionRecoveryProvider>
                <MaintenanceProvider>
                  {children}
                  <Toaster />
                </MaintenanceProvider>
              </ConnectionRecoveryProvider>
            </SocketProvider>
          </HealthCheckProvider>
        </SystemStartupProvider>
      </BackendStatusProvider>
    </QueryClientProvider>
  );
}
