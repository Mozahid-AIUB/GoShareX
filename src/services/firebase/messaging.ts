/**
 * messaging.ts — FCM token management and push notification dispatch.
 *
 * Remote push tokens require a development build (SDK 53+).
 * In Expo Go, token registration is skipped gracefully — local notifications still work.
 */

import * as Notifications from 'expo-notifications';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';

const FCM_TOKENS_COLLECTION = 'fcm_tokens';

/**
 * Configure how notifications are presented when the app is in the foreground.
 * Must be called once at app startup (before any notification can arrive).
 * Skipped silently in Expo Go (SDK 53+) where remote push is unavailable.
 */
export function configureNotificationHandler(): void {
  if (isExpoGo()) {
    console.info('[messaging] Expo Go detected — skipping notification handler setup. Use a dev build for push notifications.');
    return;
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
}

/** True when running inside Expo Go (not a standalone/dev build). */
function isExpoGo(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default;
    return Constants.executionEnvironment === 'storeClient';
  } catch {
    return false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Request the device's Expo push token.
 * Returns `null` in Expo Go (SDK 53+) or if permissions are denied.
 */
export async function getFCMToken(): Promise<string | null> {
  if (isExpoGo()) {
    console.info('[messaging] Expo Go detected — remote push tokens unavailable. Use a dev build.');
    return null;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync();

    return tokenData.data ?? null;
  } catch (error: any) {
    // SDK 53: "expo-notifications: Android Push notifications...removed from Expo Go"
    if (
      typeof error?.message === 'string' &&
      error.message.includes('expo-notifications')
    ) {
      console.info('[messaging] Push token unavailable in Expo Go — use a dev build.');
    } else {
      console.warn('[messaging] getFCMToken failed:', error);
    }
    return null;
  }
}

/**
 * Persist a user's push token to Firestore.
 * Writes to both fcm_tokens/{uid} (indexed lookup) and users/{uid}.fcmToken
 * so Cloud Functions can find it without an extra collection query.
 */
export async function saveFCMToken(uid: string, token: string): Promise<void> {
  await Promise.all([
    setDoc(
      doc(db, FCM_TOKENS_COLLECTION, uid),
      { token, uid, updatedAt: Date.now(), platform: 'android' },
      { merge: true },
    ),
    updateDoc(doc(db, 'users', uid), { fcmToken: token }),
  ]);
}

/**
 * Send a push notification via Expo Push API.
 * In production this should be called from a Cloud Function.
 */
export async function sendPushNotification(
  to: string,
  title: string,
  body: string,
  data: object = {},
): Promise<void> {
  try {
    const payload = {
      to,
      notification: { title, body, sound: 'default' },
      data: Object.entries(data).reduce((acc, [k, v]) => {
        acc[k] = String(v);
        return acc;
      }, {} as Record<string, string>),
      priority: 'high',
      content_available: true,
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[messaging] sendPushNotification failed [${response.status}]: ${errorText}`);
    }
  } catch (error) {
    console.warn('[messaging] sendPushNotification error:', error);
  }
}

/**
 * Request notification permissions from the OS.
 * Returns `true` if granted, `false` otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('[messaging] requestNotificationPermissions failed:', error);
    return false;
  }
}

/**
 * Retrieve the stored push token for a given user from Firestore.
 */
export async function getStoredFCMToken(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, FCM_TOKENS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return (snap.data() as { token: string }).token ?? null;
}
