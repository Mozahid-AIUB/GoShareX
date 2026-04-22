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

const firebaseConfig = {
  apiKey: 'AIzaSyCb6OObgC57uJKq8s4u3uP06AhJBoJCMhQ',
  authDomain: 'rideshare-aiub.firebaseapp.com',
  projectId: 'rideshare-aiub',
  storageBucket: 'rideshare-aiub.firebasestorage.app',
  messagingSenderId: '612454425143',
  appId: '1:612454425143:android:c6ae709d57451c8c7115b2',
  databaseURL: 'https://rideshare-aiub-default-rtdb.asia-southeast1.firebasedatabase.app',
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
