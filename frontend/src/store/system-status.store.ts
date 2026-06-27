import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BackendStatus = 
  | 'ONLINE'
  | 'OFFLINE'
  | 'MAINTENANCE'
  | 'NETWORK_OFFLINE'
  | 'SLOW'
  | 'CHECKING'
  | 'WAKING_UP';

export type ConnectionQuality = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

export type ServiceStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';

export interface MaintenanceInfo {
  reason?: string;
  expectedCompletion?: string; // ISO date string
  message?: string;
}

export interface BackendHealthDetails {
  databaseStatus: ServiceStatus;
  smtpStatus: ServiceStatus;
  tumaStatus: ServiceStatus;
  pesapalStatus: ServiceStatus;
}

export interface SystemStatusState {
  // Core status
  status: BackendStatus;
  previousStatus: BackendStatus | null;
  
  // Timing - stored as timestamps (numbers) to avoid Date serialization issues
  lastSuccessfulConnection: number | null;
  lastFailedConnection: number | null;
  lastRecoveredAt: number | null;
  outageStartTime: number | null;
  statusChangedAt: number;
  lastHealthCheck: number | null;
  backendStartedAt: number | null;
  
  // Metrics
  healthLatency: number | null; // in milliseconds
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  retryAttempts: number;
  
  // Backend metadata
  backendVersion: string | null;
  healthDetails: BackendHealthDetails | null;
  
  // Maintenance details
  maintenanceInfo: MaintenanceInfo | null;
  
  // Notification subscription (persisted)
  isSubscribedToNotifications: boolean;
  notificationEmail: string | null;
  subscriptionId: string | null; // from Brevo via Vercel
  
  // Actions - Single source of truth
  setStatus: (status: BackendStatus, options?: {
    maintenanceInfo?: MaintenanceInfo;
    backendVersion?: string;
    healthLatency?: number;
    healthDetails?: BackendHealthDetails;
    backendStartedAt?: number;
  }) => void;
  
  // Convenience methods (all call setStatus)
  setOnline: (latency?: number, version?: string, details?: BackendHealthDetails, startedAt?: number) => void;
  setOffline: () => void;
  setMaintenance: (info?: MaintenanceInfo) => void;
  setNetworkOffline: () => void;
  setSlow: (latency: number) => void;
  setChecking: () => void;
  setWakingUp: () => void;
  
  // Connection tracking
  recordSuccessfulConnection: (latency?: number, version?: string, details?: BackendHealthDetails) => void;
  recordFailedConnection: () => void;
  recordHealthCheck: () => void;
  resetOutageTracking: () => void;
  incrementRetryAttempts: () => void;
  resetRetryAttempts: () => void;
  
  // Notification subscription
  setNotificationSubscription: (email: string, subscriptionId: string) => void;
  clearNotificationSubscription: () => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  status: 'CHECKING' as BackendStatus,
  previousStatus: null,
  lastSuccessfulConnection: null,
  lastFailedConnection: null,
  lastRecoveredAt: null,
  outageStartTime: null,
  statusChangedAt: Date.now(),
  lastHealthCheck: null,
  backendStartedAt: null,
  healthLatency: null,
  consecutiveFailures: 0,
  consecutiveSuccesses: 0,
  retryAttempts: 0,
  backendVersion: null,
  healthDetails: null,
  maintenanceInfo: null,
  isSubscribedToNotifications: false,
  notificationEmail: null,
  subscriptionId: null,
};

