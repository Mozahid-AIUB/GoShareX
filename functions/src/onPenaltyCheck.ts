import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { notifyUser } from './sendPushNotification';

const SUSPENSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_STRIKES = 3;

/**
 * Fires when a ride document transitions to 'cancelled'.
 * - Determines who cancelled (via cancelledBy field, fallback rider1)
 * - Increments that user's strike count atomically
 * - Suspends the user for 24 hours when strikes reach MAX_STRIKES
 * - Sends a warning or suspension push notification
 */
export const onPenaltyCheck = functions.firestore
  .document('rides/{rideId}')
  .onWrite(async (change, _context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (!after) return;
    if (before?.status === after.status) return;
    if (after.status !== 'cancelled') return;

    const cancelledBy: string = after.cancelledBy ?? after.rider1;
    if (!cancelledBy) return;

    const userRef = admin.firestore().collection('users').doc(cancelledBy);

    await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) return;

      const data = snap.data()!;
      const strikes: number = (data.strikes ?? 0) + 1;

      if (strikes >= MAX_STRIKES) {
        const suspendedUntil = Date.now() + SUSPENSION_DURATION_MS;
        tx.update(userRef, {
          strikes,
          isSuspended: true,
          suspendedUntil,
          suspensionReason: `Suspended after ${strikes} ride cancellations.`,
        });

        notifyUser(
          cancelledBy,
          '⚠️ Account Suspended',
          `Your account has been suspended for 24 hours after ${strikes} ride cancellations.`,
          { screen: 'Suspension' }
        ).catch(() => {});
      } else {
        tx.update(userRef, { strikes });

        const remaining = MAX_STRIKES - strikes;
        notifyUser(
          cancelledBy,
          '⚠️ Cancellation Warning',
          `You have ${strikes} cancellation strike${strikes > 1 ? 's' : ''}. ${remaining} more will result in a 24-hour suspension.`,
          { screen: 'Home' }
        ).catch(() => {});
      }
    });
  });
