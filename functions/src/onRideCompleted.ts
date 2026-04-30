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
  cancelledBy?: string;
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
    // Every 5 completed rides, reduce 1 strike (good behaviour reward)
    const currentStrikes: number = data.strikes ?? 0;
    const strikes = totalRides % 5 === 0 && currentStrikes > 0
      ? Math.max(0, currentStrikes - 1)
      : currentStrikes;
    tx.update(userRef, { totalRides, totalSaved, badge, strikes });
  });
}

/**
 * Fires when a ride document transitions to 'completed'.
 * - Updates totalRides, totalSaved, badge for both riders
 * - Reduces a strike every 5 completed rides (good-behaviour reward)
 * - Sends completion push notification to both riders
 */
export const onRideCompleted = functions.firestore
  .document('rides/{rideId}')
  .onWrite(async (change, context) => {
    const before = change.before.data() as Ride | undefined;
    const after = change.after.data() as Ride | undefined;

    if (!after) return;
    if (before?.status === after.status) return;
    if (after.status !== 'completed') return;

    const { rider1, rider2, destination, splitAmount } = after;
    const rideId = context.params.rideId;

    await Promise.allSettled([
      updateRiderStats(rider1, splitAmount),
      updateRiderStats(rider2, splitAmount),
    ]);

    await Promise.allSettled([
      notifyUser(
        rider1,
        '✅ Ride Completed',
        `You arrived at ${destination}. Rate your ride partner!`,
        { rideId, screen: 'RideComplete', destination }
      ),
      notifyUser(
        rider2,
        '✅ Ride Completed',
        `You arrived at ${destination}. Rate your ride partner!`,
        { rideId, screen: 'RideComplete', destination }
      ),
    ]);
  });
