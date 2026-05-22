import * as Notifications from 'expo-notifications';

const CHANNEL_ID_RIDES = 'rides';
const CHANNEL_ID_GENERAL = 'general';

export const NOTIFICATION_CATEGORIES = {
  RIDE_REQUEST: 'ride_request',
  RIDE_UPDATE: 'ride_update',
} as const;

async function ensureChannels(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID_RIDES, {
    name: 'Ride Requests',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [300, 500],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync(CHANNEL_ID_GENERAL, {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    sound: 'default',
  });
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: object = {},
): Promise<void> {
  await ensureChannels();

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data as Record<string, string>,
      sound: 'default',
      categoryIdentifier: NOTIFICATION_CATEGORIES.RIDE_REQUEST,
    },
    trigger: null,
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}
