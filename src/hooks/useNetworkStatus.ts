import { useEffect, useState } from 'react';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

/**
 * Monitors network connectivity via @react-native-community/netinfo.
 * Falls back gracefully to "always connected" when the package is unavailable.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        // Dynamic require so the app doesn't crash when NetInfo is absent
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const NetInfo = require('@react-native-community/netinfo').default;

        // Fetch initial state
        const state = await NetInfo.fetch();
        setStatus({
          isConnected: state.isConnected ?? true,
          isInternetReachable: state.isInternetReachable ?? true,
        });

        // Subscribe to changes
        unsubscribe = NetInfo.addEventListener(
          (nextState: { isConnected: boolean | null; isInternetReachable: boolean | null }) => {
            setStatus({
              isConnected: nextState.isConnected ?? true,
              isInternetReachable: nextState.isInternetReachable ?? true,
            });
          },
        );
      } catch {
        // NetInfo not installed — assume connected (graceful fallback)
        setStatus({ isConnected: true, isInternetReachable: true });
      }
    })();

    return () => {
      unsubscribe?.();
    };
  }, []);

  return status;
}
