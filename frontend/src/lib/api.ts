import axios, { AxiosError, AxiosInstance } from 'axios';
import { useSystemStatusStore } from '@/stores/system-status.store';

// --------------------------------------------------
// API Configuration
// --------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    'Missing NEXT_PUBLIC_API_URL environment variable.'
  );
}

// --- DEDICATED HEALTH API CLIENT (no interceptors) ---
const healthApi = axios.create({
  baseURL: API_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

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

// --- TOKEN REFRESH QUEUE ---
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// --- REQUEST DEDUPLICATION ---
const inflightRequests = new Map<string, Promise<any>>();

// --- API CLIENT ---
export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// --- REQUEST INTERCEPTOR ---
api.interceptors.request.use((config) => {
  // Skip auth for health endpoints
  if (config.url?.includes('/health')) {
    return config;
  }

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
  if (error.response?.status === 503 && !(error.response?.data as any)?.maintenance) return true;
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
    // Clear inflight request
    const requestKey = `${response.config.method}:${response.config.url}`;
    inflightRequests.delete(requestKey);

    // Skip health checks - let checkBackendHealth handle status
    if (response.config.url?.includes('/health')) {
      return response;
    }

    // Successful non-health response - backend is online
    const store = useSystemStatusStore.getState();
    if (store.status !== 'ONLINE' && store.status !== 'SLOW') {
      updateStoreStatus('ONLINE');
      backendEvents.emit('backend-online');
      replayQueuedRequests().catch(console.error);
      processOutageSubscriptionQueue().catch(console.error);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Clear inflight request on error too
    if (originalRequest) {
      const requestKey = `${originalRequest.method}:${originalRequest.url}`;
      inflightRequests.delete(requestKey);
    }

    // Skip health check errors - they're handled in checkBackendHealth
    if (originalRequest?.url?.includes('/health')) {
      return Promise.reject(error);
    }

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

    // Handle 429 rate limiting - DON'T treat as offline
    if (error.response?.status === 429) {
      console.warn('Rate limited - backend is alive but busy');
      // Keep current status, don't change to OFFLINE
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

      if (typeof window === 'undefined') {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
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

        onTokenRefreshed(accessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        console.error('Token refresh failed:', refreshError);

        // Check if backend is reachable by making a health check
        try {
          await healthApi.get('/health', { timeout: 3000 });
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

// --- DEDUPLICATED API WRAPPER ---
// Only for /auth/me or other critical read endpoints that might be called multiple times
const originalGet = api.get;
api.get = function <T = any, R = any>(url: string, config?: any): Promise<R> {
  if (url.includes('/auth/me')) {
    const requestKey = `GET:${url}`;
    if (inflightRequests.has(requestKey)) {
      return inflightRequests.get(requestKey)!;
    }
    const promise = originalGet.call(this, url, config);
    inflightRequests.set(requestKey, promise);
    return promise;
  }
  return originalGet.call(this, url, config);
} as any;

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

/**
 * Process any outage subscriptions that were queued while the backend was offline
 */
export const processOutageSubscriptionQueue = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  const queue = JSON.parse(localStorage.getItem('outage_subscription_queue') || '[]');
  if (queue.length === 0) return;
  
  console.log(`Processing ${queue.length} queued outage subscriptions...`);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://legacy-homes.onrender.com/api';
  
  for (const item of queue) {
    try {
      const res = await fetch(`${API_URL}/auth/notify-outage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: item.email }),
      });
      
      if (res.ok) {
        console.log(`Successfully synced queued subscription for ${item.email}`);
        // Remove from queue
        const currentQueue = JSON.parse(localStorage.getItem('outage_subscription_queue') || '[]');
        const updatedQueue = currentQueue.filter((q: any) => q.email !== item.email);
        localStorage.setItem('outage_subscription_queue', JSON.stringify(updatedQueue));
      }
    } catch (error) {
      console.error(`Failed to sync queued subscription for ${item.email}:`, error);
    }
  }
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

    const response = await healthApi.get<HealthResponse>('/health');
    const data = response.data;
    const latency = Date.now() - startTime;
    
    // Check for maintenance mode in response
    if (data.status === 'MAINTENANCE') {
      updateStoreStatus('MAINTENANCE', data.maintenance);
      return { ...data, latency };
    }

    // Check for slow response
    if (latency > 5000) {
      updateStoreStatus('SLOW', { latency });
    } else if (currentStatus !== 'ONLINE') {
      updateStoreStatus('ONLINE');
    }

    return { ...data, latency };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    
    // If it's a maintenance response (503)
    if (error.response?.status === 503) {
      const data = error.response?.data;
      if (data?.maintenance || data?.status === 'MAINTENANCE') {
        updateStoreStatus('MAINTENANCE', data.maintenance);
        return { 
          status: 'MAINTENANCE', 
          maintenance: data.maintenance,
          latency 
        };
      }
    }

    // If it's a network error or other failure
    if (currentStatus === 'ONLINE' || currentStatus === 'SLOW') {
      updateStoreStatus('WAKING_UP');
    } else if (currentStatus !== 'WAKING_UP' && currentStatus !== 'MAINTENANCE') {
      updateStoreStatus('OFFLINE');
    }

    return { status: 'OFFLINE', latency };
  }
};
