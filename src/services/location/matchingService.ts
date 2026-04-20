import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@config/firebase';
import { haversineDistance } from '@utils/haversine';
import { PROXIMITY_RADIUS_METERS, LOCATION_UPDATE_INTERVAL_MS } from '@constants/index';
import type { ActiveRider } from '@types/index';

/**
 * Subscribe to nearby riders within PROXIMITY_RADIUS_METERS
 * who share the same destination.
 */
export const subscribeToNearbyRiders = (
  myLat: number,
  myLng: number,
  destination: string,
  myUid: string,
  onUpdate: (riders: ActiveRider[]) => void
) => {
  const staleThreshold = Date.now() - LOCATION_UPDATE_INTERVAL_MS * 3;

  const q = query(
    collection(db, 'active_riders'),
    where('destination', '==', destination),
    where('status', '==', 'waiting')
  );

  return onSnapshot(q, (snapshot) => {
    const riders: ActiveRider[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as ActiveRider;

      if (doc.id === myUid) return;
      if (data.timestamp < staleThreshold / 1000) return;

      const distanceMeters = haversineDistance(
        { lat: myLat, lng: myLng },
        { lat: data.lat, lng: data.lng }
      );

      riders.push({ ...data, uid: doc.id, distanceMeters });
    });

    // Sort by distance ascending
    riders.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

    onUpdate(riders);
  });
};
