import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
} from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_DATABASE_URL,
} = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  databaseURL: FIREBASE_DATABASE_URL,
};

const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

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

export { app, auth, db, realtimeDb, storage };
export default app;
