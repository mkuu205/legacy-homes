'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'SUPER_ADMIN' | 'BILLING_OFFICER' | 'SUPPORT_AGENT' | 'NOTIFICATION_MANAGER' | 'READ_ONLY_MANAGER' | 'RESIDENT';
  houseNumber?: string;
  accountNumber?: string;
  profilePicture?: string;
  phone?: string;
  accountStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SessionState = 'AUTHENTICATED' | 'DISCONNECTED' | 'EXPIRED' | 'UNAUTHENTICATED';

interface AuthState {
  user: User | null;
  pendingTwoFactor: { challengeToken: string; user: Pick<User, 'id' | 'fullName' | 'email' | 'role'> } | null;
  isAuthenticated: boolean;
  sessionState: SessionState;
  hydrated: boolean;

  setAuth: (
    user: User,
    accessToken: string,
    refreshToken: string
  ) => void;
  setPendingTwoFactor: (challenge: NonNullable<AuthState['pendingTwoFactor']>) => void;
  clearPendingTwoFactor: () => void;

  updateUser: (user: Partial<User>) => void;

  logout: (expired?: boolean) => void;
  clearSession: () => void;
  setSessionState: (state: SessionState) => void;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      pendingTwoFactor: null,
      isAuthenticated: false,
      sessionState: 'UNAUTHENTICATED',
      hydrated: false,

      setAuth: (user, accessToken, _refreshToken) => {
        const sessionId = crypto.randomUUID();

        sessionStorage.setItem('accessToken', accessToken);
        sessionStorage.setItem('sessionId', sessionId);

        set({
          user,
          pendingTwoFactor: null,
          isAuthenticated: true,
          sessionState: 'AUTHENTICATED',
        });
      },

      setPendingTwoFactor: (pendingTwoFactor) => set({ pendingTwoFactor }),

      clearPendingTwoFactor: () => set({ pendingTwoFactor: null }),

      updateUser: (updatedUser) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                ...updatedUser,
              }
            : null,
        })),

      logout: (expired = false) => {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('sessionId');
        
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('sessionId');

        set({
          user: null,
          pendingTwoFactor: null,
          isAuthenticated: false,
          sessionState: expired ? 'EXPIRED' : 'UNAUTHENTICATED',
        });
      },

      clearSession: () => {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('sessionId');
        
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('sessionId');

        set({
          user: null,
          pendingTwoFactor: null,
          isAuthenticated: false,
          sessionState: 'UNAUTHENTICATED',
        });
      },

      setSessionState: (sessionState) => set({ sessionState }),

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
        sessionState: state.sessionState === 'DISCONNECTED' ? 'AUTHENTICATED' : state.sessionState,
      }),

      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);
