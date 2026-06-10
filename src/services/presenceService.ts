// ============================================================
// Presence Service Router (chat online/offline status)
//
// USE_SUPABASE_CHAT flag অনুযায়ী Supabase Realtime Presence বা Firebase
// RTDB presence দেয়। ChatScreen + auth (login/logout) এখান থেকে নেবে,
// যাতে সরাসরি firebase/presenceService না ডাকে।
// ============================================================
import { FEATURE_FLAGS } from '@/config/featureFlags';
import * as fb from '@/services/firebase/presenceService';
import * as sb from '@/services/supabase/chatPresenceService';

const impl = FEATURE_FLAGS.USE_SUPABASE_CHAT ? sb : fb;

export const startPresenceTracking = impl.startPresenceTracking;
export const stopPresenceTracking = impl.stopPresenceTracking;
export const listenToPresence = impl.listenToPresence;
