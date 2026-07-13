import { useCallback, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { logger } from '@/utils/logger';
import { requestNotificationPermission } from '@/utils/permissions';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { saveMyPushToken } from '@/services/supabase/pushTokenService';

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
      // getDevicePushTokenAsync/getExpoPushTokenAsync is not available in
      // Expo Go (SDK 53+) — skip entirely in that environment.
      const isExpoGo = Constants.executionEnvironment === 'storeClient';
      if (isExpoGo) return;

      // send-push Edge Function শুধু "ExponentPushToken..." format accept
      // করে (Expo push API-তে পাঠায়, কোনো FCM/APNs credential ছাড়াই)।
      // getDevicePushTokenAsync() raw platform token (FCM registration id/
      // APNs device token) দেয় — ওই format-এ token পাঠালে Edge Function
      // "not an Expo token" বলে চুপচাপ skip করত (push কখনো পৌঁছাত না)।
      // getExpoPushTokenAsync() সঠিক "ExponentPushToken[...]" format দেয়।
      const projectId =
        Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
      const expoPushToken = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      const pushToken = expoPushToken.data ?? null;
      setToken(pushToken);

      if (pushToken) {
        await storage.set(STORAGE_KEYS.FCM_TOKEN, pushToken);
        logger.info('useNotification', 'Device push token registered');
        // Supabase mode-এ token-টা users টেবিলেও save করি (server থেকে push
        // পাঠাতে দরকার)। Firebase save আগের মতোই messaging.ts-এ হয়।
        if (FEATURE_FLAGS.USE_SUPABASE_AUTH) {
          await saveMyPushToken(pushToken);
        }
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
