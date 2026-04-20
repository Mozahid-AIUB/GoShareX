/**
 * services/firebase/config.ts
 * Re-exports Firebase instances from the single initialisation point.
 * Do NOT initialise Firebase here — use src/config/firebase.config.ts.
 */

export { app, auth, db, realtimeDb as rtdb, storage } from '@/config/firebase.config';
export { realtimeDb } from '@/config/firebase.config';
export { default } from '@/config/firebase.config';