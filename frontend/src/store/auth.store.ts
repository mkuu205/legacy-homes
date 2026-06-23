'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'SUPER_ADMIN' | 'RESIDENT';
  houseNumber?: string;
  accountNumber?: string;
  profilePicture?: string;
  phone?: string;
  accountStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hydrated: boolean;

  setAuth: (
    user: User,
    accessToken: string,
    refreshToken: string
  ) => void;

  updateUser: (user: Partial<User>) => void;

  logout: () => void;
  clearSession: () => void;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hydrated: false,

      setAuth: (user, accessToken, refreshToken) => {
        const sessionId = crypto.randomUUID();

        sessionStorage.setItem('accessToken', accessToken);
        sessionStorage.setItem('refreshToken', refreshToken);
        sessionStorage.setItem('sessionId', sessionId);
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('sessionId', sessionId);

        set({
          user,
          isAuthenticated: true,
        });
      },

      updateUser: (updatedUser) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                ...updatedUser,
              }
            : null,
        })),

      logout: () => {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('sessionId');
        
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('sessionId');

        set({
          user: null,
          isAuthenticated: false,
        });
      },

      clearSession: () => {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('sessionId');
        
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('sessionId');

        set({
          user: null,
          isAuthenticated: false,
        });
      },

      setHydrated: (value) =>
        set({
          hydrated: value,
        }),
    }),
    {
      name: 'auth-storage',

      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),

      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);
