import { collection, doc, addDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, set, remove } from 'firebase/database';
import { db, realtimeDb } from '@/config/firebase.config';
import { incrementRideCount, addSavings } from '@/services/firebase/userService';
import type { RideRoutePreview } from '@/types/ride.types';

export type RideStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';

export interface Ride {
  id: string;
  rider1: string;
  rider2: string;
  rider1Name: string;
  rider2Name: string;
  destination: string;
  pickupPoint: string;
  fare: number;
  splitAmount: number;
  status: RideStatus;
  routePreview?: RideRoutePreview;
  confirmedAt?: number;
  startedAt?: number;
  completedAt?: number;
  rider1Rating?: number;
  rider2Rating?: number;
  cancelledAt?: number;
  cancelledBy?: string;
  cancelReason?: string;
}

class RideService {
  async createRide(
    rider1Id: string, rider1Name: string,
    rider2Id: string, rider2Name: string,
    destination: string, pickupPoint: string,
    fare: number,
    routePreview?: RideRoutePreview,
  ): Promise<string> {
    const rideDoc = await addDoc(collection(db, 'rides'), {
      rider1: rider1Id, rider1Name,
      rider2: rider2Id, rider2Name,
      destination, pickupPoint,
      fare,
      splitAmount: routePreview?.splitFare ?? Math.ceil(fare / 2),
      routePreview: routePreview ?? null,
      status: 'confirmed',
      confirmedAt: Date.now(),
      createdAt: serverTimestamp(),
    });
    return rideDoc.id;
  }

  async startRide(rideId: string): Promise<void> {
    const ride = await this.getRide(rideId);
    if (!ride) throw new Error('Ride not found');

    await updateDoc(doc(db, 'rides', rideId), { status: 'active', startedAt: Date.now() });
    await set(ref(realtimeDb, `active_riders/${ride.rider1}/status`), 'in_ride');
    await set(ref(realtimeDb, `active_riders/${ride.rider2}/status`), 'in_ride');
  }

  async completeRide(rideId: string): Promise<void> {
    const rideRef = doc(db, 'rides', rideId);
    const rideSnap = await getDoc(rideRef);
    if (!rideSnap.exists()) throw new Error('Ride not found');
    const ride = rideSnap.data() as Ride;

    await updateDoc(rideRef, { status: 'completed', completedAt: Date.now() });

    await remove(ref(realtimeDb, `active_riders/${ride.rider1}`));
    await remove(ref(realtimeDb, `active_riders/${ride.rider2}`));

    const savings = ride.fare - ride.splitAmount;
    await Promise.all([
      incrementRideCount(ride.rider1),
      incrementRideCount(ride.rider2),
      addSavings(ride.rider1, savings),
      addSavings(ride.rider2, savings),
    ]);
  }

  async cancelRide(rideId: string, userId: string, reason = 'Cancelled by user'): Promise<void> {
    const ride = await this.getRide(rideId);
    if (!ride) throw new Error('Ride not found');

    await updateDoc(doc(db, 'rides', rideId), {
      status: 'cancelled',
      cancelledAt: Date.now(),
      cancelledBy: userId,
      cancelReason: reason,
    });

    await remove(ref(realtimeDb, `active_riders/${ride.rider1}`));
    await remove(ref(realtimeDb, `active_riders/${ride.rider2}`));
  }

  async submitRating(rideId: string, raterId: string, rating: number): Promise<void> {
    const rideRef = doc(db, 'rides', rideId);
    const rideSnap = await getDoc(rideRef);
    if (!rideSnap.exists()) return;
    const ride = rideSnap.data();
    const field = ride.rider1 === raterId ? 'rider1Rating' : 'rider2Rating';
    await updateDoc(rideRef, { [field]: rating });
  }

  async getRide(rideId: string): Promise<Ride | null> {
    const snap = await getDoc(doc(db, 'rides', rideId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Ride;
  }
}

export default new RideService();
