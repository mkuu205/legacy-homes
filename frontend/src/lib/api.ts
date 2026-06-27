import axios, { AxiosError, AxiosInstance } from 'axios';
import { useSystemStatusStore } from '@/stores/system-status.store';

// --- CONSTANTS ---
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://legacy-homes.onrender.com/api';

const HEALTH_ENDPOINT = `${API_URL}/health`;

// --- TYPES ---
export type BackendStatus = 
  | 'ONLINE'
  | 'OFFLINE'
  | 'MAINTENANCE'
  | 'NETWORK_OFFLINE'
  | 'SLOW'
  | 'CHECKING'
  | 'WAKING_UP';

export interface HealthResponse {
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'WAKING_UP';
  version?: string;
  startedAt?: string;
  latency?: number;
  services?: {
    database: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
    smtp: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
    tuma: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
    pesapal: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  };
  maintenance?: {
    reason?: string;
    expectedCompletion?: string;
    message?: string;
  } | null;
}

// --- SIMPLE PUB/SUB (replaces EventEmitter) ---
type EventCallback = (data?: any) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export const backendEvents = new EventBus();

// --- REQUEST QUEUE ---
interface PendingRequest {
  config: any;
  timestamp: number;
  retryCount: number;
}

// Idempotent endpoints that can be safely replayed
const REPLAYABLE_ENDPOINTS = [
  '/dashboard',
  '/bills',
  '/payments',
  '/notifications',
  '/payment-methods',
  '/profile',
  '/statistics',
  '/properties',
  '/tenants',
  '/rental-agreements',
  '/invoices',
  '/audit-logs',
];

const EXCLUDED_ENDPOINTS = [
  '/auth/',
  '/logout',
  '/refresh-token',
  '/health',
  '/download/',
  '/export/',
  '/stream/',
];

const isReplayableRequest = (config: any): boolean => {
  if (config?.method?.toLowerCase() !== 'get') return false;
  if (!config?.url) return false;
  
  // Check excluded endpoints
  for (const excluded of EXCLUDED_ENDPOINTS) {
    if (config.url.includes(excluded)) return false;
  }
  
  // Check if it's a replayable endpoint
  for (const endpoint of REPLAYABLE_ENDPOINTS) {
    if (config.url.includes(endpoint)) return true;
  }
  
  return false;
};

let pendingRequests: PendingRequest[] = [];
let isReplaying = false;

// --- API CLIENT ---
export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// --- REQUEST INTERCEPTOR ---
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
    const sessionId = sessionStorage.getItem('sessionId') || localStorage.getItem('sessionId');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId;
    }
    
    if (!token && !config.url?.includes('/auth/')) {
      console.warn(`Request to ${config.url} is missing Authorization token`);
    }
  }

  return config;
});

// --- HELPER FUNCTIONS ---
const isBackendUnreachable = (error: AxiosError): boolean => {
  if (!error) return false;
  
  // Network errors (no response)
  if (error.code === 'ECONNABORTED') return true;
  if (error.code === 'ECONNREFUSED') return true;
  if (error.code === 'ENOTFOUND') return true;
  if (error.code === 'ERR_NETWORK') return true;
  if (error.code === 'ETIMEDOUT') return true;
  
  // Gateway errors (backend unreachable)
  if (error.response?.status === 502) return true;
  if (error.response?.status === 503) return true;
  if (error.response?.status === 504) return true;
  
  return false;
};

const isMaintenanceMode = (error: AxiosError): boolean => {
  if (error.response?.status === 503) {
    const data = error.response?.data as any;
    if (data?.maintenance || data?.status === 'MAINTENANCE') {
      return true;
    }
  }
  return false;
};

const isGenuine401 = (error: AxiosError): boolean => {
  if (error.response?.status !== 401) return false;
  const data = error.response?.data as any;
  const message = data?.message || '';
  return message.includes('Invalid') || message.includes('expired');
};

// Update status in Zustand store
const updateStoreStatus = (status: BackendStatus, details?: any) => {
  const store = useSystemStatusStore.getState();
  const currentStatus = store.status;
  
  if (currentStatus !== status) {
    store.setStatus(status, details);
    backendEvents.emit(`backend:${status.toLowerCase()}`, { status, details, timestamp: Date.now() });
    backendEvents.emit('backend:status-change', { status, details, timestamp: Date.now() });
  }
};

