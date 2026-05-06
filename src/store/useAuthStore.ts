import { create } from 'zustand';
import { User } from '@/types';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      setAuth: (user, token) => set({ user, isAuthenticated: true, accessToken: token }),
      logout: () => set({ user: null, isAuthenticated: false, accessToken: null }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'auth-storage',
      // We might not want to persist sensitive tokens in localStorage directly if we can help it,
      // but for this MVP/Context it matches the existing api.ts interceptor logic which reads from localStorage.
      // However, api.ts reads 'token' key, this store saves to a JSON blob.
      // We should align them or primarily use this store.
      // For now, this is UI state management.
    }
  )
);
