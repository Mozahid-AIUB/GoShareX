import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth/cordova';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyB6Xce4UW1l1rTcoU8VINQlRgF3Wd5pV5M',
  authDomain: 'rideshare-aiub.firebaseapp.com',
  projectId: 'rideshare-aiub',
  storageBucket: 'rideshare-aiub.firebasestorage.app',
  messagingSenderId: '612454425143',
  appId: '1:612454425143:web:b9f88eba7614aecc7115b2',
  databaseURL: 'https://rideshare-aiub-default-rtdb.asia-southeast1.firebasedatabase.app',
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
