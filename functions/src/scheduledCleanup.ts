import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Runs every 5 minutes.
 * Removes stale active_rider entries (no update in 5+ minutes).
 * Expires posts older than 30 minutes.
 */
export const scheduledCleanup = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    const now = Math.floor(Date.now() / 1000);
    const staleThreshold = now - 300; // 5 minutes

    // Remove stale riders
    const staleRiders = await db.collection('active_riders')
      .where('timestamp', '<', staleThreshold)
      .get();

    const batch = db.batch();
    staleRiders.forEach((doc) => batch.delete(doc.ref));

    // Expire old posts
    const expiredPosts = await db.collection('posts')
      .where('status', '==', 'open')
      .where('expiresAt', '<', now)
      .get();

    expiredPosts.forEach((doc) =>
      batch.update(doc.ref, { status: 'expired' })
    );

    await batch.commit();
    console.log(`Cleaned ${staleRiders.size} riders, ${expiredPosts.size} posts`);
  });
