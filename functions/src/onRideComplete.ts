import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { notifyUser } from './sendPushNotification';

interface Ride {
  rider1: string;
  rider2: string;
  destination: string;
  fare: number;
  splitAmount: number;
  status: string;
  rider1Rating?: number;
  rider2Rating?: number;
}

const BADGE_THRESHOLDS: Array<{ min: number; badge: string }> = [
  { min: 50, badge: 'Elite Rider' },
  { min: 21, badge: 'Trusted Rider' },
  { min: 6, badge: 'Regular Rider' },
  { min: 0, badge: 'New Rider' },
];

function badgeForRides(totalRides: number): string {
  return BADGE_THRESHOLDS.find((t) => totalRides >= t.min)?.badge ?? 'New Rider';
}

async function updateRiderStats(uid: string, splitAmount: number): Promise<void> {
  const userRef = admin.firestore().collection('users').doc(uid);

  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) return;

    const data = snap.data()!;
    const totalRides: number = (data.totalRides ?? 0) + 1;
    const totalSaved: number = (data.totalSaved ?? 0) + splitAmount;
    const badge = badgeForRides(totalRides);

    tx.update(userRef, { totalRides, totalSaved, badge });
  });
}

/**
 * Triggered when a ride status changes to 'completed'.
 * Updates both riders' stats (totalRides, totalSaved, badge) and sends notifications.
 */
export const onRideComplete = functions.firestore
  .document('rides/{rideId}')
  .onWrite(async (change, context) => {
    const before = change.before.data() as Ride | undefined;
    const after = change.after.data() as Ride | undefined;

    if (!after) return;

    const statusChanged = before?.status !== after.status;
    const isNowComplete = after.status === 'completed';

    if (!statusChanged || !isNowComplete) return;

    const { rider1, rider2, destination, splitAmount } = after;

    // Update stats for both riders concurrently — each inside its own transaction
    await Promise.allSettled([
      updateRiderStats(rider1, splitAmount),
      updateRiderStats(rider2, splitAmount),
    ]);

    // Send completion notifications
    await Promise.allSettled([
      notifyUser(
        rider1,
        '✅ Ride Completed',
        `You arrived at ${destination}. Rate your ride partner!`,
        { screen: 'RideComplete', destination }
      ),
      notifyUser(
        rider2,
        '✅ Ride Completed',
        `You arrived at ${destination}. Rate your ride partner!`,
        { screen: 'RideComplete', destination }
      ),
    ]);
  });
