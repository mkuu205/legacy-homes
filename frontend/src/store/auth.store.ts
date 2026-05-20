import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'RESIDENT' | 'ADMIN' | 'SUPER_ADMIN';
  houseNumber?: string;
  accountNumber?: string;
  profilePicture?: string;
  phoneNumber?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  activeRole: 'RESIDENT' | 'ADMIN' | null;

  login: (
    user: User,
    accessToken: string,
    refreshToken: string
  ) => void;

  logout: () => void;

  setHydrated: (value: boolean) => void;
  updateUser: (user: Partial<User>) => void;
}

const getTokenKeys = (role: 'RESIDENT' | 'ADMIN') => {
  if (role === 'ADMIN') {
    return {
      access: 'admin_accessToken',
      refresh: 'admin_refreshToken',
    };
  }

  return {
    access: 'resident_accessToken',
    refresh: 'resident_refreshToken',
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      activeRole: null,

      login: (user, accessToken, refreshToken) => {
        const keys = getTokenKeys(user.role);

        localStorage.setItem(keys.access, accessToken);
        localStorage.setItem(keys.refresh, refreshToken);

        set({
          user,
          isAuthenticated: true,
          activeRole: user.role,
        });
      },

      logout: () => {
        localStorage.removeItem('resident_accessToken');
        localStorage.removeItem('resident_refreshToken');
        localStorage.removeItem('admin_accessToken');
        localStorage.removeItem('admin_refreshToken');

        set({
          user: null,
          isAuthenticated: false,
          activeRole: null,
        });
      },

      setHydrated: (value) => {
        set({ hasHydrated: value });
      },

      updateUser: (updates) => {
        const current = get().user;
        if (!current) return;

        set({
          user: {
            ...current,
            ...updates,
          },
        });
      },
    }),
    {
      name: 'legacy-homes-auth',

      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
