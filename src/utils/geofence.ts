/**
 * RideShare AIUB — Geofence Utilities
 * Pure functions for geofence checks (no side effects).
 */
import { calculateDistance } from './haversine';
import { DESTINATIONS } from '@/constants/destinations';

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Check whether `point` is within `radiusMeters` of `center`.
 */
export function isInsideGeofence(
  point: GeoPoint,
  center: GeoPoint,
  radiusMeters: number,
): boolean {
  const distance = calculateDistance(point.lat, point.lng, center.lat, center.lng);
  return distance <= radiusMeters;
}

/**
 * Resolve the coordinates of a named destination from the DESTINATIONS list.
 * Returns null if the destination is not found.
 */
export function resolveDestinationCoords(
  destinationName: string,
): GeoPoint | null {
  const dest = DESTINATIONS.find(
    (d) =>
      d.name === destinationName ||
      d.id === destinationName ||
      d.nameBn === destinationName,
  );
  if (!dest) return null;
  return { lat: dest.lat, lng: dest.lng };
}

/**
 * Returns the distance in metres between the user's position and a named destination.
 * Returns Infinity if the destination is unknown.
 */
export function distanceToDestination(
  userPosition: GeoPoint,
  destinationName: string,
): number {
  const coords = resolveDestinationCoords(destinationName);
  if (!coords) return Infinity;
  return calculateDistance(
    userPosition.lat,
    userPosition.lng,
    coords.lat,
    coords.lng,
  );
}
