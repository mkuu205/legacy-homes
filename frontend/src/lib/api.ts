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
    const token = sessionStorage.getItem('accessToken');
    const sessionId = sessionStorage.getItem('sessionId');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        if (typeof window === 'undefined') {
          return Promise.reject(error);
        }

        const refreshToken = sessionStorage.getItem('refreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(
          `${API_URL}/auth/refresh-token`,
          { refreshToken }
        );

        const accessToken =
          response.data?.data?.accessToken ||
          response.data?.accessToken;

        const newRefreshToken =
          response.data?.data?.refreshToken ||
          response.data?.refreshToken;

        if (!accessToken) {
          throw new Error('Invalid refresh response');
        }

        sessionStorage.setItem('accessToken', accessToken);

        if (newRefreshToken) {
          sessionStorage.setItem(
            'refreshToken',
            newRefreshToken
          );
        }

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${accessToken}`,
        };

        return api(originalRequest);
      } catch {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('sessionId');

        const { useAuthStore } = await import(
          '@/store/auth.store'
        );

        useAuthStore.getState().logout();

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
