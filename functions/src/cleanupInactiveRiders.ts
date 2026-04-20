import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const INACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export const cleanupInactiveRiders = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    const rtdb = admin.database();
    const snapshot = await rtdb.ref('active_riders').once('value');
    const now = Date.now();
    const updates: Record<string, null> = {};

    snapshot.forEach((child) => {
      const data = child.val();
      if (now - data.timestamp > INACTIVE_THRESHOLD_MS) {
        updates[child.key!] = null;
      }
    });

    if (Object.keys(updates).length) {
      await rtdb.ref('active_riders').update(updates);
    }
  });
