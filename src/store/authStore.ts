import { create } from 'zustand';
import { User } from '@/types/auth.types';

interface SuspensionData {
  reason?: string;
  suspendedUntil?: number;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  suspension: SuspensionData | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setSuspension: (data: SuspensionData | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  suspension: null,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setSuspension: (data) =>
    set({ suspension: data }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      suspension: null,
    }),
}));
