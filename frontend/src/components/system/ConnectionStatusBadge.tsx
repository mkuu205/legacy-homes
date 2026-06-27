'use client';

import { useSystemStatusStore } from '@/stores/system-status.store';

export function ConnectionStatusBadge() {
  const status = useSystemStatusStore((state) => state.status);

  const getStatusConfig = () => {
    switch (status) {
      case 'ONLINE':
        return { label: 'Online', color: 'bg-green-100 text-green-800 border-green-200' };
      case 'SLOW':
        return { label: 'Slow', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 'MAINTENANCE':
        return { label: 'Maintenance', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'CHECKING':
      case 'WAKING_UP':
        return { label: 'Checking...', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'OFFLINE':
      case 'NETWORK_OFFLINE':
      default:
        return { label: 'Offline', color: 'bg-red-100 text-red-800 border-red-200' };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      {status === 'CHECKING' || status === 'WAKING_UP' ? (
        <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <span className={`mr-1.5 h-2 w-2 rounded-full ${status === 'ONLINE' ? 'bg-green-500' : status === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
      )}
      {config.label}
    </span>
  );
}
