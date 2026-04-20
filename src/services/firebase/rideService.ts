import { collection, doc, addDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, set, remove } from 'firebase/database';
import { db, realtimeDb } from '@/config/firebase.config';

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
  confirmedAt?: number;
  startedAt?: number;
  completedAt?: number;
  rider1Rating?: number;
  rider2Rating?: number;
}

class RideService {
  async createRide(
    rider1Id: string, rider1Name: string,
    rider2Id: string, rider2Name: string,
    destination: string, pickupPoint: string,
    fare: number
  ): Promise<string> {
    const rideDoc = await addDoc(collection(db, 'rides'), {
      rider1: rider1Id, rider1Name,
      rider2: rider2Id, rider2Name,
      destination, pickupPoint,
      fare,
      splitAmount: Math.ceil(fare / 2),
      status: 'confirmed',
      confirmedAt: Date.now(),
      createdAt: serverTimestamp(),
    });
    // Update both users' status in RTDB
    await set(ref(realtimeDb, `active_riders/${rider1Id}/status`), 'in_ride');
    await set(ref(realtimeDb, `active_riders/${rider2Id}/status`), 'in_ride');
    return rideDoc.id;
  }

  async startRide(rideId: string): Promise<void> {
    await updateDoc(doc(db, 'rides', rideId), { status: 'active', startedAt: Date.now() });
  }

  async completeRide(rideId: string, userId: string): Promise<void> {
    const rideRef = doc(db, 'rides', rideId);
    const rideSnap = await getDoc(rideRef);
    if (!rideSnap.exists()) return;
    const ride = rideSnap.data() as Ride;

    await updateDoc(rideRef, { status: 'completed', completedAt: Date.now() });

    // Remove both from active_riders
    await remove(ref(realtimeDb, `active_riders/${ride.rider1}`));
    await remove(ref(realtimeDb, `active_riders/${ride.rider2}`));
  }

  async cancelRide(rideId: string, userId: string): Promise<void> {
    await updateDoc(doc(db, 'rides', rideId), { status: 'cancelled', cancelledAt: Date.now(), cancelledBy: userId });
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
