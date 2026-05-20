import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://legacy-homes-backend.onrender.com/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

const isBrowser = typeof window !== 'undefined';

const clearAuth = async () => {
  if (!isBrowser) return;

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('sessionId');
  sessionStorage.removeItem('sessionId');

  try {
    const { useAuthStore } = await import('@/store/auth.store');
    useAuthStore.getState().logout();
  } catch {}

  window.location.href = '/login';
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (isBrowser) {
      const token = localStorage.getItem('accessToken');
      const sessionId = localStorage.getItem('sessionId');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (sessionId) {
        config.headers['X-Session-ID'] = sessionId;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as any;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        if (!isBrowser) {
          return Promise.reject(error);
        }

        const refreshToken = localStorage.getItem('refreshToken');

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

        localStorage.setItem('accessToken', accessToken);

        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${accessToken}`,
        };

        return api(originalRequest);
      } catch {
        await clearAuth();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
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
