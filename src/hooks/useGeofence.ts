import { useEffect, useRef, useState } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { DESTINATIONS } from '@/constants/destinations';
import { calculateDistance } from '@/utils/haversine';
import { logger } from '@/utils/logger';

const ARRIVAL_RADIUS_METERS = 100;

interface UseGeofenceResult {
  isNearDestination: boolean;
}

/**
 * Watches the user's location and fires `onArrived` once they come within
 * 100 metres of the given destination name.
 *
 * @param destination - Destination name matching DESTINATIONS list
 * @param onArrived - Callback fired (once) when the user arrives
 */
export function useGeofence(
  destination: string,
  onArrived: () => void,
): UseGeofenceResult {
  const [isNearDestination, setIsNearDestination] = useState(false);
  const arrivedRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const onArrivedRef = useRef(onArrived);

  // Keep callback ref current
  useEffect(() => {
    onArrivedRef.current = onArrived;
  }, [onArrived]);

  useEffect(() => {
    if (!destination) return;

    // Resolve destination coordinates
    const dest = DESTINATIONS.find(
      (d) => d.name === destination || d.id === destination,
    );
    if (!dest) {
      logger.warn('useGeofence', `Unknown destination: ${destination}`);
      return;
    }

    arrivedRef.current = false;

    watchIdRef.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const distanceMeters = calculateDistance(
          latitude,
          longitude,
          dest.lat,
          dest.lng,
        );

        const near = distanceMeters <= ARRIVAL_RADIUS_METERS;
        setIsNearDestination(near);

        if (near && !arrivedRef.current) {
          arrivedRef.current = true;
          onArrivedRef.current();
        }
      },
      (error) => {
        logger.error('useGeofence.watchPosition', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // only update when moved ≥10 m
        interval: 5000,
        fastestInterval: 2000,
      },
    );

    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [destination]);

  return { isNearDestination };
}
