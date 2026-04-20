/**
 * penaltyService.ts
 * Manages cancellation strikes and account suspensions for RideShare AIUB.
 *
 * Rules:
 *   - 3 strikes within the rolling window → 24-hour suspension
 *   - Appeals are stored in Firestore for admin review
 */

import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  increment,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';

// ─── Constants ────────────────────────────────────────────────────────────────

export const STRIKE_LIMIT = 3;
export const SUSPENSION_HOURS = 24;

const USERS_COLLECTION = 'users';
const APPEALS_COLLECTION = 'appeals';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a cancellation strike for a user and apply a suspension if the
 * strike limit is reached.
 *
 * @returns Object containing current strike count and whether the user is now suspended.
 */
export async function addCancellationStrike(
  uid: string,
): Promise<{ strikes: number; suspended: boolean }> {
  const ref = doc(db, USERS_COLLECTION, uid);
  await updateDoc(ref, { strikes: increment(1) });

  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('User not found');

  const data = snap.data() as { strikes: number; isSuspended?: boolean };
  const strikes = data.strikes ?? 1;

  const suspended = await checkAndApplySuspension(uid, strikes);
  return { strikes, suspended };
}

/**
 * Check if a user has reached the strike limit and apply a suspension if so.
 *
 * @param uid     User id
 * @param strikes Current strike count (after increment)
 * @returns       `true` if the user was suspended by this call
 */
export async function checkAndApplySuspension(
  uid: string,
  strikes: number,
): Promise<boolean> {
  if (strikes < STRIKE_LIMIT) return false;

  const suspendedUntil = Date.now() + SUSPENSION_HOURS * 60 * 60 * 1000;
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    isSuspended: true,
    suspendedUntil,
    badge: 'Unreliable',
  });

  return true;
}

/**
 * Manually lift a suspension (admin action or after appeal approval).
 * Resets strikes to zero and clears the suspension flag.
 */
export async function liftSuspension(uid: string): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    isSuspended: false,
    suspendedUntil: null,
    strikes: 0,
  });
}

/**
 * Submit a suspension appeal for admin review.
 * Creates a document in the `appeals` collection.
 */
export async function submitAppeal(uid: string, reason: string): Promise<void> {
  const appealId = doc(collection(db, APPEALS_COLLECTION)).id;
  await setDoc(doc(db, APPEALS_COLLECTION, appealId), {
    appealId,
    uid,
    reason,
    status: 'pending',
    createdAt: Date.now(),
  });
}
