import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
  setLogLevel as setFirestoreLogLevel,
} from 'firebase/firestore';

// অ্যাপ এখন মূলত Supabase-এ; Firebase Firestore-এর internal connectivity
// error ("Could not reach Cloud Firestore backend" ইত্যাদি) console.error
// দিয়ে আসে → dev-এ পুরো screen লাল LogBox — user-unfriendly আর অপ্রয়োজনীয়।
// SDK-র নিজের logging বন্ধ করি; আমাদের নিজস্ব try/catch + logger যথেষ্ট।
setFirestoreLogLevel('silent');
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const extraConfig =
  (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined) ??
  ((Constants as any).manifest?.extra as Record<string, string | undefined> | undefined) ??
  ((Constants as any).manifest2?.extra as Record<string, string | undefined> | undefined) ??
  {};

const {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_DATABASE_URL,
} = extraConfig;

if (!FIREBASE_API_KEY || !FIREBASE_AUTH_DOMAIN || !FIREBASE_PROJECT_ID) {
  console.error('[firebase.config] Missing required Firebase env vars. Check your .env file.');
}

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY ?? '',
  authDomain: FIREBASE_AUTH_DOMAIN ?? '',
  projectId: FIREBASE_PROJECT_ID ?? '',
  storageBucket: FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: FIREBASE_APP_ID ?? '',
  databaseURL: FIREBASE_DATABASE_URL ?? '',
};

const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// The installed Firebase version in this repo does not expose the RN
// persistence helper as a typed ESM export, so we access it from the
// underlying auth package to keep React Native persistence working.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const firebaseAuthModule = require('@firebase/auth') as {
  initializeAuth?: (firebaseApp: FirebaseApp, deps?: Record<string, unknown>) => Auth;
  getReactNativePersistence?: (storage: typeof AsyncStorage) => unknown;
  getAuth: (firebaseApp?: FirebaseApp) => Auth;
};

const auth: Auth = (() => {
  try {
    if (
      firebaseAuthModule.initializeAuth &&
      firebaseAuthModule.getReactNativePersistence
    ) {
      return firebaseAuthModule.initializeAuth(app, {
        persistence: firebaseAuthModule.getReactNativePersistence(AsyncStorage) as any,
      });
    }

    if (firebaseAuthModule.initializeAuth) {
      return firebaseAuthModule.initializeAuth(app);
    }
  } catch {
    // If auth was already initialized, Firebase will throw and getAuth will return the existing instance.
  }

  return firebaseAuthModule.getAuth(app);
})();

// Firestore must also be initialized only once on React Native.
const db: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      experimentalForceLongPolling: true,
    } as any);
  } catch {
    return getFirestore(app);
  }
})();

const realtimeDb: Database = getDatabase(app);
const storage: FirebaseStorage = getStorage(app);
const functions: Functions = getFunctions(app);

export { app, auth, db, realtimeDb, storage, functions };
export default app;
