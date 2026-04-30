import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { notifyUser } from './sendPushNotification';

const SUSPENSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_STRIKES = 3;

/**
 * Triggered when a ride status changes to 'cancelled'.
 * Increments the canceller's strike count. Suspends the user if strikes >= MAX_STRIKES.
 */
export const penaltyCheck = functions.firestore
  .document('rides/{rideId}')
  .onWrite(async (change, _context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (!after) return;

    const statusChanged = before?.status !== after.status;
    const isNowCancelled = after.status === 'cancelled';

    if (!statusChanged || !isNowCancelled) return;

    // Determine who cancelled (the one who is NOT the initiating rider; fallback to rider1)
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

        // Notify out-of-band (don't block the transaction)
        notifyUser(
          cancelledBy,
          '⚠️ Account Suspended',
          `Your account has been suspended for 24 hours due to ${strikes} ride cancellations.`,
          { screen: 'Suspension' }
        ).catch((err) => console.error('Suspension notify error:', err));
      } else {
        tx.update(userRef, { strikes });
      }
    });
  });
