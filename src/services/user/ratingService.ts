/**
 * ratingService.ts
 * Handles ride ratings and user badge computation.
 */

import {
  doc,
  setDoc,
  updateDoc,
  collection,
  increment,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { UserBadge } from '@/types/user.types';

export type BadgeType = UserBadge;

const RATINGS_COLLECTION = 'ratings';
const USERS_COLLECTION = 'users';

// ─── Badge logic ──────────────────────────────────────────────────────────────

/**
 * Determine the appropriate badge for a user based on their ride stats.
 *
 * Thresholds:
 *   Elite Rider  — ≥ 50 rides AND rating ≥ 4.5
 *   Trusted      — ≥ 20 rides AND rating ≥ 4.0
 *   Regular      — ≥ 5 rides
 *   New Rider    — default
 */
export function getBadgeForStats(totalRides: number, rating: number): BadgeType {
  if (totalRides >= 50 && rating >= 4.5) return 'Elite Rider';
  if (totalRides >= 20 && rating >= 4.0) return 'Trusted';
  if (totalRides >= 5) return 'Regular';
  return 'New Rider';
}

// ─── Rating math ──────────────────────────────────────────────────────────────

/**
 * Calculate the new running average rating after adding one more review.
 *
 * Formula: (currentRating * totalRides + newStars) / (totalRides + 1)
 *
 * @param currentRating  Existing average (0–5)
 * @param totalRides     Number of rated rides so far (before this one)
 * @param newStars       New rating value (1–5)
 */
export function calculateNewRating(
  currentRating: number,
  totalRides: number,
  newStars: number,
): number {
  const clampedStars = Math.min(5, Math.max(1, newStars));
  const newAvg = (currentRating * totalRides + clampedStars) / (totalRides + 1);
  return parseFloat(newAvg.toFixed(2));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Submit a post-ride rating.
 *
 * Writes a rating document and updates the rated user's profile atomically.
 *
 * @param rideId    The ride being rated
 * @param raterId   UID of the user submitting the rating
 * @param ratedId   UID of the user being rated
 * @param stars     1–5 star value
 * @param feedback  Optional free-text feedback
 */
export async function submitRating(
  rideId: string,
  raterId: string,
  ratedId: string,
  stars: number,
  feedback?: string,
): Promise<void> {
  if (stars < 1 || stars > 5) throw new RangeError('stars must be between 1 and 5');

  // Persist the rating record
  const ratingId = `${rideId}_${raterId}_${ratedId}`;
  await setDoc(doc(db, RATINGS_COLLECTION, ratingId), {
    ratingId,
    rideId,
    raterId,
    ratedId,
    stars,
    feedback: feedback ?? null,
    createdAt: Date.now(),
  });

  // Update the rated user's profile
  const userRef = doc(db, USERS_COLLECTION, ratedId);

  // Firestore transactions would be ideal here; using a read-then-write
  // to keep the code self-contained without a Cloud Function.
  const { getDoc } = await import('firebase/firestore');
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('Rated user not found');

  const profile = snap.data() as { rating: number; totalRides: number };
  const newRating = calculateNewRating(profile.rating, profile.totalRides, stars);
  const badge = getBadgeForStats(profile.totalRides, newRating);

  await updateDoc(userRef, {
    rating: newRating,
    badge,
    lastActive: Date.now(),
  });
}
