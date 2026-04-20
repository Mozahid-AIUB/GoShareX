import { useEffect } from 'react';
import { getCurrentLocation } from '@/services/location/locationService';
import { useLocationStore } from '@/store';

export function useLocation() {
  const { lat, lng, setLocation } = useLocationStore();

  useEffect(() => {
    getCurrentLocation().then((loc) => {
      setLocation(loc.coords.latitude, loc.coords.longitude);
    }).catch(console.error);
  }, []);

  return { lat, lng };
}
