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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { User, UserBadge } from '@/types/auth.types';

const COLLECTION = 'users';

function isRecoverableFirestoreError(error: any): boolean {
  const normalizedCode = String(error?.code ?? '').toLowerCase();
  const normalizedMessage = String(error?.message ?? '').toLowerCase();

  return (
    normalizedCode.includes('unavailable') ||
    normalizedCode.includes('deadline-exceeded') ||
    normalizedCode.includes('failed-precondition') ||
    normalizedCode.includes('network-request-failed') ||
    normalizedMessage.includes('offline') ||
    normalizedMessage.includes('network') ||
    normalizedMessage.includes('client is offline') ||
    normalizedMessage.includes('server connection is unstable')
  );
}

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
export interface UserProfileInput {
  email: string;
  name: string;
  studentId: string;
  department?: string;
  phoneNumber?: string;
  photoURL?: string;
}

function normalizeProfile(uid: string, data: Partial<UserProfile>): UserProfile {
  return {
    uid,
    email: data.email ?? '',
    name: data.name ?? 'AIUB Student',
    studentId: data.studentId ?? '',
    department: data.department ?? '',
    phoneNumber: data.phoneNumber ?? '',
    photoURL: data.photoURL,
    rating: data.rating ?? 5,
    totalRides: data.totalRides ?? 0,
    totalSaved: data.totalSaved ?? 0,
    completionRate: data.completionRate ?? 100,
    badge: data.badge ?? 'New Rider',
    strikes: data.strikes ?? 0,
    isSuspended: data.isSuspended ?? false,
    suspendedUntil: data.suspendedUntil,
    createdAt: data.createdAt ?? new Date().toISOString(),
    lastActive: data.lastActive,
  };
}

/**
 * Fetch a user profile by UID. Returns `null` if not found.
 */
export async function getUser(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    if (!snap.exists()) return null;
    return normalizeProfile(snap.id, snap.data() as Partial<UserProfile>);
  } catch (error) {
    if (isRecoverableFirestoreError(error)) {
      return null;
    }

    throw error;
  }
}

export async function createUser(uid: string, data: UserProfileInput): Promise<UserProfile> {
  const profile = normalizeProfile(uid, {
    ...data,
    email: data.email.trim().toLowerCase(),
    name: data.name.trim(),
    studentId: data.studentId.trim(),
  });

  await setDoc(doc(db, COLLECTION, uid), {
    ...profile,
    lastActive: Date.now(),
    createdAt: profile.createdAt,
    updatedAt: serverTimestamp(),
  });

  return profile;
}

export async function ensureUserProfile(
  uid: string,
  fallback: Partial<UserProfileInput> & { email: string },
): Promise<UserProfile> {
  const existing = await getUser(uid);
  if (existing) return existing;

  return createUser(uid, {
    email: fallback.email,
    name: fallback.name ?? fallback.email.split('@')[0] ?? 'AIUB Student',
    studentId: fallback.studentId ?? '',
    department: fallback.department ?? '',
    phoneNumber: fallback.phoneNumber ?? '',
    photoURL: fallback.photoURL,
  });
}

/**
 * Create or merge updates into a user document.
 */
export async function updateUser(
  uid: string,
  data: Partial<UserProfile>,
): Promise<UserProfile> {
  const ref = doc(db, COLLECTION, uid);
  await updateDoc(ref, {
    ...data,
    lastActive: Date.now(),
    updatedAt: serverTimestamp(),
  });

  const updated = await getUser(uid);
  if (!updated) throw new Error('Updated user profile could not be loaded');
  return updated;
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
