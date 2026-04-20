/**
 * Firebase Configuration
 * Production-ready Firebase setup with error handling
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';
import ENV from './env';

const firebaseConfig = {
  apiKey: ENV.firebaseApiKey,
  authDomain: ENV.firebaseAuthDomain,
  projectId: ENV.firebaseProjectId,
  storageBucket: ENV.firebaseStorageBucket,
  messagingSenderId: ENV.firebaseMessagingSenderId,
  appId: ENV.firebaseAppId,
  measurementId: ENV.firebaseMeasurementId,
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let realtimeDb: Database;
let storage: FirebaseStorage;
let messaging: Messaging | null = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  realtimeDb = getDatabase(app);
  storage = getStorage(app);
  
  // Messaging is only supported in web contexts
  isSupported().then(supported => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });

  if (__DEV__) {
    console.log('✅ Firebase initialized successfully');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw new Error('Failed to initialize Firebase');
}

export { app, auth, db, realtimeDb, storage, messaging };
export default app;