// --- RESPONSE INTERCEPTOR ---
api.interceptors.response.use(
  (response) => {
    // Successful response - backend is online
    // ONLY update to ONLINE if it's NOT a health check or if health check was successful
    // This prevents random successful requests from clearing maintenance state prematurely
    const store = useSystemStatusStore.getState();
    const isHealthCheck = response.config.url?.includes('/health');
    
    if (store.status !== 'ONLINE' && store.status !== 'SLOW') {
      // If it's a health check, we let checkBackendHealth handle it
      // If it's a regular request that succeeded, it's a strong indicator we're online
      if (!isHealthCheck) {
        updateStoreStatus('ONLINE');
        backendEvents.emit('backend-online');
        replayQueuedRequests().catch(console.error);
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Check if browser is offline
    if (typeof window !== 'undefined' && !navigator.onLine) {
      updateStoreStatus('NETWORK_OFFLINE');
      return Promise.reject(new Error('Network offline'));
    }

    // Check for maintenance mode
    if (isMaintenanceMode(error)) {
      updateStoreStatus('MAINTENANCE', error.response?.data);
      return Promise.reject(error);
    }

    // Check if backend is unreachable
    if (isBackendUnreachable(error)) {
      const store = useSystemStatusStore.getState();
      
      // If it was previously online, set to waking up first (cold start detection)
      const currentStatus = store.status;
      if (currentStatus === 'ONLINE' || currentStatus === 'SLOW') {
        updateStoreStatus('WAKING_UP');
        backendEvents.emit('backend-offline');
        
        // After 3 seconds, if still failing, move to OFFLINE
        setTimeout(() => {
          const checkStore = useSystemStatusStore.getState();
          if (checkStore.status === 'WAKING_UP') {
            updateStoreStatus('OFFLINE');
          }
        }, 3000);
      } else if (currentStatus !== 'WAKING_UP' && currentStatus !== 'CHECKING' && currentStatus !== 'MAINTENANCE') {
        // Only set to OFFLINE if not already in a specific outage state
        updateStoreStatus('OFFLINE');
      }
      
      // Queue replayable GET requests
      if (isReplayableRequest(originalRequest) && !originalRequest._queued) {
        originalRequest._queued = true;
        pendingRequests.push({
          config: originalRequest,
          timestamp: Date.now(),
          retryCount: 0,
        });
      }
      
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (typeof window === 'undefined') {
          return Promise.reject(error);
        }

        const refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(
          `${API_URL}/auth/refresh-token`,
          { refreshToken },
          { timeout: 10000 }
        );

        const accessToken = response.data?.data?.accessToken || response.data?.accessToken;
        const newRefreshToken = response.data?.data?.refreshToken || response.data?.refreshToken;

        if (!accessToken) {
          throw new Error('Invalid refresh response: No access token');
        }

        sessionStorage.setItem('accessToken', accessToken);
        localStorage.setItem('accessToken', accessToken);

        if (newRefreshToken) {
          sessionStorage.setItem('refreshToken', newRefreshToken);
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);

        // Check if backend is reachable by making a health check
        try {
          await axios.get(HEALTH_ENDPOINT, { timeout: 3000 });
          // Backend is reachable - genuine 401
          if (isGenuine401(refreshError as AxiosError)) {
            console.warn('Genuine 401 - logging out');
            
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('refreshToken');
            sessionStorage.removeItem('sessionId');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');

            const { useAuthStore } = await import('@/store/auth.store');
            useAuthStore.getState().logout(true);

            backendEvents.emit('session-expired');
          }
        } catch (healthError) {
          // Backend unreachable - preserve session
          console.warn('Backend unreachable during refresh - preserving session');
          // Don't overwrite MAINTENANCE state with OFFLINE
          const store = useSystemStatusStore.getState();
          if (store.status !== 'MAINTENANCE') {
            updateStoreStatus('OFFLINE');
          }
          return Promise.reject(new Error('Backend unavailable'));
        }

        return Promise.reject(refreshError);
      }
    }

    // If it's a timeout or slow response
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      updateStoreStatus('SLOW', { latency: error.config?.timeout || 30000 });
    }

    return Promise.reject(error);
  }
);

// --- PUBLIC FUNCTIONS ---

