// ============================================================
// Supabase Chat Presence Service (online/offline)
//
// Firebase RTDB presence (onDisconnect) এর সমতুল্য — Supabase Realtime
// Presence channel দিয়ে। একটা global channel ('online_users')-এ প্রত্যেকে
// নিজের uid track করে; connection dropped হলে Supabase auto leave পাঠায়
// (RTDB onDisconnect-এর মতো, server-side)। অন্যরা channel-এর presence
// state দেখে কে online বোঝে।
//
// Firebase presenceService এর সমতুল্য API:
//   startPresenceTracking(uid) — online হই (login-এর পর)
//   stopPresenceTracking(uid)  — offline হই (logout)
//   listenToPresence(uid, cb)  — অন্য একজন online কিনা শুনি
// ============================================================
import { supabase } from '@/config/supabase.config';
import { logger } from '@/utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

const CHANNEL = 'online_users';
const TIMEOUT_THRESHOLD_MS = 2 * 60 * 1000; // 2 min offline = "Last seen Xm ago"

// নিজের presence track করার channel (login-এ একবার join)।
let selfChannel: RealtimeChannel | null = null;
let selfUid: string | null = null;

/**
 * নিজেকে online মার্ক করি — global presence channel-এ join করে track করি।
 * connection dropped হলে Supabase auto leave (offline) করে। login-এর পর
 * একবার কল করো। idempotent।
 */
export function startPresenceTracking(uid: string): void {
  if (selfUid === uid && selfChannel) return;
  // আগের channel থাকলে ছাড়ি (uid বদলালে)
  if (selfChannel) {
    void supabase.removeChannel(selfChannel);
    selfChannel = null;
  }
  selfUid = uid;
  const channel = supabase.channel(CHANNEL, {
    config: { presence: { key: uid } },
  });
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      void channel.track({ uid, online_at: Date.now() });
    }
  });
  selfChannel = channel;
}

/** নিজেকে offline মার্ক করি (logout) — channel ছেড়ে দিই (auto leave)। */
export async function stopPresenceTracking(_uid: string): Promise<void> {
  selfUid = null;
  if (selfChannel) {
    try {
      await selfChannel.untrack();
      await supabase.removeChannel(selfChannel);
    } catch (err) {
      logger.warn('chatPresence.stop', String(err));
    }
    selfChannel = null;
  }
}

/**
 * অন্য একজন (uid) online কিনা শোনে। Firebase listenToPresence এর সমতুল্য —
 * callback { online, lastSeen, label }। unsubscribe ফেরত।
 *
 * একটা observer channel খুলে presence sync/join/leave শুনি; target uid
 * presence state-এ থাকলে online।
 */
export function listenToPresence(
  uid: string,
  callback: (info: { online: boolean; lastSeen: number; label: string }) => void,
): () => void {
  // observer-কেও presence-সক্ষম channel লাগে state পড়তে; আলাদা নাম দিই
  // যাতে নিজের track channel-এর সাথে সংঘর্ষ না হয়।
  const channel = supabase.channel(CHANNEL, {
    config: { presence: { key: `observer_${uid}_${Math.random().toString(36).slice(2)}` } },
  });

  const emit = () => {
    const state = channel.presenceState() as Record<string, Array<{ online_at?: number }>>;
    const entries = state[uid];
    const online = Array.isArray(entries) && entries.length > 0;
    const lastSeen = online ? (entries[0]?.online_at ?? Date.now()) : 0;
    const stale = !online && lastSeen > 0 && Date.now() - lastSeen > TIMEOUT_THRESHOLD_MS;
    callback({
      online,
      lastSeen,
      label: online ? 'Online' : stale ? formatLastSeen(lastSeen) : 'Offline',
    });
  };

  channel
    .on('presence', { event: 'sync' }, emit)
    .on('presence', { event: 'join' }, emit)
    .on('presence', { event: 'leave' }, emit)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') emit();
    });

  return () => {
    void supabase.removeChannel(channel);
  };
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
