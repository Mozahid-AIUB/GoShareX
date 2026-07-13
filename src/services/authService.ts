// ============================================================
// Auth Service Router (middle layer)
//
// এই ফাইলটা সুইচ অনুযায়ী Firebase বা Supabase authService দেয়।
// সব screen এখন এখান থেকে authService নেবে:
//     import authService from '@/services/authService';
//
// ফলে backend বদলাতে শুধু featureFlags.USE_SUPABASE_AUTH টগল করলেই হয় —
// কোনো screen-এর কোড ছুঁতে হয় না।
// ============================================================
import { FEATURE_FLAGS } from '@/config/featureFlags';
import firebaseAuthService from '@/services/firebase/authService';
import supabaseAuthService from '@/services/supabase/authService';

const authService = FEATURE_FLAGS.USE_SUPABASE_AUTH
  ? supabaseAuthService
  : firebaseAuthService;

export default authService;
