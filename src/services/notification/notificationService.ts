/**
 * notificationService.ts
 * Local notification scheduling via @notifee/react-native.
 *
 * Provides:
 *   - Local notification scheduling
 *   - Badge count management
 *   - Notification category / action definitions for ride request flows
 */

import notifee, {
  AndroidImportance,
  AndroidVisibility,
} from '@notifee/react-native';

// ─── Channel / Category IDs ───────────────────────────────────────────────────

const CHANNEL_ID_RIDES = 'rides';
const CHANNEL_ID_GENERAL = 'general';

export const NOTIFICATION_CATEGORIES = {
  RIDE_REQUEST: 'ride_request',
  RIDE_UPDATE: 'ride_update',
} as const;

// ─── One-time channel setup (call during app init) ────────────────────────────

async function ensureChannels(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID_RIDES,
    name: 'Ride Requests',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500],
  });

  await notifee.createChannel({
    id: CHANNEL_ID_GENERAL,
    name: 'General',
    importance: AndroidImportance.DEFAULT,
    visibility: AndroidVisibility.PRIVATE,
    sound: 'default',
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Display an immediate local notification.
 *
 * @param title  Notification title
 * @param body   Notification body text
 * @param data   Arbitrary key-value data accessible in notification handlers
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: object = {},
): Promise<void> {
  await ensureChannels();

  await notifee.displayNotification({
    title,
    body,
    data: data as Record<string, string>,
    android: {
      channelId: CHANNEL_ID_RIDES,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
      actions: [
        { title: 'Accept', pressAction: { id: 'accept' } },
        { title: 'Decline', pressAction: { id: 'decline' } },
      ],
    },
    ios: {
      categoryId: NOTIFICATION_CATEGORIES.RIDE_REQUEST,
      sound: 'default',
    },
  });
}

/**
 * Cancel every pending and displayed notification.
 */
export async function cancelAllNotifications(): Promise<void> {
  await notifee.cancelAllNotifications();
}

/**
 * Set the app's badge count (iOS) or update the notification count indicator.
 *
 * @param count  Badge count value. Pass 0 to clear the badge.
 */
export async function setBadgeCount(count: number): Promise<void> {
  await notifee.setBadgeCount(count);
}
