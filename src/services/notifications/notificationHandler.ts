/**
 * notificationHandler.ts
 * Handles local notification events via expo-notifications.
 * Remote push (FCM) requires a dev build — gracefully skipped in Expo Go.
 */

import * as Notifications from 'expo-notifications';
import { logError, logWarning } from '@/services/analytics/crashService';
import { scheduleLocalNotification } from '@/services/notifications/notificationService';
import { useNotificationPrefsStore } from '@/store/notificationPrefsStore';
import { logger } from '@/utils/logger';

/**
 * receiver-এর Settings toggle অনুযায়ী এই notification দেখানো হবে কি না।
 * ride-সম্পর্কিত → notifRides, chat → notifChat। toggle off হলে suppress।
 * (এটা receiver-এর device-এ চলে, তাই তার নিজের পছন্দই প্রযোজ্য।)
 */
function isNotificationAllowed(type: string): boolean {
  const prefs = useNotificationPrefsStore.getState();
  if (type === 'chat_message' || type === 'new_message') return prefs.notifChat;
  if (
    type === 'ride_request' || type === 'ride_confirmed' || type === 'ride_started' ||
    type === 'ride_complete' || type === 'ride_cancelled' || type === 'partner_no_response'
  ) {
    return prefs.notifRides;
  }
  return true; // অন্য ধরনের (account warning ইত্যাদি) সবসময় দেখাই।
}

function isExpoGo(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default;
    return Constants.executionEnvironment === 'storeClient';
  } catch {
    return false;
  }
}

export function setupNotificationHandlers(): void {
  if (isExpoGo()) {
    logger.info('notifications', 'Expo Go: remote push listeners skipped. Use a dev build for FCM.');
    return;
  }

  Notifications.addNotificationReceivedListener((notification) => {
    handleForegroundNotification(notification);
  });

  Notifications.addNotificationResponseReceivedListener((response) => {
    handleBackgroundNotification(response.notification);
  });
}

export function handleForegroundNotification(notification: any): void {
  try {
    const title: string = notification?.request?.content?.title ?? 'GoShareX';
    const body: string = notification?.request?.content?.body ?? '';
    const data: Record<string, any> = notification?.request?.content?.data ?? {};

    // receiver যদি এই ধরনের notification বন্ধ রাখে (Settings toggle) → দেখাই না।
    if (!isNotificationAllowed(String(data?.type ?? ''))) {
      logger.info('notifications', `Suppressed by user toggle: ${data?.type}`);
      return;
    }

    scheduleLocalNotification(title, body, data).catch((err) =>
      logError(err as Error, { fn: 'handleForegroundNotification' }),
    );
  } catch (error) {
    logError(error as Error, { fn: 'handleForegroundNotification' });
  }
}

export function handleBackgroundNotification(notification: any): void {
  try {
    const type: string = notification?.request?.content?.data?.type ?? 'unknown';
    logWarning(`Background notification received: ${type}`, {
      id: notification?.request?.identifier,
    });
  } catch (error) {
    logError(error as Error, { fn: 'handleBackgroundNotification' });
  }
}
