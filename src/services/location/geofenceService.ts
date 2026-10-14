import * as Location from 'expo-location';
import { getDestinationById, getDestinationByName } from '@/constants/destinations';
import { haversineDistance } from '@/utils/haversine';
import { logger } from '@/utils/logger';

export type ArrivalTarget = { lat: number; lng: number; radius: number };

/** Resolve a preset destination (id or name) to an arrival target. */
export function resolveArrivalTarget(destinationIdOrName: string): ArrivalTarget | null {
  const dest =
    getDestinationById(destinationIdOrName) ?? getDestinationByName(destinationIdOrName);
  if (!dest) return null;
  return { lat: dest.lat, lng: dest.lng, radius: dest.geofenceRadius ?? 100 };
}

/**
 * Fires `onArrive` once when the device enters `target`. Foreground-only: uses
 * the in-use location permission, so no ACCESS_BACKGROUND_LOCATION is needed.
 * Returns a stop function.
 */
export async function watchArrival(
  target: ArrivalTarget,
  onArrive: () => void,
): Promise<() => void> {
  if (!Number.isFinite(target.lat) || !Number.isFinite(target.lng)) {
    logger.warn('geofenceService', 'Invalid destination coordinates for arrival watch');
    return () => undefined;
  }

  let arrived = false;
  let sub: Location.LocationSubscription | null = null;
  sub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
    (loc) => {
      if (arrived) return;
      const dist = haversineDistance(
        loc.coords.latitude,
        loc.coords.longitude,
        target.lat,
        target.lng,
      );
      if (dist <= target.radius) {
        arrived = true;
        sub?.remove();
        onArrive();
      }
    },
  );

  return () => sub?.remove();
}