export const replayQueuedRequests = async (): Promise<void> => {
  if (isReplaying || pendingRequests.length === 0) return;
  
  isReplaying = true;
  const requests = [...pendingRequests];
  pendingRequests = [];

  console.log(`Replaying ${requests.length} queued requests...`);

  let replayPromises = requests.map(async (req) => {
    try {
      // Skip stale requests (older than 5 minutes)
      if (Date.now() - req.timestamp > 300000) {
        console.warn(`Skipping stale request: ${req.config.url}`);
        return;
      }

      await api(req.config);
      console.log(`Replayed successfully: ${req.config.url}`);
    } catch (error) {
      console.error(`Failed to replay request to ${req.config.url}:`, error);
      
      // Re-queue if under retry limit
      if (req.retryCount < 3 && pendingRequests.length < 50) {
        pendingRequests.push({
          ...req,
          retryCount: req.retryCount + 1,
        });
      }
    }
  });

  await Promise.allSettled(replayPromises);
  isReplaying = false;
};

export const clearPendingRequests = (): void => {
  pendingRequests = [];
  isReplaying = false;
};

export const checkBackendHealth = async (): Promise<HealthResponse> => {
  const startTime = Date.now();
  const store = useSystemStatusStore.getState();
  const currentStatus = store.status;
  
  try {
    // Check if browser is offline first
    if (typeof window !== 'undefined' && !navigator.onLine) {
      updateStoreStatus('NETWORK_OFFLINE');
      throw new Error('Network offline');
    }

    // Update status to checking ONLY if we're not already in an outage state
    // This prevents the maintenance screen from flickering/unmounting during polls
    const isOutage = currentStatus === 'OFFLINE' || 
                    currentStatus === 'MAINTENANCE' || 
                    currentStatus === 'NETWORK_OFFLINE' || 
                    currentStatus === 'WAKING_UP';
    
    if (!isOutage) {
      updateStoreStatus('CHECKING');
    }

    const response = await axios.get(HEALTH_ENDPOINT, {
      timeout: 8000,
    });
    
    const latency = Date.now() - startTime;
    const data = response.data;
    const healthData = data.data || data;
    
    // Determine backend status
    let status: BackendStatus = 'ONLINE';
    
    if (healthData.status === 'MAINTENANCE') {
      status = 'MAINTENANCE';
    } else if (healthData.status === 'WAKING_UP') {
      status = 'WAKING_UP';
    } else if (healthData.status === 'OFFLINE') {
      status = 'OFFLINE';
    } else if (latency > 3000) {
      status = 'SLOW';
    }
    
    // Build health response
    const healthResponse: HealthResponse = {
      status: status === 'ONLINE' ? 'ONLINE' : 
              status === 'MAINTENANCE' ? 'MAINTENANCE' : 
              status === 'WAKING_UP' ? 'WAKING_UP' : 'OFFLINE',
      version: healthData.version,
      startedAt: healthData.startedAt,
      latency,
      services: healthData.services || {
        database: healthData.database || 'UNKNOWN',
        smtp: healthData.smtp || 'UNKNOWN',
        tuma: healthData.tuma || 'UNKNOWN',
        pesapal: healthData.pesapal || 'UNKNOWN',
      },
      maintenance: healthData.maintenance,
    };
    
    // Update store with health details
    updateStoreStatus(status, {
      version: healthData.version,
      latency,
      details: healthData,
      backendStartedAt: healthData.startedAt ? new Date(healthData.startedAt).getTime() : undefined,
    });
    
    // If online, replay queued requests
    if (status === 'ONLINE' || status === 'SLOW') {
      await replayQueuedRequests();
      backendEvents.emit('backend-online');
    }
    
    // Record successful connection
    store.recordSuccessfulConnection(latency, healthData.version, healthResponse.services);
    
    return healthResponse;
    
  } catch (error) {
    const latency = Date.now() - startTime;
    const axiosError = error as AxiosError;
    
    // Check for network errors
    if (typeof window !== 'undefined' && !navigator.onLine) {
      updateStoreStatus('NETWORK_OFFLINE');
      throw new Error('Network offline');
    }
    
    // Check if maintenance
    if (isMaintenanceMode(axiosError)) {
      const data = axiosError.response?.data as any;
      updateStoreStatus('MAINTENANCE', data);
      return {
        status: 'MAINTENANCE',
        maintenance: {
          message: data?.message || 'Service under maintenance',
          ...data?.maintenance
        }
      };
    }
    
    // Default to offline for errors
    // But preserve current state if it's already an outage state
    if (currentStatus !== 'MAINTENANCE' && currentStatus !== 'NETWORK_OFFLINE' && currentStatus !== 'WAKING_UP') {
      updateStoreStatus('OFFLINE');
    }
    
    store.recordFailedConnection();
    throw error;
  }
};

export const getErrorMessage = (error: any): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;
    return data?.message || error.message || 'An unexpected error occurred';
  }
  return error.message || 'An unexpected error occurred';
};
