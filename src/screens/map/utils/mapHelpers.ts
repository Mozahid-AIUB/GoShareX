/**
 * mapHelpers — Pure utility functions for LiveMapScreen.
 */

import { calculateDistance } from '@/utils/haversine';

export type LatLng = { latitude: number; longitude: number };

/** Decode a Google encoded polyline string into lat/lng points. */
export const decodePolyline = (encoded: string): LatLng[] => {
  const pts: LatLng[] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  while (i < encoded.length) {
    let r = 0;
    let s = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(i++) - 63;
      r |= (b & 0x1f) << s;
      s += 5;
    } while (b >= 0x20);
    lat += r & 1 ? ~(r >> 1) : r >> 1;
    r = 0;
    s = 0;
    do {
      b = encoded.charCodeAt(i++) - 63;
      r |= (b & 0x1f) << s;
      s += 5;
    } while (b >= 0x20);
    lng += r & 1 ? ~(r >> 1) : r >> 1;
    pts.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return pts;
};

/** Safe wrapper — returns [] on bad input rather than throwing. */
export const safeDecodePolyline = (encoded?: string): LatLng[] => {
  if (!encoded) return [];
  try {
    return decodePolyline(encoded);
  } catch {
    return [];
  }
};

/** Does a rider's pickup point match the user's filter? */
export const matchesPickup = (
  rp: string | undefined,
  id: string | null,
  name: string | undefined,
): boolean => {
  if (!id) return true;
  if (!rp) return false;
  return (
    rp === id ||
    rp === name ||
    rp.toLowerCase() === id.toLowerCase() ||
    rp.toLowerCase() === (name ?? '').toLowerCase()
  );
};

/** Minimum distance from a point to any coordinate on a polyline. */
export const distanceToRoute = (pt: LatLng, coords: LatLng[]): number => {
  if (!coords.length) return Infinity;
  return coords.reduce(
    (min, c) => Math.min(min, calculateDistance(pt.latitude, pt.longitude, c.latitude, c.longitude)),
    Infinity,
  );
};

// ─── Zone expansion levels ────────────────────────────────────────────────────
export const ZONE_LEVELS = [150, 250, 350] as const;
