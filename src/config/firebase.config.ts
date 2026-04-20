import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';
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

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const realtimeDb: Database = getDatabase(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, realtimeDb, storage };
export default app;