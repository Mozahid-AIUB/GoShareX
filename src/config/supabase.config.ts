// ============================================================
// Supabase connection setup
// এটা firebase.config.ts এর Supabase সংস্করণ।
// Firebase config পাশাপাশি থাকছে — কিছু সরানো হয়নি।
// ============================================================
import 'react-native-url-polyfill/auto'; // React Native-এ URL সাপোর্ট (Supabase-এর লাগে)
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

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
//
// সমস্যা: Supabase-এর token ২০৪৮ bytes-এর বেশি হতে পারে, কিন্তু
// SecureStore-এর এক value-র সীমা ২০৪৮। তাই বড় হলে token-কে ছোট
// টুকরোয় (chunk) ভাগ করে রাখি, পড়ার সময় আবার জোড়া লাগাই।
// ------------------------------------------------------------
const CHUNK_SIZE = 2000; // 2048-এর নিচে নিরাপদ মার্জিন

// web-এ expo-secure-store সাপোর্ট করে না (native-only hardware-backed
// storage) — getValueWithKeyAsync missing থাকায় সরাসরি crash করত। web-এ
// browser-এর localStorage ব্যবহার করি (dev-preview-এর জন্য যথেষ্ট);
// Android/iOS-এ আগের SecureStore + chunk logic অপরিবর্তিত।
const isWeb = Platform.OS === 'web';

const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWeb) return window.localStorage.getItem(key);
    // আগে দেখি কয় টুকরোয় রাখা আছে
    const meta = await SecureStore.getItemAsync(`${key}__chunks`);
    if (meta) {
      const count = parseInt(meta, 10);
      let value = '';
      for (let i = 0; i < count; i++) {
        const part = await SecureStore.getItemAsync(`${key}__${i}`);
        if (part == null) return null; // কোনো টুকরো হারালে — অকেজো
        value += part;
      }
      return value;
    }
    // টুকরো না থাকলে — সাধারণ value
    return SecureStore.getItemAsync(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (isWeb) { window.localStorage.setItem(key, value); return; }
    // পুরনো যা ছিল আগে মুছি (পরিষ্কার শুরু)
    await SecureStoreAdapter.removeItem(key);

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    // বড় হলে টুকরো করে রাখি
    const count = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < count; i++) {
      const part = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}__${i}`, part);
    }
    await SecureStore.setItemAsync(`${key}__chunks`, String(count));
  },

  removeItem: async (key: string): Promise<void> => {
    if (isWeb) { window.localStorage.removeItem(key); return; }
    const meta = await SecureStore.getItemAsync(`${key}__chunks`);
    if (meta) {
      const count = parseInt(meta, 10);
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}__${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}__chunks`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,   // token মেয়াদ শেষ হলে নিজে নবায়ন করবে
    persistSession: true,     // অ্যাপ বন্ধ করলেও login মনে রাখবে
    detectSessionInUrl: false, // মোবাইলে দরকার নেই (এটা ওয়েবের জন্য)
  },
});
