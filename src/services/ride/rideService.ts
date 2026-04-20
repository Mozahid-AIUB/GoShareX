/**
 * ride/rideService.ts
 * Firestore CRUD + real-time subscription for rides.
 *
 * Collection: `rides`
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Ride, RideStatus } from '@/types/ride.types';
import { incrementRideCount, addSavings } from '@/services/firebase/userService';
import { addCancellationStrike } from '@/services/user/penaltyService';
import { trackRideComplete } from '@/services/analytics/analyticsService';

const COLLECTION = 'rides';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new ride document in Firestore.
 * Returns the generated ride id.
 */
export async function createRide(
  rider1: string,
  rider2: string,
  destination: string,
  pickup: string,
  fare: number,
): Promise<string> {
  const rideId = doc(collection(db, COLLECTION)).id;
  const splitAmount = Math.ceil(fare / 2);

  const ride: Ride = {
    rideId,
    rider1,
    rider2,
    destination,
    pickupPoint: pickup,
    fare,
    splitAmount,
    status: 'pending',
    confirmedAt: Date.now(),
  };

  await setDoc(doc(db, COLLECTION, rideId), ride);
  return rideId;
}

/**
 * Update the status of a ride. Validates allowed state transitions.
 */
export async function updateRideStatus(
  rideId: string,
  status: RideStatus,
): Promise<void> {
  const now = Date.now();
  const updates: Partial<Ride> & Record<string, any> = { status };

  switch (status) {
    case 'confirmed':
      updates.confirmedAt = now;
      break;
    case 'started':
      updates.startedAt = now;
      break;
    case 'completed':
      updates.completedAt = now;
      break;
    case 'cancelled':
      updates.cancelledAt = now;
      break;
  }

  await updateDoc(doc(db, COLLECTION, rideId), updates);
}

/**
 * Fetch a single ride by id. Returns `null` if not found.
 */
export async function getRide(rideId: string): Promise<Ride | null> {
  const snap = await getDoc(doc(db, COLLECTION, rideId));
  if (!snap.exists()) return null;
  return { rideId: snap.id, ...snap.data() } as Ride;
}

/**
 * Cancel a ride and record a cancellation strike for the canceller.
 */
export async function cancelRide(
  rideId: string,
  cancelledBy: string,
  reason?: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, rideId), {
    status: 'cancelled' as RideStatus,
    cancelledAt: Date.now(),
    cancelledBy,
    cancelReason: reason ?? 'No reason provided',
  });

  // Apply a strike to the user who cancelled
  await addCancellationStrike(cancelledBy);
}

/**
 * Mark a ride as completed and apply ride count / savings updates for both riders.
 */
export async function completeRide(rideId: string): Promise<void> {
  const ride = await getRide(rideId);
  if (!ride) throw new Error(`Ride ${rideId} not found`);

  await updateDoc(doc(db, COLLECTION, rideId), {
    status: 'completed' as RideStatus,
    completedAt: Date.now(),
  });

  // Reward both riders
  const savings = ride.fare - ride.splitAmount;
  await Promise.all([
    incrementRideCount(ride.rider1),
    incrementRideCount(ride.rider2),
    addSavings(ride.rider1, savings),
    addSavings(ride.rider2, savings),
  ]);

  // Analytics
  trackRideComplete(rideId, ride.fare, savings);
}

/**
 * Real-time listener for a ride document.
 * Returns an unsubscribe function.
 */
export function subscribeToRide(
  rideId: string,
  callback: (ride: Ride) => void,
): () => void {
  const ref = doc(db, COLLECTION, rideId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback({ rideId: snap.id, ...snap.data() } as Ride);
    }
  });
}
