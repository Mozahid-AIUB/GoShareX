/**
 * notificationHandler.ts
 * Registers global handlers for FCM messages in all app states.
 *
 * Call `setupNotificationHandlers()` once during app bootstrap (App.tsx).
 */

import { AppState } from 'react-native';
import { logError, logWarning } from '@/services/analytics/crashService';
import { scheduleLocalNotification } from '@/services/notification/notificationService';

// Lazy import so the module is not bundled on web / Expo Go without native support
async function getMessaging() {
  const mod = await import('@react-native-firebase/messaging');
  return mod.default();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Wire up FCM message handlers for foreground, background and quit states.
 * Must be called **before** the React tree is mounted so background messages
 * are not missed.
 */
export function setupNotificationHandlers(): void {
  // Background / quit handler (registered globally — cannot use hooks)
  getMessaging()
    .then((messaging: any) => {
      messaging.setBackgroundMessageHandler(async (remoteMessage: any) => {
        handleBackgroundNotification(remoteMessage);
      });
    })
    .catch((err: unknown) =>
      logWarning('Failed to register background message handler', { err }),
    );
}

/**
 * Handle an FCM notification received while the app is in the foreground.
 * Shows a local in-app notification banner via notifee.
 *
 * @param notification  Remote message from @react-native-firebase/messaging
 */
export function handleForegroundNotification(notification: any): void {
  try {
    const { notification: n = {}, data = {} } = notification ?? {};
    const title: string = n.title ?? data.title ?? 'RideShare AIUB';
    const body: string = n.body ?? data.body ?? '';

    scheduleLocalNotification(title, body, data).catch((err) =>
      logError(err as Error, { fn: 'handleForegroundNotification' }),
    );
  } catch (error) {
    logError(error as Error, { fn: 'handleForegroundNotification' });
  }
}

/**
 * Handle an FCM notification received while the app is in the background or quit.
 * Primarily used for analytics / logging; the OS handles display automatically
 * for notification messages.
 *
 * @param notification  Remote message from @react-native-firebase/messaging
 */
export function handleBackgroundNotification(notification: any): void {
  try {
    const type: string = notification?.data?.type ?? 'unknown';
    logWarning(`Background notification received: ${type}`, {
      messageId: notification?.messageId,
    });
    // Additional background processing (e.g. updating Zustand store via MMKV)
    // can be added here when needed.
  } catch (error) {
    logError(error as Error, { fn: 'handleBackgroundNotification' });
  }
}
