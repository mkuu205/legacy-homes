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

interface ServicesStatus {
  database: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  smtp: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  tuma: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  pesapal: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
}

interface SystemStatusState {
  status: BackendStatus;
  lastSuccessfulConnection: number | null;
  lastFailedConnection: number | null;
  outageDuration: number; // in milliseconds
  connectionAttempts: number;
  isNotified: boolean;
  
  // Health details
  latency: number | null;
  backendVersion: string | null;
  backendStartedAt: number | null;
  services: ServicesStatus;
  maintenanceMessage: string | null;

  // Actions
  setStatus: (status: BackendStatus, details?: any) => void;
  recordSuccessfulConnection: (latency: number, version?: string, services?: ServicesStatus) => void;
  recordFailedConnection: () => void;
  incrementConnectionAttempts: () => void;
  setNotified: (status: boolean) => void;
  updateOutageDuration: () => void;
  resetConnectionAttempts: () => void;
}

export const useSystemStatusStore = create<SystemStatusState>()(
  persist(
    (set, get) => ({
      status: 'CHECKING',
      lastSuccessfulConnection: null,
      lastFailedConnection: null,
      outageDuration: 0,
      connectionAttempts: 0,
      isNotified: false,
      
      latency: null,
      backendVersion: null,
      backendStartedAt: null,
      services: {
        database: 'UNKNOWN',
        smtp: 'UNKNOWN',
        tuma: 'UNKNOWN',
        pesapal: 'UNKNOWN'
      },
      maintenanceMessage: null,

      setStatus: (status, details) => {
        set((state) => {
          // If returning online, reset attempts and notify status
          if (status === 'ONLINE' && state.status !== 'ONLINE') {
            return {
              status,
              connectionAttempts: 0,
              isNotified: false,
              outageDuration: 0,
              maintenanceMessage: null,
              latency: details?.latency || state.latency,
              backendVersion: details?.version || state.backendVersion,
              backendStartedAt: details?.backendStartedAt || state.backendStartedAt,
            };
          }
          
          if (status === 'MAINTENANCE') {
            return {
              status,
              maintenanceMessage: details?.message || details?.maintenance?.message || 'Service under maintenance',
            };
          }
          
          return { status };
        });
      },

      recordSuccessfulConnection: (latency, version, services) => {
        set({
          status: 'ONLINE',
          lastSuccessfulConnection: Date.now(),
          latency,
          backendVersion: version || null,
          services: services || { database: 'UNKNOWN', smtp: 'UNKNOWN', tuma: 'UNKNOWN', pesapal: 'UNKNOWN' },
          connectionAttempts: 0,
          outageDuration: 0,
        });
      },

      recordFailedConnection: () => {
        const now = Date.now();
        set((state) => {
          const firstFailed = state.lastFailedConnection || now;
          return {
            lastFailedConnection: now,
            connectionAttempts: state.connectionAttempts + 1,
            outageDuration: state.lastSuccessfulConnection ? now - state.lastSuccessfulConnection : now - firstFailed,
          };
        });
      },

      incrementConnectionAttempts: () => {
        set((state) => ({ connectionAttempts: state.connectionAttempts + 1 }));
      },

      resetConnectionAttempts: () => {
        set({ connectionAttempts: 0 });
      },

      setNotified: (isNotified) => {
        set({ isNotified });
      },

      updateOutageDuration: () => {
        set((state) => {
          if (state.status === 'ONLINE' || state.status === 'CHECKING' || state.status === 'SLOW') {
            return { outageDuration: 0 };
          }
          const now = Date.now();
          const firstFailed = state.lastFailedConnection || now;
          return {
            outageDuration: state.lastSuccessfulConnection ? now - state.lastSuccessfulConnection : now - firstFailed,
          };
        });
      }
    }),
    {
      name: 'system-status',
      partialize: (state) => ({
        isNotified: state.isNotified,
        lastSuccessfulConnection: state.lastSuccessfulConnection,
      }),
    }
  )
);
