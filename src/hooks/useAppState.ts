import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseAppStateResult {
  appState: AppStateStatus;
  isActive: boolean;
  isBackground: boolean;
}

/**
 * Listens to React Native AppState changes and exposes convenient booleans.
 */
export function useAppState(): UseAppStateResult {
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppState(nextState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return {
    appState,
    isActive: appState === 'active',
    isBackground: appState === 'background' || appState === 'inactive',
  };
}
