import { useCallback, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { logger } from '@/utils/logger';
import { requestNotificationPermission } from '@/utils/permissions';

interface UseNotificationResult {
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  token: string | null;
}

export function useNotification(): UseNotificationResult {
  const [hasPermission, setHasPermission] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const registerToken = useCallback(async () => {
    try {
      // getDevicePushTokenAsync is not available in Expo Go (SDK 53+)
      // The Expo Go app logs an ERROR for this — skip entirely in that environment
      const Constants = require('expo-constants').default;
      const isExpoGo = Constants.executionEnvironment === 'storeClient';
      if (isExpoGo) return;

      const devicePushToken = await Notifications.getDevicePushTokenAsync();
      const pushToken = devicePushToken.data ?? null;
      setToken(pushToken);

      if (pushToken) {
        await storage.set(STORAGE_KEYS.FCM_TOKEN, pushToken);
        logger.info('useNotification', 'Device push token registered');
      }
    } catch (err) {
      logger.error('useNotification.registerToken', err);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await requestNotificationPermission();
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

  useEffect(() => {
    (async () => {
      try {
        const settings = await Notifications.getPermissionsAsync();
        const permitted =
          settings.granted ||
          settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
        setHasPermission(permitted);

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
