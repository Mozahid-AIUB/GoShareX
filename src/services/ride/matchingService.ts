import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '@/services/firebase/config';
import { RTDB_PATHS, COLLECTIONS } from '@/constants/firebaseKeys';
import { haversineDistance } from '@/utils/haversine';
import { PROXIMITY_ZONES } from '@/constants/locations';
import type { ActiveRider, NearbyRider } from '@/types';

export function subscribeToNearbyRiders(
  currentUser: { uid: string; lat: number; lng: number; destination: string },
  onUpdate: (riders: NearbyRider[]) => void
): () => void {
  const dbRef = ref(rtdb, RTDB_PATHS.ACTIVE_RIDERS);

  const handler = (snapshot: any) => {
    const data: Record<string, ActiveRider> = snapshot.val() ?? {};
    const nearby: NearbyRider[] = [];

    Object.values(data).forEach((rider) => {
      if (rider.uid === currentUser.uid) return;
      if (rider.status === 'riding') return;

      const distance = haversineDistance(
        currentUser.lat, currentUser.lng,
        rider.lat, rider.lng
      );

      if (distance <= PROXIMITY_ZONES.VISIBLE_ONLY) {
        nearby.push({
          uid: rider.uid,
          name: rider.name,
          distance: Math.round(distance),
          destination: rider.destination,
          pickupPoint: rider.pickupPoint,
          rating: rider.rating,
          badge: rider.badge,
          photoURL: rider.photoURL,
          lat: rider.lat,
          lng: rider.lng,
          isMatch: rider.destination === currentUser.destination,
        });
      }
    });

    nearby.sort((a, b) => a.distance - b.distance);
    onUpdate(nearby);
  };

  onValue(dbRef, handler);
  return () => off(dbRef, 'value', handler);
}
