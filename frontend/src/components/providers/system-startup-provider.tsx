'use client';

import { useEffect, ReactNode } from 'react';
import { useSystemStatusStore } from '@/stores/system-status.store';

export function SystemStartupProvider({ children }: { children: ReactNode }) {
  const status = useSystemStatusStore((state) => state.status);

  // If we ever need to show a blocking UI for 'WAKING_UP', we could do it here.
  // For now, this provider manages the transition if needed, 
  // but since api.ts handles CHECKING -> WAKING_UP -> ONLINE inherently,
  // we can use this to perhaps block rendering until CHECKING resolves,
  // or show a global "Starting services..." overlay.
  
  if (status === 'WAKING_UP') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800">Starting Legacy Homes services...</h2>
        <p className="text-gray-500 mt-2">This may take up to one minute.</p>
      </div>
    );
  }

  return <>{children}</>;
}
