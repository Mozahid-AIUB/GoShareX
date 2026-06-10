import { useEffect } from 'react';
import { subscribeToNearbyRiders } from '@/services/ride/matchingService';
import { useRideStore, useAuthStore } from '@/store';
import { useLocationStore } from '@/store';

export function useNearbyRiders(
  destination: string | null,
  enabled: boolean = true,
  destLat?: number,   // নিজের গন্তব্যের lat (geo-match — text না, coordinate মেলাই)
  destLng?: number,
) {
  const { latitude, longitude } = useLocationStore();
  const { setNearbyRiders } = useRideStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!enabled) {
      setNearbyRiders([]);
      return;
    }

    if (!latitude || !longitude || !destination || !user?.uid) return;
    const unsubscribe = subscribeToNearbyRiders(
      {
        uid: user.uid, lat: latitude, lng: longitude, destination, destLat, destLng,
        // প্রতি RPC call-এ সর্বশেষ GPS (Map-এর মতো) → দুই screen একই distance।
        getLatest: () => {
          const s = useLocationStore.getState();
          if (s.latitude == null || s.longitude == null) return null;
          return { lat: s.latitude, lng: s.longitude, destLat, destLng };
        },
      },
      setNearbyRiders
    );
    return unsubscribe;
  }, [destination, enabled, latitude, longitude, destLat, destLng, setNearbyRiders, user?.uid]);
}
