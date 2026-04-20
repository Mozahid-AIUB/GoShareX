import { useCallback } from 'react';
import auth from '@react-native-firebase/auth';
import { useAuthStore } from '@/store';
import { User } from '@/types';
import { logger } from '@/utils/logger';

interface UseAuthResult {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

/**
 * Exposes authentication state and actions from the global authStore.
 */
export function useAuth(): UseAuthResult {
  const { user, isLoading, isAuthenticated, setUser, setLoading, logout } =
    useAuthStore();

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await auth().signOut();
      logout();
    } catch (error) {
      logger.error('useAuth.signOut', error);
      // Force local logout even on error so the UI isn't stuck
      logout();
    } finally {
      setLoading(false);
    }
  }, [setLoading, logout]);

  return { user, isLoading, isAuthenticated, signOut };
}
