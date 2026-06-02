import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

function serializeValue(value: any): any {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (typeof value === 'object') {
    const maybeTimestamp = value as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === 'function') {
      return maybeTimestamp.toDate().toISOString();
    }

    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serializeValue(val);
    }
    return out;
  }

  return String(value);
}

async function deleteCollectionDocs(
  query: admin.firestore.Query,
  batchSize = 250,
): Promise<number> {
  let deleted = 0;

  // Loop in batches so we can safely delete arbitrarily large result sets.
  while (true) {
    const snap = await query.limit(batchSize).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snap.size;

    if (snap.size < batchSize) break;
  }

  return deleted;
}

async function deleteMessagesForChat(chatId: string): Promise<number> {
  const messagesRef = db.collection('chats').doc(chatId).collection('messages');
  return deleteCollectionDocs(messagesRef.orderBy('timestamp', 'asc'));
}

async function readDocs(query: admin.firestore.Query): Promise<Array<Record<string, any>>> {
  const snap = await query.get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...serializeValue(doc.data()),
  })) as Array<Record<string, any>>;
}

export const exportMyData = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const uid = context.auth.uid;

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    const activeRiderDoc = await db.collection('active_riders').doc(uid).get();
    const chatsSnap = await db.collection('chats').where('participants', 'array-contains', uid).get();

    const chats = await Promise.all(
      chatsSnap.docs.map(async (chatDoc) => {
        const messagesSnap = await chatDoc.ref.collection('messages').where('senderId', '==', uid).get();
        return {
          id: chatDoc.id,
          ...serializeValue(chatDoc.data()),
          messagesAuthoredByMe: messagesSnap.docs.map((msg) => ({
            id: msg.id,
            ...serializeValue(msg.data()),
          })),
        };
      })
    );

    const [ridesAsRider1, ridesAsRider2, posts, ratings, auditLogs] = await Promise.all([
      readDocs(db.collection('rides').where('rider1', '==', uid)),
      readDocs(db.collection('rides').where('rider2', '==', uid)),
      readDocs(db.collection('posts').where('authorId', '==', uid)),
      readDocs(db.collection('ratings').where('raterId', '==', uid)),
      readDocs(db.collection('audit_logs').where('userId', '==', uid)),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user: userDoc.exists ? { id: userDoc.id, ...serializeValue(userDoc.data()) } : null,
      activeRider: activeRiderDoc.exists ? { id: activeRiderDoc.id, ...serializeValue(activeRiderDoc.data()) } : null,
      rides: [...ridesAsRider1, ...ridesAsRider2],
      chats,
      posts,
      ratings,
      auditLogs,
    };
  } catch (error) {
    functions.logger.error('exportMyData failed', error);
    throw new functions.https.HttpsError('internal', 'Failed to export account data');
  }
});

export const deleteMyAccount = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const uid = context.auth.uid;
  const now = new Date().toISOString();

  try {
    await db.collection('audit_logs').add({
      eventType: 'account_delete',
      userId: uid,
      severity: 'info',
      timestamp: admin.firestore.Timestamp.now(),
      timestampUnix: Math.floor(Date.now() / 1000),
      details: { source: 'client', requestedAt: now },
    });

    const chatsSnap = await db.collection('chats').where('participants', 'array-contains', uid).get();
    for (const chatDoc of chatsSnap.docs) {
      await deleteMessagesForChat(chatDoc.id);
      await chatDoc.ref.delete();
    }

    await Promise.all([
      deleteCollectionDocs(db.collection('rides').where('rider1', '==', uid)),
      deleteCollectionDocs(db.collection('rides').where('rider2', '==', uid)),
      deleteCollectionDocs(db.collection('posts').where('authorId', '==', uid)),
      deleteCollectionDocs(db.collection('ratings').where('raterId', '==', uid)),
      deleteCollectionDocs(db.collection('reports').where('reporterId', '==', uid)),
      deleteCollectionDocs(db.collection('users').doc(uid).collection('blocked')),
      db.collection('users').doc(uid).delete().catch(() => undefined),
      db.collection('active_riders').doc(uid).delete().catch(() => undefined),
      db.collection('fcm_tokens').doc(uid).delete().catch(() => undefined),
    ]);

    await admin.auth().deleteUser(uid).catch((error) => {
      functions.logger.warn('deleteMyAccount.authDelete failed', error);
    });

    return {
      success: true,
      deletedAt: now,
      note: 'Shared ride/chat records related to this account were removed. Audit logs may be retained for compliance.',
    };
  } catch (error) {
    functions.logger.error('deleteMyAccount failed', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete account');
  }
});
