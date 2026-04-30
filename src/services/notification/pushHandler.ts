/**
 * pushHandler.ts
 * Handles incoming FCM push notifications and deep-links the user
 * to the appropriate screen based on the notification payload.
 */

import { PushPayload, NotificationType } from '@/types/notification.types';
import { logError } from '@/services/analytics/crashService';

// ─── Navigation routing ───────────────────────────────────────────────────────

function routeNotification(
  payload: Partial<PushPayload>,
  navigation: any,
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
      // Unknown type — navigate to home
      navigation.navigate('Home');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Handle a push notification received while the app is in the foreground.
 * Typically triggers an in-app banner rather than an OS notification.
 *
 * @param notification  Raw notification object from @react-native-firebase/messaging
 * @param navigation    React Navigation dispatch-capable navigation ref
 */
export function handleIncomingPush(notification: any, navigation: any): void {
  try {
    const payload: Partial<PushPayload> = notification?.data ?? {};
    // In foreground we typically show an in-app alert — routing is optional
    routeNotification(payload, navigation);
  } catch (error) {
    logError(error as Error, { handler: 'handleIncomingPush' });
  }
}

/**
 * Handle the user tapping on a push notification from the OS tray.
 * This is called both when the app is backgrounded and quit.
 *
 * @param response      Notification response object (from notifee or FCM)
 * @param navigation    React Navigation dispatch-capable navigation ref
 */
export function handleNotificationResponse(response: any, navigation: any): void {
  try {
    // Support both @notifee/react-native and @react-native-firebase/messaging shapes
    const payload: Partial<PushPayload> =
      response?.notification?.data ?? response?.data ?? {};

    routeNotification(payload, navigation);
  } catch (error) {
    logError(error as Error, { handler: 'handleNotificationResponse' });
  }
}
