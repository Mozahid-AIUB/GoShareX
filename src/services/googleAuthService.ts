// ============================================================
// Google Auth Service Router (middle layer)
// authService.ts router-এর মতোই — feature flag অনুযায়ী
// Firebase বা Supabase Google service দেয়।
// সব screen এখান থেকে নেবে:
//     import googleAuthService from '@/services/googleAuthService';
// ============================================================
import { FEATURE_FLAGS } from '@/config/featureFlags';
import firebaseGoogleAuth from '@/services/firebase/googleAuthService';
import supabaseGoogleAuth from '@/services/supabase/googleAuthService';

const googleAuthService = FEATURE_FLAGS.USE_SUPABASE_AUTH
  ? supabaseGoogleAuth
  : firebaseGoogleAuth;

export default googleAuthService;
