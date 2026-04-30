import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Runs every hour. Deletes posts older than 24 hours.
export const autoExpirePosts = functions.pubsub
  .schedule('every 60 minutes')
  .onRun(async () => {
    const db = admin.firestore();
    const cutoff = Date.now();

    const snap = await db
      .collection('posts')
      .where('expiresAt', '<=', cutoff)
      .get();

    if (snap.empty) {
      console.log('No expired posts found.');
      return null;
    }

    const BATCH_LIMIT = 400;
    let batch = db.batch();
    let ops = 0;

    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      ops += 1;
      if (ops === BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }

    if (ops > 0) await batch.commit();

    console.log(`Deleted ${snap.size} expired posts.`);
    return null;
  });
