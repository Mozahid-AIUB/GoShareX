import { updateBadge } from '@/services/user/badgePenaltyService';
import { incrementRideCount, addSavings, getUser } from '@/services/firebase/userService';
import { addCancellationStrike } from '@/services/user/penaltyService';
import { trackRideComplete } from '@/services/analytics/analyticsService';
import { collection, doc, addDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, set, remove } from 'firebase/database';
import { db, realtimeDb } from '@/config/firebase.config';
import type { RideRoutePreview } from '@/types/ride.types';
import { getFare } from '@/utils/fareTable';

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
      rider1Ready: false,
      rider2Ready: false,
    });
    return rideDoc.id;
  }

  // Mark a rider as "at pickup point and ready to start"
  async markReady(rideId: string, userId: string): Promise<void> {
    const ride = await this.getRide(rideId);
    if (!ride) throw new Error('Ride not found');
    const field = ride.rider1 === userId ? 'rider1Ready' : 'rider2Ready';
    await updateDoc(doc(db, 'rides', rideId), { [field]: true });
  }

  async startRide(rideId: string): Promise<void> {
    const ride = await this.getRide(rideId);
    if (!ride) throw new Error('Ride not found');

    // Mark ride active in Firestore first — this is the source of truth
    await updateDoc(doc(db, 'rides', rideId), { status: 'active', startedAt: Date.now() });

    // Update RTDB status independently — failures here are non-fatal because
    // cleanupInactiveRiders Cloud Function will reconcile stale RTDB entries
    const rtdbUpdates = await Promise.allSettled([
      set(ref(realtimeDb, `active_riders/${ride.rider1}/status`), 'in_ride'),
      set(ref(realtimeDb, `active_riders/${ride.rider2}/status`), 'in_ride'),
    ]);
    rtdbUpdates.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`startRide: RTDB status update [${i}] failed:`, r.reason);
      }
    });
  }

  async completeRide(rideId: string): Promise<void> {
    const rideRef = doc(db, 'rides', rideId);
    const rideSnap = await getDoc(rideRef);
    if (!rideSnap.exists()) throw new Error('Ride not found');
    const ride = rideSnap.data() as Ride;

    // Mark ride complete first — this is the critical step
    await updateDoc(rideRef, { status: 'completed', completedAt: Date.now() });

    // Remove both riders from RTDB — settle independently so one failure doesn't block the other
    await Promise.allSettled([
      remove(ref(realtimeDb, `active_riders/${ride.rider1}`)),
      remove(ref(realtimeDb, `active_riders/${ride.rider2}`)),
    ]);

    // Real savings = what user would have paid solo minus what they actually paid (split)
    // ride.fare is the total negotiated fare; solo fare comes from the fare table
    const soloFare = getFare(ride.pickupPoint, ride.destination) || ride.fare;
    const savings = soloFare - ride.splitAmount;

    // Update stats independently — one rider's failure must not block the other
    const statsResults = await Promise.allSettled([
      incrementRideCount(ride.rider1),
      incrementRideCount(ride.rider2),
      addSavings(ride.rider1, savings),
      addSavings(ride.rider2, savings),
    ]);
    statsResults.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`completeRide: stats update [${i}] failed:`, r.reason);
      }
    });

    trackRideComplete(rideId, ride.fare, savings);

    // Badge upgrades — fetch fresh stats so badge reflects the just-incremented count
    const [user1Result, user2Result] = await Promise.allSettled([
      getUser(ride.rider1),
      getUser(ride.rider2),
    ]);

    const badgeUpdates: Promise<void>[] = [];
    if (user1Result.status === 'fulfilled' && user1Result.value) {
      const u = user1Result.value;
      badgeUpdates.push(updateBadge(ride.rider1, u.totalRides, u.rating));
    } else {
      console.error('completeRide: could not fetch rider1 for badge update');
    }
    if (user2Result.status === 'fulfilled' && user2Result.value) {
      const u = user2Result.value;
      badgeUpdates.push(updateBadge(ride.rider2, u.totalRides, u.rating));
    } else {
      console.error('completeRide: could not fetch rider2 for badge update');
    }

    const badgeResults = await Promise.allSettled(badgeUpdates);
    badgeResults.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`completeRide: badge update [${i}] failed:`, r.reason);
      }
    });
  }

  async cancelRide(rideId: string, userId: string, reason = 'Cancelled by user'): Promise<void> {
    const ride = await this.getRide(rideId);
    if (!ride) throw new Error('Ride not found');

    // Mark cancelled in Firestore first — this is the source of truth
    await updateDoc(doc(db, 'rides', rideId), {
      status: 'cancelled',
      cancelledAt: Date.now(),
      cancelledBy: userId,
      cancelReason: reason,
    });

    // Remove both riders from RTDB independently — if one fails the other
    // must still be cleaned up so neither rider gets stuck as "active"
    const rtdbResults = await Promise.allSettled([
      remove(ref(realtimeDb, `active_riders/${ride.rider1}`)),
      remove(ref(realtimeDb, `active_riders/${ride.rider2}`)),
    ]);
    rtdbResults.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`cancelRide: RTDB cleanup [${i}] failed:`, r.reason);
      }
    });

    await addCancellationStrike(userId);
  }

  async submitRating(rideId: string, raterId: string, rating: number): Promise<void> {
    const rideRef = doc(db, 'rides', rideId);
    const rideSnap = await getDoc(rideRef);
    if (!rideSnap.exists()) return;

    const ride = rideSnap.data();

    // Guard against double-rating — check BEFORE writing anything
    if (ride[`rated_${raterId}`] === true) {
      console.warn(`submitRating: rider ${raterId} already rated ride ${rideId}`);
      return;
    }

    const field = ride.rider1 === raterId ? 'rider1Rating' : 'rider2Rating';
    const otherRiderId = ride.rider1 === raterId ? ride.rider2 : ride.rider1;

    // Update ride with rating AND mark as rated atomically
    await updateDoc(rideRef, {
      [field]: rating,
      [`rated_${raterId}`]: true,
    });

    // ──── Calculate & Update Trust Score ────
    // Trust Score = (average rating / 5) * 100
    // Only calculate if it's a valid rating (1-5)
    if (rating >= 1 && rating <= 5) {
      const otherUserRef = doc(db, 'users', otherRiderId);
      const otherUserSnap = await getDoc(otherUserRef);

      if (otherUserSnap.exists()) {
        const otherUser = otherUserSnap.data();
        const currentRatingCount = otherUser.ratingCount ?? 0;
        const currentAverageRating = otherUser.rating ?? 5;

        // Calculate new average rating
        const newRatingCount = currentRatingCount + 1;
        const newAverageRating = (currentAverageRating * currentRatingCount + rating) / newRatingCount;

        // Calculate trust score (0-100)
        const newTrustScore = Math.round((newAverageRating / 5) * 100);

        // Update user with new trust score and rating count
        await updateDoc(otherUserRef, {
          rating: newAverageRating,
          ratingCount: newRatingCount,
          trustScore: newTrustScore,
        });
      }
    }
  }

  async getRide(rideId: string): Promise<Ride | null> {
    const snap = await getDoc(doc(db, 'rides', rideId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Ride;
  }
}

export default new RideService();