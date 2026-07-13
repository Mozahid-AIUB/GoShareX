// ============================================================
// Notification Feed Service Router
//
// HomeScreen-এর in-app notification feed (bell icon → list)।
// USE_SUPABASE_AUTH flag অনুযায়ী Supabase বা Firebase impl দেয়, যাতে
// HomeScreen সরাসরি Firestore না ডেকে এই router ব্যবহার করে।
//
// (এটা expo local push — services/notifications/notificationService.ts —
//  থেকে আলাদা; ওটা device banner, এটা in-app feed data।)
// ============================================================
import {
  collection, query, where, orderBy, limit as fbLimit,
  onSnapshot, updateDoc, doc, getDocs,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { supabaseNotificationService } from '@/services/supabase/notificationService';
import { logger } from '@/utils/logger';
import type { AppNotification } from '@/screens/home/utils/homeHelpers';

const useSupabase = FEATURE_FLAGS.USE_SUPABASE_AUTH;
const RECENT_LIMIT = 50;

/** প্রাপকের notification live শোনে — unsubscribe function ফেরত। */
export function subscribeToNotifications(
  uid: string,
  onUpdate: (items: AppNotification[]) => void,
): () => void {
  if (useSupabase) {
    return supabaseNotificationService.subscribeToNotifications(uid, onUpdate);
  }
  // Firebase Firestore (আগের behavior)
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', uid),
    orderBy('createdAt', 'desc'),
    fbLimit(RECENT_LIMIT),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map(
        (d) => ({ id: d.id, type: '', read: false, ...d.data() } as AppNotification),
      );
      onUpdate(items);
    },
    (error) => logger.warn('notifFeed.subscribe', String(error)),
  );
}

/** একটা notification read করা। */
export async function markNotificationRead(id: string): Promise<void> {
  if (useSupabase) {
    await supabaseNotificationService.markRead(id);
    return;
  }
  await updateDoc(doc(db, 'notifications', id), { read: true }).catch(() => {});
}

/** প্রাপকের সব notification read করা। */
export async function markAllNotificationsRead(
  uid: string,
  currentItems: AppNotification[],
): Promise<void> {
  if (useSupabase) {
    await supabaseNotificationService.markAllRead(uid);
    return;
  }
  // Firebase-এ bulk update নেই — প্রতিটা doc আলাদা (আগের behavior)।
  await Promise.all(
    currentItems
      .filter((n) => !n.read)
      .map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true }).catch(() => {})),
  );
}
