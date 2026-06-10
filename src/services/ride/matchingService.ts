import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '@/services/firebase/config';
import { RTDB_PATHS, COLLECTIONS } from '@/constants/firebaseKeys';
import { haversineDistance } from '@/utils/haversine';
import { PROXIMITY_ZONES } from '@/constants/locations';
import type { ActiveRider, NearbyRider } from '@/types';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { supabasePresenceService } from '@/services/supabase/presenceService';

export function subscribeToNearbyRiders(
  currentUser: {
    uid: string; lat: number; lng: number; destination: string;
    destLat?: number; destLng?: number;   // নিজের গন্তব্যের coordinate (geo-match)
    getLatest?: () => { lat: number; lng: number; destLat?: number; destLng?: number } | null;
  },
  onUpdate: (riders: NearbyRider[]) => void
): () => void {
  // Supabase mode-এ presence service ব্যবহার করি (একই behavior)।
  if (FEATURE_FLAGS.USE_SUPABASE_PRESENCE) {
    return supabasePresenceService.subscribeToNearbyRiders(currentUser, onUpdate);
  }
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
