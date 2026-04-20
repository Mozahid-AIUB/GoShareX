/**
 * RideShare AIUB — Runtime Permission Helpers
 */
import { Linking, Platform } from 'react-native';
import {
  check,
  PERMISSIONS,
  request,
  RESULTS,
  Permission,
} from 'react-native-permissions';
import { logger } from './logger';

// ------------------------------------------------------------------
// Location
// ------------------------------------------------------------------

const LOCATION_PERMISSION: Permission =
  Platform.OS === 'ios'
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

/**
 * Request location permission from the OS.
 * Returns true if GRANTED or LIMITED (iOS).
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const result = await request(LOCATION_PERMISSION);
    const granted =
      result === RESULTS.GRANTED || result === RESULTS.LIMITED;
    logger.info('permissions.requestLocation', result);
    return granted;
  } catch (err) {
    logger.error('permissions.requestLocation', err);
    return false;
  }
}

/**
 * Check current location permission status without prompting.
 */
export async function checkLocationPermission(): Promise<boolean> {
  try {
    const result = await check(LOCATION_PERMISSION);
    return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
  } catch (err) {
    logger.error('permissions.checkLocation', err);
    return false;
  }
}

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
    if (Platform.OS === 'ios') {
      const result = await request(PERMISSIONS.IOS.NOTIFICATIONS);
      return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
    }

    // Android 13+
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const result = await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
      return result === RESULTS.GRANTED;
    }

    // Android < 13: permission not required
    return true;
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
