import { useEffect, useState } from 'react';
import { getCurrentLocation, requestLocationPermission } from '@/services/location/locationService';
import { useLocationStore } from '@/store';
import { sanitizeSpeedKmh } from '@/utils/locationSpeed';

interface UseLocationResult {
  lat: number | null;
  lng: number | null;
  locationError: string | null;
  locationReady: boolean;
}

export function useLocation(): UseLocationResult {
  const { latitude, longitude, setLocation } = useLocationStore();
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchLocation() {
      try {
        const granted = await requestLocationPermission();
        if (!granted) {
          if (!cancelled) setLocationError('Location permission denied. Please enable it in Settings.');
          return;
        }
        const loc = await getCurrentLocation();
        if (!cancelled) {
          setLocation(
            loc.coords.latitude,
            loc.coords.longitude,
            loc.coords.accuracy ?? 0,
            sanitizeSpeedKmh(loc.coords.speed, loc.coords.accuracy)
          );
          setLocationReady(true);
          setLocationError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setLocationError(err?.message ?? 'Unable to get your location.');
        }
      }
    }

    fetchLocation();
    return () => { cancelled = true; };
  }, []);

  return {
    lat: latitude ?? null,
    lng: longitude ?? null,
    locationError,
    locationReady,
  };
}
