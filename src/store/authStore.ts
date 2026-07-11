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

  // isLoading এখানে false করা হয় না — SplashScreen.tsx-এর finishLoading()
  // MIN_DISPLAY_MS পুরোটা অপেক্ষা করে তারপর setLoading(false) কল করে, যাতে
  // auth session দ্রুত resolve হলেও splash animation মাঝপথে কেটে যেতে না
  // পারে (আগে setUser নিজেই isLoading false করে দিত, animation বাইপাস হতো)।
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
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
