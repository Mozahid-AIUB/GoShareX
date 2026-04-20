import type { Coordinates } from '@/types';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export function haversineDistance(start: Coordinates, end: Coordinates): number;
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number;
export function haversineDistance(
  startOrLat1: Coordinates | number,
  endOrLon1: Coordinates | number,
  lat2?: number,
  lon2?: number
): number {
  if (typeof startOrLat1 === 'object' && typeof endOrLon1 === 'object') {
    return calculateDistance(
      startOrLat1.lat,
      startOrLat1.lng,
      endOrLon1.lat,
      endOrLon1.lng
    );
  }

  if (
    typeof startOrLat1 === 'number' &&
    typeof endOrLon1 === 'number' &&
    typeof lat2 === 'number' &&
    typeof lon2 === 'number'
  ) {
    return calculateDistance(startOrLat1, endOrLon1, lat2, lon2);
  }

  throw new Error('Invalid arguments passed to haversineDistance');
}

/**
 * Check if a point is within a certain radius of another point
 */
export function isWithinRadius(
  start: Coordinates,
  end: Coordinates,
  radiusMeters: number
): boolean;
export function isWithinRadius(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusMeters: number
): boolean;
export function isWithinRadius(
  startOrLat1: Coordinates | number,
  endOrLon1: Coordinates | number,
  lat2OrRadius: number,
  lon2?: number,
  radiusMeters?: number
): boolean {
  if (typeof startOrLat1 === 'object' && typeof endOrLon1 === 'object') {
    return haversineDistance(startOrLat1, endOrLon1) <= lat2OrRadius;
  }

  if (
    typeof startOrLat1 === 'number' &&
    typeof endOrLon1 === 'number' &&
    typeof lon2 === 'number' &&
    typeof radiusMeters === 'number'
  ) {
    return calculateDistance(startOrLat1, endOrLon1, lat2OrRadius, lon2) <= radiusMeters;
  }

  throw new Error('Invalid arguments passed to isWithinRadius');
}

/**
 * Format distance for display
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

/**
 * Calculate bearing between two points
 */
export const calculateBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
};
