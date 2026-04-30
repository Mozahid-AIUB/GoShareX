/**
 * badgeService.ts — Badge calculation and penalty tracking
 *
 * Manages user badges based on ride count and tracks cancellations
 * to apply suspensions after 3 confirmed cancels.
 */

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import type { UserBadge } from '@/types/auth.types';

const SUSPENSION_THRESHOLD_STRIKES = 3;
const SUSPENSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Calculate badge tier based on ride count
 */
export function calculateBadge(totalRides: number): UserBadge {
    if (totalRides >= 50) return 'Elite Rider';
    if (totalRides >= 21) return 'Trusted';
    if (totalRides >= 6) return 'Regular';
    return 'New Rider';
}

/**
 * Automatically update user's badge based on ride count
 */
export async function updateUserBadge(uid: string, totalRides: number): Promise<void> {
    const newBadge = calculateBadge(totalRides);
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { badge: newBadge });
}

/**
 * Record a confirmed ride cancellation and check for suspension
 */
export async function recordCancellation(uid: string): Promise<boolean> {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
        throw new Error('User not found');
    }

    const user = snap.data();
    const currentStrikes = (user.strikes ?? 0) + 1;

    if (currentStrikes >= SUSPENSION_THRESHOLD_STRIKES) {
        const suspendedUntil = Date.now() + SUSPENSION_DURATION_MS;
        await updateDoc(userRef, {
            strikes: currentStrikes,
            isSuspended: true,
            suspendedUntil,
            suspensionReason: `Account suspended after ${currentStrikes} ride cancellations. Suspension until ${new Date(suspendedUntil).toLocaleString()}`,
        });
        return true; // Suspended
    } else {
        await updateDoc(userRef, { strikes: currentStrikes });
        return false; // Not suspended, but strike added
    }
}

/**
 * Check if a user is currently suspended and clear if expired
 */
export async function checkSuspension(uid: string): Promise<{ suspended: boolean; reason?: string }> {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
        return { suspended: false };
    }

    const user = snap.data();
    const { isSuspended, suspendedUntil, suspensionReason } = user;

    if (!isSuspended || !suspendedUntil) {
        return { suspended: false };
    }

    const now = Date.now();
    if (now >= suspendedUntil) {
        // Suspension has expired, clear it
        await updateDoc(userRef, {
            isSuspended: false,
            suspendedUntil: null,
            suspensionReason: null,
        });
        return { suspended: false };
    }

    // User is still suspended
    return { suspended: true, reason: suspensionReason };
}

/**
 * Clear strikes when a user completes rides without cancellation
 * (optional: every 5 successful rides, reduce strikes by 1)
 */
export async function reducePenalty(uid: string): Promise<void> {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) return;

    const user = snap.data();
    const currentStrikes = user.strikes ?? 0;

    // Reduce strikes by 1 every X completed rides (optional)
    if (currentStrikes > 0) {
        await updateDoc(userRef, { strikes: Math.max(0, currentStrikes - 1) });
    }
}

/**
 * Manually clear all penalties (admin only)
 */
export async function clearAllPenalties(uid: string): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        strikes: 0,
        isSuspended: false,
        suspendedUntil: null,
        suspensionReason: null,
    });
}
