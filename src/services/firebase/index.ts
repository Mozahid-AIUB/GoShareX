/**
 * services/firebase/index.ts
 * Single entry-point that re-exports the Firebase app instances
 * and every service function. Import from here to avoid relative path soup.
 */

// ─── Core Firebase instances ──────────────────────────────────────────────────
export { auth, db, rtdb, storage } from '@/services/firebase/config';

// ─── Generic Firestore helpers ────────────────────────────────────────────────
export {
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  queryDocs,
  subscribeDoc,
  subscribeDocs,
  serverTimestamp,
} from '@/services/firebase/firestore';
export type { QueryOptions } from '@/services/firebase/firestore';

// ─── Fare service ─────────────────────────────────────────────────────────────
export {
  getFareTable,
  getFare,
  calculateSplit,
  seedFareTable,
} from '@/services/firebase/fareService';

// ─── FCM / Messaging ──────────────────────────────────────────────────────────
export {
  getFCMToken,
  saveFCMToken,
  sendPushNotification,
  requestNotificationPermissions,
  getStoredFCMToken,
} from '@/services/firebase/messaging';

// ─── Board posts ──────────────────────────────────────────────────────────────
export {
  createPost,
  getPosts,
  joinPost,
  deletePost,
  subscribeToDestinationPosts,
} from '@/services/firebase/postService';
export type { PostData } from '@/services/firebase/postService';

// ─── Realtime Database ────────────────────────────────────────────────────────
export {
  writeActiveRider,
  removeActiveRider,
  getNearbyRiders,
  subscribeToActiveRiders,
  updateRiderLocation,
} from '@/services/firebase/realtimeDb';
export type { ActiveRiderData } from '@/services/firebase/realtimeDb';

// ─── Storage ──────────────────────────────────────────────────────────────────
export {
  uploadProfilePhoto,
  deleteProfilePhoto,
} from '@/services/firebase/storage';

// ─── User service ─────────────────────────────────────────────────────────────
export {
  getUser,
  updateUser,
  incrementRideCount,
  updateRating,
  addSavings,
  checkSuspension,
} from '@/services/firebase/userService';
export type { UserProfile } from '@/services/firebase/userService';
