/**
 * Rating Service
 *
 * Stores anonymous category-based ratings.
 * - raterId is saved server-side but NEVER returned to any UI query.
 * - Profile only shows aggregated percentages, never who rated whom.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase.config';

// ─── Category definitions ────────────────────────────────────────────────────
export const RATING_CATEGORIES = [
  { id: 'punctual',    label: 'On time',       emoji: '⏰' },
  { id: 'friendly',   label: 'Friendly',       emoji: '😊' },
  { id: 'tidy',       label: 'Clean & tidy',   emoji: '✨' },
  { id: 'respectful', label: 'Respectful',     emoji: '🤝' },
  { id: 'safeRide',   label: 'Safe ride',      emoji: '🛡️' },
] as const;

export type CategoryId = (typeof RATING_CATEGORIES)[number]['id'];

export interface RatingPayload {
  rideId: string;
  rateeId: string;     // person being rated
  raterId: string;     // kept private — never shown in UI
  stars: number;       // 1–5
  categories: CategoryId[];  // positive traits user selected
  comment?: string;    // optional free-text (max 200 chars)
}

export interface TrustBreakdown {
  totalRatings: number;
  avgStars: number;
  punctualPct: number;
  friendlyPct: number;
  tidyPct: number;
  respectfulPct: number;
  safeRidePct: number;
  trustScore: number;  // 0–100 weighted
}

// ─── Submit rating ────────────────────────────────────────────────────────────
export async function submitRating(payload: RatingPayload): Promise<void> {
  const batch = writeBatch(db);

  // ratings/{rideId}_{raterId} — raterId in doc id so one rating per person per ride
  const ratingRef = doc(db, 'ratings', `${payload.rideId}_${payload.raterId}`);
  const comment = payload.comment?.trim().slice(0, 200) ?? '';
  batch.set(ratingRef, {
    rideId:     payload.rideId,
    rateeId:    payload.rateeId,
    raterId:    payload.raterId,
    stars:      payload.stars,
    punctual:   payload.categories.includes('punctual'),
    friendly:   payload.categories.includes('friendly'),
    tidy:       payload.categories.includes('tidy'),
    respectful: payload.categories.includes('respectful'),
    safeRide:   payload.categories.includes('safeRide'),
    ...(comment && { comment }),
    createdAt:  serverTimestamp(),
  });

  // mark ride as rated by this rater
  const rideRef = doc(db, 'rides', payload.rideId);
  batch.update(rideRef, { [`rated_${payload.raterId}`]: true });

  await batch.commit();

  // recalculate and write trust breakdown
  await recalculateTrust(payload.rateeId);
}

// ─── Recalculate trust score for a user ──────────────────────────────────────
async function recalculateTrust(userId: string): Promise<void> {
  const snap = await getDocs(
    query(collection(db, 'ratings'), where('rateeId', '==', userId))
  );

  if (snap.empty) return;

  let totalStars = 0;
  let punctual = 0, friendly = 0, tidy = 0, respectful = 0, safeRide = 0;
  const count = snap.size;

  snap.forEach((d) => {
    const r = d.data();
    totalStars    += r.stars ?? 0;
    if (r.punctual)    punctual++;
    if (r.friendly)    friendly++;
    if (r.tidy)        tidy++;
    if (r.respectful)  respectful++;
    if (r.safeRide)    safeRide++;
  });

  const avgStars = totalStars / count;

  // Trust score formula:
  // 50% from star average (max 5 → 50 pts)
  // 50% from category average (avg of 5 category %)
  const starPoints = (avgStars / 5) * 50;
  const catAvg = ((punctual + friendly + tidy + respectful + safeRide) / (count * 5));
  const catPoints = catAvg * 50;
  const trustScore = Math.round(starPoints + catPoints);

  const breakdown: TrustBreakdown = {
    totalRatings:  count,
    avgStars:      Math.round(avgStars * 10) / 10,
    punctualPct:   Math.round((punctual    / count) * 100),
    friendlyPct:   Math.round((friendly    / count) * 100),
    tidyPct:       Math.round((tidy        / count) * 100),
    respectfulPct: Math.round((respectful  / count) * 100),
    safeRidePct:   Math.round((safeRide    / count) * 100),
    trustScore,
  };

  const userRef = doc(db, 'users', userId);
  const { updateDoc } = await import('firebase/firestore');
  await updateDoc(userRef, {
    trustScore:     breakdown.trustScore,
    rating:         breakdown.avgStars,
    totalRatings:   breakdown.totalRatings,
    trustBreakdown: breakdown,
  });
}

// ─── Get trust breakdown for profile display ─────────────────────────────────
export async function getTrustBreakdown(userId: string): Promise<TrustBreakdown | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  return (snap.data().trustBreakdown as TrustBreakdown) ?? null;
}

// ─── Check if current user already rated this ride ───────────────────────────
export async function hasRated(rideId: string, raterId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'ratings', `${rideId}_${raterId}`));
  return snap.exists();
}
