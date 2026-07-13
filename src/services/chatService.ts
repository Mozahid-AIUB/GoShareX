// ============================================================
// Chat Service Router (middle layer)
//
// authService router-এর মতোই — USE_SUPABASE_CHAT flag অনুযায়ী
// Firebase বা Supabase chat facade দেয়। দুটোর public API (১৯ method)
// এক, তাই chat screen-এর কোড বদলাতে হয় না।
//
// টাইপ (Chat, Message) Firebase থেকে re-export করি — screen-গুলো এগুলো
// import করে; টাইপ শুধু compile-time, runtime backend নির্বিশেষে এক।
// ============================================================
import { FEATURE_FLAGS } from '@/config/featureFlags';
import firebaseChatService from '@/services/firebase/chatService';
import supabaseChatService from '@/services/supabase/chat';

export type { Chat, Message, ChatMode } from '@/services/firebase/chatService';

const chatService = FEATURE_FLAGS.USE_SUPABASE_CHAT
  ? supabaseChatService
  : firebaseChatService;

export default chatService;
