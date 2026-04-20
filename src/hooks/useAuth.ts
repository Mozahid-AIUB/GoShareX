import { useCallback } from 'react';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/config/firebase.config';
import { useAuthStore } from '@/store';
import { User } from '@/types/auth.types';
import { logger } from '@/utils/logger';

interface UseAuthResult {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const { user, isLoading, isAuthenticated, setLoading, logout } =
    useAuthStore();

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      logout();
    } catch (error) {
      logger.error('useAuth.signOut', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [setLoading, logout]);

  return { user, isLoading, isAuthenticated, signOut };
}