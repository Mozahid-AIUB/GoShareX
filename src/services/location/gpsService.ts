import * as Location from 'expo-location';
import { sanitizeSpeedKmh } from '@/utils/locationSpeed';

export type Coords = { lat: number; lng: number; accuracy?: number; speed?: number };

let locationSubscription: Location.LocationSubscription | null = null;

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') return false;
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  return bg === 'granted';
}

export async function getCurrentLocation(): Promise<Coords> {
  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? undefined,
    speed: loc.coords.speed ?? undefined,
  };
}

export function startLocationTracking(
  onUpdate: (coords: Coords) => void,
  intervalMs = 5000
): () => void {
  let active = true;

  const poll = async () => {
    while (active) {
      try {
        const coords = await getCurrentLocation();
        onUpdate(coords);
      } catch {
        // silent
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  };

  poll();

  return () => {
    active = false;
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
  };
}

export async function startHighFrequencyTracking(
  onUpdate: (coords: Coords) => void
): Promise<() => void> {
  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 3000,
      distanceInterval: 5,
    },
    (loc) =>
      onUpdate({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? undefined,
        speed: loc.coords.speed ?? undefined,
      })
  );
  locationSubscription = sub;
  return () => sub.remove();
}

export function getSpeedKmh(speedMs: number | null | undefined): number {
  return sanitizeSpeedKmh(speedMs) ?? 0;
}
