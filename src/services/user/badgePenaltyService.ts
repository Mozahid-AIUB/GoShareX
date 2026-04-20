import { doc, getDoc, updateDoc, increment, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { COLLECTIONS as FIREBASE_COLLECTIONS } from '@/constants/firebaseKeys';

const STRIKE_LIMIT = 3;
const SUSPENSION_HOURS = 24;

export type BadgeType = 'NEW_RIDER' | 'REGULAR' | 'TRUSTED' | 'ELITE';

export function getBadgeForStats(totalRides: number, rating: number): BadgeType {
  if (totalRides >= 50 && rating >= 4.5) return 'ELITE';
  if (totalRides >= 21) return 'TRUSTED';
  if (totalRides >= 6) return 'REGULAR';
  return 'NEW_RIDER';
}

export async function addCancellationStrike(
  uid: string
): Promise<{ strikes: number; suspended: boolean }> {
  const userRef = doc(db, FIREBASE_COLLECTIONS.USERS, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User not found');

  const currentStrikes: number = snap.data().strikes ?? 0;
  const newStrikes = currentStrikes + 1;

  const updateData: Record<string, unknown> = { strikes: newStrikes };

  let suspended = false;
  if (newStrikes >= STRIKE_LIMIT) {
    const expiresAt = Date.now() + SUSPENSION_HOURS * 60 * 60 * 1000;
    updateData.isSuspended = true;
    updateData.suspensionExpiresAt = expiresAt;
    updateData.suspensionReason = `${newStrikes} confirmed rides cancelled`;
    suspended = true;
  }

  await updateDoc(userRef, updateData);
  return { strikes: newStrikes, suspended };
}

export async function checkAndLiftExpiredSuspension(uid: string): Promise<boolean> {
  const userRef = doc(db, FIREBASE_COLLECTIONS.USERS, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return false;

  const data = snap.data();
  if (!data.isSuspended) return false;

  const expiresAt: number = data.suspensionExpiresAt ?? 0;
  if (Date.now() > expiresAt) {
    await updateDoc(userRef, {
      isSuspended: false,
      suspensionExpiresAt: null,
      strikes: 0,
    });
    return false;
  }

  return true;
}

export async function updateBadge(uid: string, totalRides: number, rating: number): Promise<void> {
  const badge = getBadgeForStats(totalRides, rating);
  const userRef = doc(db, FIREBASE_COLLECTIONS.USERS, uid);
  await updateDoc(userRef, { badge });
}

export async function submitAppeal(uid: string, reason: string): Promise<void> {
  await addDoc(collection(db, 'appeals'), {
    uid,
    reason,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

const badgePenaltyService = {
  addCancellationStrike,
  checkAndLiftExpiredSuspension,
  updateBadge,
  submitAppeal,
  getBadgeForStats,
};

export default badgePenaltyService;
