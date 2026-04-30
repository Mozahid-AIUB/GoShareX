/**
 * notificationHandler.ts
 * Handles local notification events via expo-notifications.
 * Remote push (FCM) requires a dev build — gracefully skipped in Expo Go.
 */

import * as Notifications from 'expo-notifications';
import { logError, logWarning } from '@/services/analytics/crashService';
import { scheduleLocalNotification } from '@/services/notification/notificationService';

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
    console.info('[notifications] Expo Go: remote push listeners skipped. Use a dev build for FCM.');
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
