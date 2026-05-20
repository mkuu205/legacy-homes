import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'SUPER_ADMIN' | 'RESIDENT';
  accountNumber: string;
  houseNumber?: string;
  profilePicture?: string;
  accountStatus: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  sessionId: string | null;

  setAuth: (
    user: User,
    accessToken: string,
    refreshToken: string
  ) => void;

  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  setHydrated: (state: boolean) => void;
  clearSession: () => void;
}

// Generate a unique session ID for this browser tab
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hydrated: false,
      sessionId: null,

      setAuth: (user, accessToken, refreshToken) => {
        const sessionId = generateSessionId();
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('sessionId', sessionId);
        sessionStorage.setItem('sessionId', sessionId);

        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          sessionId,
        });
      },

      updateUser: (userData) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, ...userData }
            : null,
        })),

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('sessionId');
        sessionStorage.removeItem('sessionId');

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          sessionId: null,
        });
      },

      clearSession: () => {
        const state = get();
        if (state.sessionId) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('sessionId');
          sessionStorage.removeItem('sessionId');

          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            sessionId: null,
          });
        }
      },

      setHydrated: (state) => set({ hydrated: state }),
    }),
    {
      name: 'legacy-homes-auth',

      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        sessionId: state.sessionId,
      }),

      onRehydrateStorage: () => (state) => {
        if (state) {
          // Validate session ID on rehydration
          const storedSessionId = localStorage.getItem('sessionId');
          const sessionSessionId = sessionStorage.getItem('sessionId');
          
          // If session IDs don't match, clear the session (tab isolation)
          if (storedSessionId && sessionSessionId && storedSessionId !== sessionSessionId) {
            state.clearSession?.();
            return;
          }

          // If no session in sessionStorage but exists in localStorage, restore it
          if (storedSessionId && !sessionSessionId) {
            sessionStorage.setItem('sessionId', storedSessionId);
          }

          state.setHydrated?.(true);
        }
      },
    }
  )
);
