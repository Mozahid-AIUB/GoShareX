import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { notifyUser } from './sendPushNotification';

/**
 * Fires 1 hour after a ride completes.
 * Sends a "How was your partner?" notification to each rider
 * who has not yet submitted a rating for that ride.
 */
export const rideRatingReminder = functions.firestore
  .document('rides/{rideId}')
  .onWrite(async (change, context) => {
    const before = change.before.data();
    const after  = change.after.data();

    if (!after) return;
    if (before?.status === after.status) return;
    if (after.status !== 'completed') return;

    const rideId = context.params.rideId;
    // Store reminder timestamp — the scheduledRatingReminder picks it up every 5 min.
    const reminderAt = Date.now() + 60 * 60 * 1000; // 1 hour

    await admin.firestore().collection('rides').doc(rideId).update({
      ratingReminderAt: reminderAt,
      ratingReminderSent: false,
    });
  });

/**
 * Runs every 5 minutes. Finds rides whose ratingReminderAt has passed
 * and sends the "Rate your partner" push to riders who haven't rated yet.
 */
export const scheduledRatingReminder = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    const now = Date.now();
    const db  = admin.firestore();

    const snap = await db
      .collection('rides')
      .where('status', '==', 'completed')
      .where('ratingReminderSent', '==', false)
      .where('ratingReminderAt', '<=', now)
      .limit(50)
      .get();

    if (snap.empty) return;

    const batch = db.batch();

    await Promise.allSettled(
      snap.docs.map(async (rideDoc) => {
        const ride = rideDoc.data() as {
          rider1: string;
          rider2: string;
          destination: string;
          rated_rider1?: boolean;
          rated_rider2?: boolean;
          [key: string]: unknown;
        };
        const rideId = rideDoc.id;

        const notifs: Promise<void>[] = [];

        if (!ride[`rated_${ride.rider1}`]) {
          notifs.push(
            notifyUser(
              ride.rider1,
              '⭐ How was your ride partner?',
              `You shared a ride to ${ride.destination} an hour ago. Tap to rate your partner!`,
              { rideId, screen: 'RideComplete', type: 'rating_reminder' }
            )
          );
        }

        if (!ride[`rated_${ride.rider2}`]) {
          notifs.push(
            notifyUser(
              ride.rider2,
              '⭐ How was your ride partner?',
              `You shared a ride to ${ride.destination} an hour ago. Tap to rate your partner!`,
              { rideId, screen: 'RideComplete', type: 'rating_reminder' }
            )
          );
        }

        await Promise.allSettled(notifs);
        batch.update(rideDoc.ref, { ratingReminderSent: true });
      })
    );

    await batch.commit();
  });