export const useSystemStatusStore = create<SystemStatusState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Single implementation - all other setters call this
      setStatus: (status: BackendStatus, options?: {
        maintenanceInfo?: MaintenanceInfo;
        backendVersion?: string;
        healthLatency?: number;
        healthDetails?: BackendHealthDetails;
        backendStartedAt?: number;
      }) => {
        const current = get().status;
        if (current === status && !options?.maintenanceInfo) return;

        const now = Date.now();
        const isOutage = status === 'OFFLINE' || status === 'MAINTENANCE' || 
                         status === 'NETWORK_OFFLINE' || status === 'WAKING_UP';
        const wasOutage = current === 'OFFLINE' || current === 'MAINTENANCE' || 
                          current === 'NETWORK_OFFLINE' || current === 'WAKING_UP';

        // If transitioning from outage to online, record recovery
        const isRecovery = wasOutage && status === 'ONLINE';

        set((state) => ({
          status,
          previousStatus: state.status,
          statusChangedAt: now,
          lastRecoveredAt: isRecovery ? now : state.lastRecoveredAt,
          outageStartTime: isOutage && !wasOutage 
            ? now 
            : !isOutage 
              ? null 
              : state.outageStartTime,
          healthLatency: options?.healthLatency ?? state.healthLatency,
          backendVersion: options?.backendVersion ?? state.backendVersion,
          healthDetails: options?.healthDetails ?? state.healthDetails,
          backendStartedAt: options?.backendStartedAt ?? state.backendStartedAt,
          maintenanceInfo: options?.maintenanceInfo ?? 
            (status === 'MAINTENANCE' ? state.maintenanceInfo : null),
          retryAttempts: status !== current ? 0 : state.retryAttempts,
        }));
      },

      // Convenience methods - all delegate to setStatus
      setOnline: (latency?: number, version?: string, details?: BackendHealthDetails, startedAt?: number) => {
        get().setStatus('ONLINE', { 
          healthLatency: latency, 
          backendVersion: version,
          healthDetails: details,
          backendStartedAt: startedAt,
        });
      },

      setOffline: () => {
        get().setStatus('OFFLINE');
      },

      setMaintenance: (info?: MaintenanceInfo) => {
        get().setStatus('MAINTENANCE', { maintenanceInfo: info });
      },

      setNetworkOffline: () => {
        get().setStatus('NETWORK_OFFLINE');
      },

      setSlow: (latency: number) => {
        get().setStatus('SLOW', { healthLatency: latency });
      },

      setChecking: () => {
        get().setStatus('CHECKING');
      },

      setWakingUp: () => {
        get().setStatus('WAKING_UP');
      },

      recordSuccessfulConnection: (latency?: number, version?: string, details?: BackendHealthDetails) => {
        const now = Date.now();
        set((state) => ({
          lastSuccessfulConnection: now,
          lastRecoveredAt: state.outageStartTime ? now : state.lastRecoveredAt,
          consecutiveFailures: 0,
          consecutiveSuccesses: state.consecutiveSuccesses + 1,
          outageStartTime: null,
          healthLatency: latency ?? state.healthLatency,
          backendVersion: version ?? state.backendVersion,
          healthDetails: details ?? state.healthDetails,
          retryAttempts: 0,
        }));
        
        // Also update status if it was in an outage state
        const current = get().status;
        if (current === 'OFFLINE' || current === 'MAINTENANCE' || 
            current === 'NETWORK_OFFLINE' || current === 'WAKING_UP') {
          get().setOnline(latency, version, details);
        }
      },

      recordFailedConnection: () => {
        const now = Date.now();
        set((state) => ({
          lastFailedConnection: now,
          consecutiveFailures: state.consecutiveFailures + 1,
          consecutiveSuccesses: 0,
          outageStartTime: state.outageStartTime || now,
        }));
      },

      recordHealthCheck: () => {
        set({
          lastHealthCheck: Date.now(),
        });
      },

      resetOutageTracking: () => {
        set({
          outageStartTime: null,
          consecutiveFailures: 0,
          retryAttempts: 0,
        });
      },

      incrementRetryAttempts: () => {
        set((state) => ({
          retryAttempts: state.retryAttempts + 1,
        }));
      },

      resetRetryAttempts: () => {
        set({ retryAttempts: 0 });
      },

      setNotificationSubscription: (email: string, subscriptionId: string) => {
        set({
          isSubscribedToNotifications: true,
          notificationEmail: email,
          subscriptionId,
        });
      },

      clearNotificationSubscription: () => {
        set({
          isSubscribedToNotifications: false,
          notificationEmail: null,
          subscriptionId: null,
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'system-status-storage',
      // ONLY persist notification preferences - runtime health state is recalculated
      partialize: (state) => ({
        isSubscribedToNotifications: state.isSubscribedToNotifications,
        notificationEmail: state.notificationEmail,
        subscriptionId: state.subscriptionId,
      }),
    }
  )
);

