/**
 * presenceService.ts — Real-time online/offline tracking via Firebase RTDB.
 *
 * Why RTDB and not Firestore: RTDB has built-in `onDisconnect()` which
 * fires server-side when the client connection drops (app killed, lost
 * network). Firestore has no equivalent — would need Cloud Function +
 * heartbeat. RTDB is purpose-built for presence.
 *
 * Path: presence/{uid} = { state: 'online' | 'offline', last_changed: number }
 */

import { onDisconnect, onValue, ref, set } from 'firebase/database';
import { realtimeDb } from '@/config/firebase.config';
import { logger } from '@/utils/logger';

const TIMEOUT_THRESHOLD_MS = 2 * 60 * 1000; // 2 min offline = "Last seen 2m ago"

let activeUid: string | null = null;

/**
 * Mark this user as online. Sets up onDisconnect handler so that when
 * the client connection drops, the server flips them to offline.
 *
 * Call once after login. Idempotent.
 */
export function startPresenceTracking(uid: string): void {
  if (activeUid === uid) return;
  activeUid = uid;
  const presenceRef = ref(realtimeDb, `presence/${uid}`);

  // Server-side: when this connection drops, set state to offline
  onDisconnect(presenceRef)
    .set({ state: 'offline', last_changed: Date.now() })
    .catch((err) => logger.warn('presenceService.onDisconnect', err));

  // Client-side: mark online now
  set(presenceRef, { state: 'online', last_changed: Date.now() }).catch((err) =>
    logger.warn('presenceService.setOnline', err),
  );
}

/**
 * Mark this user as offline immediately (manual call e.g. on logout).
 */
export async function stopPresenceTracking(uid: string): Promise<void> {
  activeUid = null;
  try {
    await set(ref(realtimeDb, `presence/${uid}`), {
      state: 'offline',
      last_changed: Date.now(),
    });
  } catch (err) {
    logger.warn('presenceService.setOffline', err);
  }
}

/**
 * Subscribe to another user's presence. Returns unsubscribe function.
 * Callback receives { online, lastSeen, label }.
 */
export function listenToPresence(
  uid: string,
  callback: (info: { online: boolean; lastSeen: number; label: string }) => void,
): () => void {
  const presenceRef = ref(realtimeDb, `presence/${uid}`);
  const unsub = onValue(presenceRef, (snap) => {
    const data = snap.val() as { state?: string; last_changed?: number } | null;
    if (!data) {
      callback({ online: false, lastSeen: 0, label: 'Offline' });
      return;
    }
    const online = data.state === 'online';
    const lastSeen = data.last_changed ?? 0;
    const stale = !online && Date.now() - lastSeen > TIMEOUT_THRESHOLD_MS;
    callback({
      online,
      lastSeen,
      label: online ? 'Online' : stale ? formatLastSeen(lastSeen) : 'Just now',
    });
  });
  return () => unsub();
}

function formatLastSeen(ts: number): string {
  if (!ts) return 'Offline';
  const ago = Date.now() - ts;
  const min = Math.floor(ago / 60_000);
  if (min < 1) return 'Just now';
  if (min < 60) return `Last seen ${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Last seen ${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `Last seen ${day}d ago`;
}
