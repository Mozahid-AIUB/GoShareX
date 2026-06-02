import * as functions from 'firebase-functions';
import { notifyUser } from './sendPushNotification';

interface Ride {
  rider1: string;
  rider2: string;
  destination: string;
  fare: number;
  splitAmount: number;
  status: string;
}

/**
 * Triggered when a ride document is created or its status changes to 'confirmed'.
 * Notifies both riders with a push notification.
 */
export const onRideConfirmed = functions.firestore
  .document('rides/{rideId}')
  .onWrite(async (change, context) => {
    const before = change.before.data() as Ride | undefined;
    const after = change.after.data() as Ride | undefined;

    if (!after) return; // ride was deleted

    const statusChanged = before?.status !== after.status;
    const isNowConfirmed = after.status === 'confirmed';

    if (!statusChanged || !isNowConfirmed) return;

    const { rider1, rider2, destination, splitAmount } = after;
    const rideId = context.params.rideId;

    const notifyBoth = [
      notifyUser(
        rider1,
        '🚗 Ride Confirmed!',
        `Your ride to ${destination} is confirmed. Share: ৳${splitAmount} each.`,
        { rideId, screen: 'RideConfirmed', destination }
      ),
      notifyUser(
        rider2,
        '🚗 Ride Confirmed!',
        `Your ride to ${destination} is confirmed. Share: ৳${splitAmount} each.`,
        { rideId, screen: 'RideConfirmed', destination }
      ),
    ];

    await Promise.allSettled(notifyBoth);
  });
