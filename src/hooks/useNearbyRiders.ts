import { useEffect } from 'react';
import { subscribeToNearbyRiders } from '@/services/ride/matchingService';
import { useRideStore, useAuthStore } from '@/store';
import { useLocationStore } from '@/store';

export function useNearbyRiders(destination: string | null, enabled: boolean = true) {
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
      { uid: user.uid, lat: latitude, lng: longitude, destination },
      setNearbyRiders
    );
    return unsubscribe;
  }, [destination, enabled, latitude, longitude, setNearbyRiders, user?.uid]);
}
