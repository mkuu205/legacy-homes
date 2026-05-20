import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://your-backend-url.onrender.com/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getErrorMessage = (error: any): string => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.message) {
    return error.message;
  }

  return 'Something went wrong';
};

const getAccessToken = () => {
  if (typeof window === 'undefined') return null;

  const { activeRole } = useAuthStore.getState();

  if (activeRole === 'ADMIN') {
    return localStorage.getItem('admin_accessToken');
  }

  if (activeRole === 'RESIDENT') {
    return localStorage.getItem('resident_accessToken');
  }

  return null;
};

const getRefreshToken = () => {
  if (typeof window === 'undefined') return null;

  const { activeRole } = useAuthStore.getState();

  if (activeRole === 'ADMIN') {
    return localStorage.getItem('admin_refreshToken');
  }

  if (activeRole === 'RESIDENT') {
    return localStorage.getItem('resident_refreshToken');
  }

  return null;
};

const saveTokens = (
  accessToken: string,
  refreshToken: string
) => {
  if (typeof window === 'undefined') return;

  const { activeRole } = useAuthStore.getState();

  if (activeRole === 'ADMIN') {
    localStorage.setItem('admin_accessToken', accessToken);
    localStorage.setItem('admin_refreshToken', refreshToken);
    return;
  }

  if (activeRole === 'RESIDENT') {
    localStorage.setItem('resident_accessToken', accessToken);
    localStorage.setItem('resident_refreshToken', refreshToken);
  }
};

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();

        if (!refreshToken) {
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }

        const response = await axios.post(
          `${API_URL}/auth/refresh-token`,
          {
            refreshToken,
          }
        );

        const accessToken =
          response.data.accessToken;

        const newRefreshToken =
          response.data.refreshToken || refreshToken;

        saveTokens(accessToken, newRefreshToken);

        originalRequest.headers.Authorization =
          `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
