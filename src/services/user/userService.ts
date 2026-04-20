/**
 * services/user/userService.ts
 * Business-logic layer for user profile operations.
 * Delegates persistence to services/firebase/userService.ts.
 */

import {
  getUser as fbGetUser,
  updateUser as fbUpdateUser,
  UserProfile,
} from '@/services/firebase/userService';
import { queryDocs } from '@/services/firebase/firestore';
import { Ride } from '@/types/ride.types';

export type { UserProfile };

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch a user profile. Throws if the user does not exist (unlike the
 * firebase layer which returns null) — use this in screens that require
 * a loaded user.
 */
export async function getUserProfile(uid: string): Promise<UserProfile> {
  const profile = await fbGetUser(uid);
  if (!profile) throw new Error(`User ${uid} not found`);
  return profile;
}

/**
 * Apply partial updates to a user profile. Validates critical fields
 * before writing.
 */
export async function updateProfile(
  uid: string,
  updates: Partial<UserProfile>,
): Promise<void> {
  // Guard against accidentally overwriting core identity fields
  const { uid: _uid, email: _email, createdAt: _createdAt, ...safeUpdates } = updates as any;
  await fbUpdateUser(uid, safeUpdates);
}

/**
 * Fetch a user's ride history, sorted newest first.
 *
 * @param uid    User id
 * @param limit  Max records to return (default: 20)
 */
export async function getRideHistory(
  uid: string,
  limit: number = 20,
): Promise<Ride[]> {
  // Each ride stores both participant UIDs; we need rides where the user
  // appears in either rider1 or rider2.
  // Firestore does not support OR queries across different fields in a single
  // query, so we run two parallel queries and merge-sort.
  const [asRider1, asRider2] = await Promise.all([
    queryDocs<Ride>('rides', {
      filters: [['rider1', '==', uid]],
      orderByField: 'confirmedAt',
      orderDirection: 'desc',
      limit,
    }),
    queryDocs<Ride>('rides', {
      filters: [['rider2', '==', uid]],
      orderByField: 'confirmedAt',
      orderDirection: 'desc',
      limit,
    }),
  ]);

  // Merge, deduplicate, sort and slice
  const merged = [...asRider1, ...asRider2];
  const seen = new Set<string>();
  const deduped = merged.filter((r) => {
    if (seen.has(r.rideId)) return false;
    seen.add(r.rideId);
    return true;
  });

  deduped.sort((a, b) => (b.confirmedAt ?? 0) - (a.confirmedAt ?? 0));
  return deduped.slice(0, limit);
}
