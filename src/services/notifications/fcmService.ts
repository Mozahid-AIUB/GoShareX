/**
 * fcmService.ts — typed push notification senders for specific ride events.
 *
 * Reads the target user's FCM token from Firestore and calls the FCM REST API.
 * In production these calls should move to Firebase Cloud Functions to protect
 * the server key; they live here for MVP / rapid iteration.
 */

import {
  getStoredFCMToken,
  sendPushNotification,
} from '@/services/firebase/messaging';
import { logError } from '@/services/analytics/crashService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function push(
  targetUid: string,
  title: string,
  body: string,
  data: object,
): Promise<void> {
  const token = await getStoredFCMToken(targetUid);
  if (!token) {
    console.warn(`[fcmService] No FCM token for uid: ${targetUid}`);
    return;
  }
  await sendPushNotification(token, title, body, data);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Notify a user that someone wants to share a ride with them.
 */
export async function sendRideRequest(
  targetUid: string,
  requesterName: string,
  destination: string,
  fare: number,
  chatId: string,
): Promise<void> {
  try {
    await push(
      targetUid,
      'Ride Request',
      `${requesterName} wants to share a ride to ${destination} — split fare ৳${fare}`,
      {
        type: 'ride_request',
        requesterName,
        destination,
        fare: String(fare),
        chatId,
      },
    );
  } catch (error) {
    logError(error as Error, { fn: 'sendRideRequest', targetUid });
  }
}

/**
 * Notify a user that their ride has been confirmed by their partner.
 */
export async function sendRideConfirmed(
  targetUid: string,
  partnerName: string,
  rideId: string,
): Promise<void> {
  try {
    await push(
      targetUid,
      'Ride Confirmed!',
      `${partnerName} confirmed the ride. Time to head to the pickup point.`,
      { type: 'ride_confirmed', partnerName, rideId },
    );
  } catch (error) {
    logError(error as Error, { fn: 'sendRideConfirmed', targetUid });
  }
}

/**
 * Notify a user that their ride has been cancelled.
 */
export async function sendRideCancelled(
  targetUid: string,
  reason: string,
): Promise<void> {
  try {
    await push(
      targetUid,
      'Ride Cancelled',
      reason || 'Your ride partner has cancelled the ride.',
      { type: 'ride_cancelled', reason },
    );
  } catch (error) {
    logError(error as Error, { fn: 'sendRideCancelled', targetUid });
  }
}

/**
 * Notify a user that their destination has been reached.
 */
export async function sendDestinationReached(
  targetUid: string,
  rideId: string,
): Promise<void> {
  try {
    await push(
      targetUid,
      'You have arrived!',
      'Destination reached. Please rate your ride partner.',
      { type: 'ride_complete', rideId },
    );
  } catch (error) {
    logError(error as Error, { fn: 'sendDestinationReached', targetUid });
  }
}
