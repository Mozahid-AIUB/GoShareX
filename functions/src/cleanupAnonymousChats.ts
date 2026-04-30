import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const cleanupAnonymousChats = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    const now = Date.now();
    const expiredChats = await db
      .collection('chats')
      .where('expiresAt', '<=', now)
      .get();

    let deletedChats = 0;
    let deletedMessages = 0;

    for (const chatDoc of expiredChats.docs) {
      const messages = await chatDoc.ref.collection('messages').get();
      let batch = db.batch();
      let ops = 0;

      for (const messageDoc of messages.docs) {
        batch.delete(messageDoc.ref);
        deletedMessages += 1;
        ops += 1;

        if (ops === 400) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }

      batch.delete(chatDoc.ref);
      deletedChats += 1;
      await batch.commit();
    }

    console.log(`Deleted ${deletedChats} expired chats and ${deletedMessages} messages`);
    return null;
  });
