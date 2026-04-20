/**
 * messaging.ts — FCM token management and push notification dispatch.
 *
 * React Native does NOT include the firebase/messaging web SDK; token
 * acquisition is handled by @react-native-firebase/messaging.
 * This file provides a clean async interface that wraps the native module
 * and persists tokens to Firestore for server-side targeting.
 */

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';

// Lazy import to avoid bundling issues in environments without the native module
let _messaging: any = null;
async function getMessaging() {
  if (!_messaging) {
    const rnfb = await import('@react-native-firebase/messaging');
    _messaging = rnfb.default();
  }
  return _messaging;
}

const FCM_TOKENS_COLLECTION = 'fcm_tokens';
const FCM_REST_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Request the device's FCM registration token.
 * Returns `null` if permissions are denied or the device cannot be registered.
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const messaging = await getMessaging();
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const token: string = await messaging.getToken();
    return token ?? null;
  } catch (error) {
    console.warn('[messaging] getFCMToken failed:', error);
    return null;
  }
}

/**
 * Persist a user's FCM token to Firestore so Cloud Functions / admin SDK
 * can target them without maintaining a separate token registry.
 */
export async function saveFCMToken(uid: string, token: string): Promise<void> {
  const ref = doc(db, FCM_TOKENS_COLLECTION, uid);
  await setDoc(
    ref,
    {
      token,
      uid,
      updatedAt: Date.now(),
      platform: 'android', // RN is Android-first for this app
    },
    { merge: true },
  );
}

/**
 * Send a push notification via the FCM Legacy HTTP REST API.
 * In production this should be called from a Cloud Function using the Admin SDK.
 * This client-side helper is provided for development convenience and direct
 * user-to-user signalling paths where a backend endpoint is not yet available.
 *
 * @param to      FCM registration token of the target device
 * @param title   Notification title
 * @param body    Notification body text
 * @param data    Arbitrary key-value payload (strings only per FCM spec)
 */
export async function sendPushNotification(
  to: string,
  title: string,
  body: string,
  data: object = {},
): Promise<void> {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    throw new Error('FCM_SERVER_KEY is not configured');
  }

  const payload = {
    to,
    notification: { title, body, sound: 'default' },
    data,
    priority: 'high',
    content_available: true,
  };

  const response = await fetch(FCM_REST_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `key=${serverKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FCM send failed [${response.status}]: ${errorText}`);
  }
}

/**
 * Request notification permissions from the OS.
 * Returns `true` if granted, `false` otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const messaging = await getMessaging();

    // @react-native-firebase/messaging permission levels
    const AuthorizationStatus = {
      AUTHORIZED: 1,
      PROVISIONAL: 3,
    };

    const current = await messaging.hasPermission();
    if (
      current === AuthorizationStatus.AUTHORIZED ||
      current === AuthorizationStatus.PROVISIONAL
    ) {
      return true;
    }

    const status = await messaging.requestPermission();
    return (
      status === AuthorizationStatus.AUTHORIZED ||
      status === AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.warn('[messaging] requestNotificationPermissions failed:', error);
    return false;
  }
}

/**
 * Retrieve the stored FCM token for a given user from Firestore.
 * Useful when one user needs to push to another.
 */
export async function getStoredFCMToken(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, FCM_TOKENS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return (snap.data() as { token: string }).token ?? null;
}
