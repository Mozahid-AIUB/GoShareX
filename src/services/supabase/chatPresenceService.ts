// ============================================================
// Supabase Chat Presence Service (online/offline)
//
// Firebase RTDB presence (onDisconnect) এর সমতুল্য — Supabase Realtime
// Presence channel দিয়ে। একটাই global channel ('online_users') সবাই
// শেয়ার করে; নিজের uid track করি, connection dropped হলে Supabase auto
// leave পাঠায় (RTDB onDisconnect-এর মতো, server-side)।
//
// গুরুত্বপূর্ণ: একই client-এ একই channel নাম দুবার subscribe করা যায় না
// (".on() after subscribe()" crash)। তাই একটাই channel instance রাখি —
// self-track ও observer-listener দুটোই এর উপর। presence callback অবশ্যই
// subscribe()-এর আগে register করতে হয়।
//
// API (Firebase presenceService এর সমতুল্য):
//   startPresenceTracking(uid) — online হই (login-এর পর)
//   stopPresenceTracking(uid)  — offline হই (logout)
//   listenToPresence(uid, cb)  — অন্য একজন online কিনা শুনি
// ============================================================
import { supabase } from '@/config/supabase.config';
import { logger } from '@/utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

const CHANNEL = 'online_users';
const TIMEOUT_THRESHOLD_MS = 2 * 60 * 1000; // 2 min offline = "Last seen Xm ago"

// একটাই shared channel — পুরো অ্যাপে এক instance।
let channel: RealtimeChannel | null = null;
let myUid: string | null = null;
// presence state বদলালে যাদের জানাতে হবে (listenToPresence subscribers)।
const listeners = new Set<() => void>();

/** shared channel তৈরি (একবার) — presence callback subscribe-এর আগে register। */
function ensureChannel(): RealtimeChannel {
  if (channel) return channel;
  const ch = supabase.channel(CHANNEL, {
    config: { presence: { key: myUid ?? 'anon' } },
  });
  // state বদলালে সব listener-কে জানাই।
  const notify = () => listeners.forEach((fn) => fn());
  ch.on('presence', { event: 'sync' }, notify)
    .on('presence', { event: 'join' }, notify)
    .on('presence', { event: 'leave' }, notify)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (myUid) void ch.track({ uid: myUid, online_at: Date.now() });
        notify();
      }
    });
  channel = ch;
  return ch;
}

/**
 * নিজেকে online মার্ক করি — shared channel-এ track করি। connection dropped
 * হলে Supabase auto leave (offline)। login-এর পর একবার কল করো। idempotent।
 */
export function startPresenceTracking(uid: string): void {
  myUid = uid;
  const ch = ensureChannel();
  // channel ইতিমধ্যে subscribed হলে এখনই track; নাহলে subscribe callback করবে।
  void ch.track({ uid, online_at: Date.now() }).catch((err) =>
    logger.warn('chatPresence.track', String(err)),
  );
}

/** নিজেকে offline মার্ক করি (logout) — channel ছেড়ে দিই (auto leave)। */
export async function stopPresenceTracking(_uid: string): Promise<void> {
  myUid = null;
  if (channel) {
    try {
      await channel.untrack();
      await supabase.removeChannel(channel);
    } catch (err) {
      logger.warn('chatPresence.stop', String(err));
    }
    channel = null;
  }
}

/**
 * অন্য একজন (uid) online কিনা শোনে। Firebase listenToPresence এর সমতুল্য —
 * callback { online, lastSeen, label }। unsubscribe ফেরত।
 *
 * নতুন channel খুলি না (crash এড়াতে) — shared channel-এর state পড়ি ও
 * listeners-এ register করি। ChatScreen খোলা থাকলে presence track চালু
 * থাকে (login-এ startPresenceTracking হয়েছে), তাই channel আছে।
 */
export function listenToPresence(
  uid: string,
  callback: (info: { online: boolean; lastSeen: number; label: string }) => void,
): () => void {
  const ch = ensureChannel();

  const emit = () => {
    const state = ch.presenceState() as Record<string, Array<{ online_at?: number }>>;
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

  listeners.add(emit);
  emit(); // current state এখনই দিই

  return () => {
    listeners.delete(emit);
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