// Selectors for derived state - compute values rather than storing them
export const useSystemStatusSelectors = () => {
  const store = useSystemStatusStore();
  
  return {
    // Status booleans
    isOnline: store.status === 'ONLINE',
    isOffline: store.status === 'OFFLINE' || store.status === 'MAINTENANCE' || 
               store.status === 'NETWORK_OFFLINE' || store.status === 'WAKING_UP',
    isChecking: store.status === 'CHECKING',
    isSlow: store.status === 'SLOW',
    isMaintenance: store.status === 'MAINTENANCE',
    isInMaintenanceMode: store.status === 'MAINTENANCE',
    isNetworkOffline: store.status === 'NETWORK_OFFLINE',
    isWakingUp: store.status === 'WAKING_UP',
    
    // Computed outage duration from start time
    getOutageDuration: () => {
      const { outageStartTime } = store;
      if (!outageStartTime) return 0;
      return Date.now() - outageStartTime;
    },
    
    getFormattedOutageDuration: () => {
      const duration = store.outageStartTime 
        ? Date.now() - store.outageStartTime
        : 0;
      
      if (!duration || duration < 1000) return 'Just now';
      
      const seconds = Math.floor(duration / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) {
        return `${days}d ${hours % 24}h`;
      }
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      }
      return `${seconds}s`;
    },
    
    getTimeSinceRecovery: () => {
      const { lastRecoveredAt } = store;
      if (!lastRecoveredAt) return null;
      const diff = Date.now() - lastRecoveredAt;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (seconds < 60) return 'Just now';
      if (minutes < 2) return '1 minute ago';
      if (minutes < 60) return `${minutes} minutes ago`;
      if (hours < 2) return '1 hour ago';
      return `${hours} hours ago`;
    },
    
    getBackendUptime: () => {
      const { backendStartedAt } = store;
      if (!backendStartedAt) return null;
      const diff = Date.now() - backendStartedAt;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) {
        return `${days}d ${hours % 24}h`;
      }
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      }
      return `${seconds}s`;
    },
    
    getTimeSinceLastHealthCheck: () => {
      const { lastHealthCheck } = store;
      if (!lastHealthCheck) return null;
      const diff = Math.floor((Date.now() - lastHealthCheck) / 1000);
      if (diff < 60) return `${diff} seconds ago`;
      if (diff < 120) return '1 minute ago';
      return `${Math.floor(diff / 60)} minutes ago`;
    },
    
    getStatusMessage: () => {
      switch (store.status) {
        case 'ONLINE': return 'All systems operational';
        case 'OFFLINE': return 'Service temporarily unavailable';
        case 'MAINTENANCE': return store.maintenanceInfo?.reason || 'Scheduled maintenance';
        case 'NETWORK_OFFLINE': return 'No internet connection';
        case 'SLOW': return 'Service experiencing delays';
        case 'CHECKING': return 'Checking service status...';
        case 'WAKING_UP': return 'Starting Legacy Homes services...';
        default: return 'Unknown status';
      }
    },
    
    getStatusColor: () => {
      switch (store.status) {
        case 'ONLINE': return 'bg-green-500';
        case 'SLOW': return 'bg-yellow-500';
        case 'CHECKING': return 'bg-blue-500';
        case 'WAKING_UP': return 'bg-yellow-500';
        default: return 'bg-red-500';
      }
    },
    
    getStatusIcon: () => {
      switch (store.status) {
        case 'ONLINE': return '✓';
        case 'SLOW': return '⚠';
        case 'CHECKING': return '⟳';
        case 'WAKING_UP': return '⟳';
        case 'MAINTENANCE': return '🔧';
        case 'NETWORK_OFFLINE': return '📡';
        default: return '✗';
      }
    },
    
    getLastCheckedFormatted: () => {
      const date = new Date(store.statusChangedAt);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    },
    
    getHealthLatencyFormatted: () => {
      const { healthLatency } = store;
      if (healthLatency === null) return '—';
      return `${healthLatency}ms`;
    },
    
    getConnectionQuality: (): ConnectionQuality | null => {
      const { healthLatency } = store;
      if (healthLatency === null) return null;
      if (healthLatency < 100) return 'EXCELLENT';
      if (healthLatency < 300) return 'GOOD';
      if (healthLatency < 800) return 'FAIR';
      return 'POOR';
    },
    
    getConnectionQualityLabel: (): string => {
      const quality = get().getConnectionQuality();
      if (!quality) return 'Unknown';
      return quality.charAt(0) + quality.slice(1).toLowerCase();
    },
    
    getConnectionQualityColor: (): string => {
      const quality = get().getConnectionQuality();
      if (!quality) return 'text-gray-400';
      switch (quality) {
        case 'EXCELLENT': return 'text-green-600';
        case 'GOOD': return 'text-blue-600';
        case 'FAIR': return 'text-yellow-600';
        case 'POOR': return 'text-red-600';
      }
    },
    
    getMaintenanceETA: () => {
      const { maintenanceInfo } = store;
      if (!maintenanceInfo?.expectedCompletion) return null;
      const eta = new Date(maintenanceInfo.expectedCompletion);
      const now = Date.now();
      const diff = eta.getTime() - now;
      if (diff < 0) return 'Expected completion passed';
      const minutes = Math.floor(diff / 60000);
      if (minutes < 60) return `${minutes} minutes`;
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    },
    
    getHealthDetails: () => store.healthDetails,
    
    getBackendVersion: () => store.backendVersion,
  };
};
