// ============================================================
// Supabase connection setup
// এটা firebase.config.ts এর Supabase সংস্করণ।
// Firebase config পাশাপাশি থাকছে — কিছু সরানো হয়নি।
// ============================================================
import 'react-native-url-polyfill/auto'; // React Native-এ URL সাপোর্ট (Supabase-এর লাগে)
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Firebase-এর মতোই, key গুলো app.config.js -> extra থেকে আসবে (চ্যাটে না, .env-এ)
const extraConfig =
  (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined) ?? {};

const SUPABASE_URL = extraConfig.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = extraConfig.SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[supabase.config] Missing SUPABASE_URL / SUPABASE_ANON_KEY. Check your .env file.');
}

// ------------------------------------------------------------
// Session (login token) নিরাপদে রাখার জন্য SecureStore ব্যবহার।
// Supabase চায় getItem/setItem/removeItem — তাই ছোট একটা adapter।
// ------------------------------------------------------------
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,   // token মেয়াদ শেষ হলে নিজে নবায়ন করবে
    persistSession: true,     // অ্যাপ বন্ধ করলেও login মনে রাখবে
    detectSessionInUrl: false, // মোবাইলে দরকার নেই (এটা ওয়েবের জন্য)
  },
});
