/**
 * realtimeDb.ts — Firebase Realtime Database helpers for live rider presence.
 *
 * Schema:
 *   /active_riders/{uid}: ActiveRiderData
 */

import {
  ref,
  set,
  remove,
  onValue,
  off,
  get,
  update,
  DataSnapshot,
} from 'firebase/database';
import { rtdb } from '@/services/firebase/config';
import { ActiveRider } from '@/types/user.types';

const ROOT = 'active_riders';

export interface ActiveRiderData {
  uid: string;
  name: string;
  lat: number;
  lng: number;
  destination: string;
  pickupPoint: string;
  status: 'waiting' | 'matched' | 'riding';
  rating: number;
  badge: string;
  photoURL?: string;
  timestamp: number;
}

// ─── Haversine distance helper ────────────────────────────────────────────────

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Write or overwrite an active rider entry.
 * Call this when a user enters the "looking for ride" state.
 */
export async function writeActiveRider(
  uid: string,
  data: ActiveRiderData,
): Promise<void> {
  await set(ref(rtdb, `${ROOT}/${uid}`), {
    ...data,
    timestamp: Date.now(),
  });
}

/**
 * Remove a rider from the active riders map.
 * Call on logout, ride completion, or app backgrounding.
 */
export async function removeActiveRider(uid: string): Promise<void> {
  await remove(ref(rtdb, `${ROOT}/${uid}`));
}

/**
 * One-time read of all active riders within `radiusMeters` of a coordinate.
 * Bounding-box pre-filter is not applied here (RTDB has no geo queries);
 * use Firestore GeoHash for larger datasets.
 */
export async function getNearbyRiders(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<ActiveRider[]> {
  const snap: DataSnapshot = await get(ref(rtdb, ROOT));
  if (!snap.exists()) return [];

  const result: ActiveRider[] = [];
  snap.forEach((child) => {
    const rider = child.val() as ActiveRiderData;
    const dist = haversineMeters(lat, lng, rider.lat, rider.lng);
    if (dist <= radiusMeters) {
      result.push({ ...rider } as ActiveRider);
    }
  });

  return result;
}

/**
 * Real-time subscription to the entire active riders map.
 * Returns an unsubscribe function.
 */
export function subscribeToActiveRiders(
  callback: (riders: ActiveRider[]) => void,
): () => void {
  const dbRef = ref(rtdb, ROOT);

  const handler = (snap: DataSnapshot) => {
    const riders: ActiveRider[] = [];
    snap.forEach((child) => {
      riders.push(child.val() as ActiveRider);
    });
    callback(riders);
  };

  onValue(dbRef, handler);
  return () => off(dbRef, 'value', handler);
}

/**
 * Update only the lat/lng of an active rider (lightweight heartbeat).
 */
export async function updateRiderLocation(
  uid: string,
  lat: number,
  lng: number,
): Promise<void> {
  await update(ref(rtdb, `${ROOT}/${uid}`), {
    lat,
    lng,
    timestamp: Date.now(),
  });
}
