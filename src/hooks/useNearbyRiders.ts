import { useEffect } from 'react';
import { subscribeToNearbyRiders } from '@/services/ride/matchingService';
import { useRideStore } from '@/store';
import { useLocationStore } from '@/store';

export function useNearbyRiders(destination: string | null) {
  const { lat, lng } = useLocationStore();
  const { setNearbyRiders } = useRideStore();

  useEffect(() => {
    if (!lat || !lng || !destination) return;
    const unsubscribe = subscribeToNearbyRiders(
      { uid: 'self', lat, lng, destination },
      setNearbyRiders
    );
    return unsubscribe;
  }, [lat, lng, destination]);
}
