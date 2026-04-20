import { useCallback, useEffect, useState } from 'react';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { logger } from '@/utils/logger';

interface UseNotificationResult {
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  token: string | null;
}

/**
 * Manages FCM push-notification permission and device token.
 * Persists the token to AsyncStorage so other services can read it offline.
 */
export function useNotification(): UseNotificationResult {
  const [hasPermission, setHasPermission] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  /** Register the FCM token and persist it */
  const registerToken = useCallback(async () => {
    try {
      const fcmToken = await messaging().getToken();
      setToken(fcmToken);
      await storage.set(STORAGE_KEYS.FCM_TOKEN, fcmToken);
      logger.info('useNotification', 'FCM token registered');
    } catch (err) {
      logger.error('useNotification.registerToken', err);
    }
  }, []);

  /** Request permission from the OS (iOS prompt / Android 13+ prompt) */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      let granted = false;

      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        granted =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      } else {
        // Android ≤ 12 doesn't need a prompt; Android 13+ is handled by
        // the system — messaging().requestPermission() still works.
        const authStatus = await messaging().requestPermission();
        granted =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      }

      setHasPermission(granted);

      if (granted) {
        await registerToken();
      }

      return granted;
    } catch (err) {
      logger.error('useNotification.requestPermission', err);
      return false;
    }
  }, [registerToken]);

  // Check current permission on mount and load persisted token
  useEffect(() => {
    (async () => {
      try {
        const authStatus = await messaging().hasPermission();
        const permitted =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        setHasPermission(permitted);

        // Load persisted token
        const savedToken = await storage.get<string>(STORAGE_KEYS.FCM_TOKEN);
        if (savedToken) {
          setToken(savedToken);
        } else if (permitted) {
          await registerToken();
        }
      } catch (err) {
        logger.error('useNotification.init', err);
      }
    })();
  }, [registerToken]);

  return { hasPermission, requestPermission, token };
}
