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

const getAccessToken = () => {
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
  const { activeRole } = useAuthStore.getState();

  if (activeRole === 'ADMIN') {
    return localStorage.getItem('admin_refreshToken');
  }

  if (activeRole === 'RESIDENT') {
    return localStorage.getItem('resident_refreshToken');
  }

  return null;
};

const saveTokens = (accessToken: string, refreshToken: string) => {
  const { activeRole } = useAuthStore.getState();

  if (activeRole === 'ADMIN') {
    localStorage.setItem('admin_accessToken', accessToken);
    localStorage.setItem('admin_refreshToken', refreshToken);
  }

  if (activeRole === 'RESIDENT') {
    localStorage.setItem('resident_accessToken', accessToken);
    localStorage.setItem('resident_refreshToken', refreshToken);
  }
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();

        if (!refreshToken) {
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }

        const res = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken, newRefreshToken } = res.data;

        saveTokens(
          accessToken,
          newRefreshToken || refreshToken
        );

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error);
  }
);
