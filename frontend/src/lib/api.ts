import axios, { AxiosError, AxiosInstance } from 'axios';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://legacy-homes.onrender.com/api';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Try to get token from storage
    const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
    const sessionId = sessionStorage.getItem('sessionId') || localStorage.getItem('sessionId');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId;
    }
    
    // Log for debugging (production logs showed missing tokens)
    if (!token && !config.url?.includes('/auth/')) {
      console.warn(`Request to ${config.url} is missing Authorization token`);
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 Unauthorized
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      // If the request was already a status check, we might want to be careful about retrying
      // but standard token refresh logic applies.
      originalRequest._retry = true;

      try {
        if (typeof window === 'undefined') {
          return Promise.reject(error);
        }

        const refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Use standard axios to avoid interceptor loop
        const response = await axios.post(
          `${API_URL}/auth/refresh-token`,
          { refreshToken },
          { timeout: 10000 }
        );

        const accessToken =
          response.data?.data?.accessToken ||
          response.data?.accessToken;

        const newRefreshToken =
          response.data?.data?.refreshToken ||
          response.data?.refreshToken;

        if (!accessToken) {
          throw new Error('Invalid refresh response: No access token');
        }

        sessionStorage.setItem('accessToken', accessToken);
        localStorage.setItem('accessToken', accessToken);

        if (newRefreshToken) {
          sessionStorage.setItem('refreshToken', newRefreshToken);
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        // Update the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Clear tokens on failure
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('sessionId');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');

        const { useAuthStore } = await import('@/store/auth.store');
        useAuthStore.getState().logout();

        // Redirect to login if in browser
        if (typeof window !== 'undefined') {
          window.location.href = '/login?expired=true';
        }

        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export const getErrorMessage = (
  error: unknown
): string => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      'An error occurred'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

export default api;
