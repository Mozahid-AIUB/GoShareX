/**
 * firebase/userService.ts
 * Firestore CRUD for user profiles stored in the `users` collection.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { User, UserBadge } from '@/types/user.types';

const COLLECTION = 'users';

// ─── Badge computation ────────────────────────────────────────────────────────

function computeBadge(totalRides: number, rating: number, strikes: number): UserBadge {
  if (strikes >= 3) return 'Unreliable' as UserBadge;
  if (totalRides >= 50 && rating >= 4.5) return 'Elite Rider';
  if (totalRides >= 20 && rating >= 4.0) return 'Trusted';
  if (totalRides >= 5) return 'Regular';
  return 'New Rider';
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type UserProfile = User;

/**
 * Fetch a user profile by UID. Returns `null` if not found.
 */
export async function getUser(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, COLLECTION, uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as UserProfile;
}

/**
 * Create or merge updates into a user document.
 */
export async function updateUser(
  uid: string,
  data: Partial<UserProfile>,
): Promise<void> {
  const ref = doc(db, COLLECTION, uid);
  await updateDoc(ref, { ...data, lastActive: Date.now() });
}

/**
 * Atomically increment the user's `totalRides` counter.
 */
export async function incrementRideCount(uid: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, uid), {
    totalRides: increment(1),
    lastActive: Date.now(),
  });
}

/**
 * Recalculate and persist the user's average rating.
 * Uses the weighted average formula:
 *   newAvg = (currentRating * totalRides + newStars) / (totalRides + 1)
 *
 * @param uid        User id
 * @param newRating  The new star value (1–5)
 * @param totalRides Current ride count (before the increment)
 */
export async function updateRating(
  uid: string,
  newRating: number,
  totalRides: number,
): Promise<void> {
  const ref = doc(db, COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('User not found');

  const profile = snap.data() as UserProfile;
  const updatedRides = totalRides + 1;
  const updatedRating =
    (profile.rating * totalRides + newRating) / updatedRides;
  const badge = computeBadge(updatedRides, updatedRating, profile.strikes ?? 0);

  await updateDoc(ref, {
    rating: parseFloat(updatedRating.toFixed(2)),
    totalRides: updatedRides,
    badge,
    lastActive: Date.now(),
  });
}

/**
 * Atomically add `amount` (BDT) to the user's `totalSaved` field.
 */
export async function addSavings(uid: string, amount: number): Promise<void> {
  await updateDoc(doc(db, COLLECTION, uid), {
    totalSaved: increment(amount),
    lastActive: Date.now(),
  });
}

/**
 * Check whether a user is currently suspended.
 * Also auto-lifts expired suspensions.
 */
export async function checkSuspension(
  uid: string,
): Promise<{ suspended: boolean; expiresAt?: number }> {
  const snap = await getDoc(doc(db, COLLECTION, uid));
  if (!snap.exists()) return { suspended: false };

  const profile = snap.data() as UserProfile;
  if (!profile.isSuspended) return { suspended: false };

  const now = Date.now();
  if (profile.suspendedUntil && profile.suspendedUntil <= now) {
    // Auto-lift expired suspension
    await updateDoc(doc(db, COLLECTION, uid), {
      isSuspended: false,
      suspendedUntil: null,
      strikes: 0,
    });
    return { suspended: false };
  }

  return { suspended: true, expiresAt: profile.suspendedUntil };
}
