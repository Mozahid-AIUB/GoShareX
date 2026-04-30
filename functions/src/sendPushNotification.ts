import * as admin from 'firebase-admin';

export interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a single FCM push notification.
 * Returns true on success, false if the token is invalid/expired (caller should clean up).
 */
export async function sendPushNotification(payload: PushPayload): Promise<boolean> {
  try {
    await admin.messaging().send({
      token: payload.token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'ride_alerts',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });
    return true;
  } catch (err: any) {
    const invalidTokenCodes = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
    ];
    if (invalidTokenCodes.includes(err?.errorInfo?.code)) {
      return false;
    }
    console.error('sendPushNotification error:', err);
    return false;
  }
}

/**
 * Fetch a user's FCM token from Firestore, send a notification,
 * and remove the token if it has expired.
 */
export async function notifyUser(
  uid: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const userSnap = await admin.firestore().collection('users').doc(uid).get();
  if (!userSnap.exists) return;

  const fcmToken: string | undefined = userSnap.data()?.fcmToken;
  if (!fcmToken) return;

  const success = await sendPushNotification({ token: fcmToken, title, body, data });

  if (!success) {
    // Token is stale — clear it so we don't attempt again
    await admin.firestore().collection('users').doc(uid).update({ fcmToken: admin.firestore.FieldValue.delete() });
  }
}
