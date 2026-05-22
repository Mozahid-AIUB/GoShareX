/**
 * pushHandler.ts
 * Handles incoming FCM push notifications and deep-links the user
 * to the appropriate screen based on the notification payload.
 */

import { PushPayload, NotificationType } from '@/types/notification.types';
import { logError } from '@/services/analytics/crashService';

type NavigationRef = {
  navigate: (route: string, params?: Record<string, unknown>) => void;
};

// ─── Navigation routing ───────────────────────────────────────────────────────

function routeNotification(
  payload: Partial<PushPayload>,
  navigation: NavigationRef,
): void {
  const type = payload.type as NotificationType | undefined;

  switch (type) {
    case 'ride_request':
      if (payload.chatId) {
        navigation.navigate('Chat', { chatId: payload.chatId });
      }
      break;

    case 'ride_confirmed':
    case 'ride_started':
      if (payload.rideId) {
        navigation.navigate('ActiveRide', { rideId: payload.rideId });
      }
      break;

    case 'ride_complete':
      if (payload.rideId) {
        navigation.navigate('RideComplete', { rideId: payload.rideId });
      }
      break;

    case 'post_interest':
      navigation.navigate('Board');
      break;

    case 'account_warning':
      navigation.navigate('UserProfile');
      break;

    case 'partner_no_response':
      if (payload.rideId) {
        navigation.navigate('ActiveRide', { rideId: payload.rideId });
      }
      break;

    default:
      navigation.navigate('Home');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

interface IncomingNotification {
  data?: Partial<PushPayload>;
}

interface NotificationResponseShape {
  notification?: { data?: Partial<PushPayload> };
  data?: Partial<PushPayload>;
}

/**
 * Handle a push notification received while the app is in the foreground.
 */
export function handleIncomingPush(
  notification: IncomingNotification | null | undefined,
  navigation: NavigationRef,
): void {
  try {
    const payload: Partial<PushPayload> = notification?.data ?? {};
    routeNotification(payload, navigation);
  } catch (error) {
    logError(error as Error, { handler: 'handleIncomingPush' });
  }
}

/**
 * Handle the user tapping on a push notification from the OS tray.
 */
export function handleNotificationResponse(
  response: NotificationResponseShape | null | undefined,
  navigation: NavigationRef,
): void {
  try {
    const payload: Partial<PushPayload> =
      response?.notification?.data ?? response?.data ?? {};

    routeNotification(payload, navigation);
  } catch (error) {
    logError(error as Error, { handler: 'handleNotificationResponse' });
  }
}
