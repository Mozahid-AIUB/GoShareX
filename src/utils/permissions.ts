/**
 * RideShare AIUB — Runtime Permission Helpers
 *
 * NOTE: location permission এখানে নেই — আসল app flow location-এর জন্য
 * expo-location ব্যবহার করে (locationService.ts/gpsService.ts), এই ফাইলের
 * পুরনো location function দুটো কোথাও call হত না (dead code, সরানো হলো)।
 * react-native-permissions Expo Go-তে native module link না থাকায়
 * import-time-ই crash করে (TurboModuleRegistry.getEnforcing) — তাই এখানে
 * সরিয়ে খাঁটি expo-notifications দিয়ে replace করা হলো, যেটা Expo Go-তেও
 * নিরাপদে চলে (messaging.ts-এর requestNotificationPermissions-এর মতোই)।
 */
import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { logger } from './logger';

// ------------------------------------------------------------------
// Notifications (Android 13 / iOS)
// ------------------------------------------------------------------

/**
 * Request push-notification permission.
 * iOS: prompts the system dialog.
 * Android < 13: always returns true (no prompt required).
 * Android ≥ 13: requests POST_NOTIFICATIONS.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    // Android < 13: permission not required by the OS.
    if (Platform.OS === 'android' && Platform.Version < 33) return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    logger.error('permissions.requestNotification', err);
    return false;
  }
}

// ------------------------------------------------------------------
// Settings deep-link
// ------------------------------------------------------------------

/**
 * Open the app's system settings page so the user can manually toggle permissions.
 */
export function openAppSettings(): void {
  Linking.openSettings().catch((err) => {
    logger.error('permissions.openAppSettings', err);
  });
}
