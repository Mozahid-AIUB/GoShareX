import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from './env';

const firebaseConfig = {
  apiKey: ENV.firebaseApiKey,
  authDomain: ENV.firebaseAuthDomain,
  projectId: ENV.firebaseProjectId,
  storageBucket: ENV.firebaseStorageBucket,
  messagingSenderId: ENV.firebaseMessagingSenderId,
  appId: ENV.firebaseAppId,
  databaseURL: `https://${ENV.firebaseProjectId}-default-rtdb.firebaseio.com`,
};

const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// ONE call to initializeAuth, guarded so it never runs twice
const auth: Auth = (() => {
  const existing = getApps();
  // If the app instance was just created (only 1 app and it's brand new),
  // initialize auth with persistence. Otherwise retrieve the already-registered auth.
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e: any) {
    // "auth/already-initialized" — return what's already there via modular API
    const { getAuth } = require('firebase/auth');
    return getAuth(app);
  }
})();

const db: Firestore = getFirestore(app);
const realtimeDb: Database = getDatabase(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, realtimeDb, storage };
export default app;