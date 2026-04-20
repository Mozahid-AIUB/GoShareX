/**
 * trackingService.ts
 * GPS-based movement and rider separation detection for active rides.
 *
 * Uses @react-native-community/geolocation for location polling.
 * All tracking stops automatically when the returned cleanup functions are called.
 */

import Geolocation, {
  GeoPosition,
  GeoError,
} from '@react-native-community/geolocation';
import { updateRiderLocation } from '@/services/firebase/realtimeDb';
import { getNearbyRiders } from '@/services/firebase/realtimeDb';
import { logError } from '@/services/analytics/crashService';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Speed threshold in km/h above which the rickshaw is considered moving */
export const MOVEMENT_THRESHOLD_KMH = 5;

/** Distance in metres above which riders are considered separated */
export const SEPARATION_THRESHOLD_M = 200;

/** How often to poll GPS in milliseconds */
const POLL_INTERVAL_MS = 5_000;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function speedKmh(distMeters: number, elapsedMs: number): number {
  if (elapsedMs === 0) return 0;
  return (distMeters / elapsedMs) * 3_600_000 / 1_000;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Poll the device GPS and fire `onMovementDetected` whenever the rickshaw
 * appears to be moving above `MOVEMENT_THRESHOLD_KMH`.
 *
 * Also writes updated coordinates to RTDB so the partner can see live movement.
 *
 * @param rideId              Active ride id (used for RTDB writes)
 * @param onMovementDetected  Callback fired each poll cycle where motion is detected
 * @returns                   Cleanup function — call it to stop tracking
 */
export function startMovementTracking(
  rideId: string,
  onMovementDetected: () => void,
): () => void {
  let lastPosition: { lat: number; lng: number; time: number } | null = null;
  let intervalId: ReturnType<typeof setInterval>;

  const poll = () => {
    Geolocation.getCurrentPosition(
      (pos: GeoPosition) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const now = Date.now();

        if (lastPosition) {
          const dist = haversineMeters(lastPosition.lat, lastPosition.lng, lat, lng);
          const elapsed = now - lastPosition.time;
          const speed = speedKmh(dist, elapsed);

          if (speed >= MOVEMENT_THRESHOLD_KMH) {
            onMovementDetected();
          }
        }

        lastPosition = { lat, lng, time: now };

        // Fire-and-forget RTDB write
        updateRiderLocation(rideId, lat, lng).catch((err) =>
          logError(err as Error, { fn: 'startMovementTracking:updateRiderLocation' }),
        );
      },
      (err: GeoError) => logError(new Error(err.message), { fn: 'startMovementTracking:poll' }),
      { enableHighAccuracy: true, timeout: 4_000, maximumAge: 2_000 },
    );
  };

  // First poll immediately, then on interval
  poll();
  intervalId = setInterval(poll, POLL_INTERVAL_MS);

  return () => clearInterval(intervalId);
}

/**
 * Periodically check whether two riders are within `SEPARATION_THRESHOLD_M`
 * of each other. Fires `onSeparated` when they drift apart.
 *
 * @param myUid        Current user's UID
 * @param partnerUid   Partner's UID
 * @param onSeparated  Callback fired when the riders appear to have separated
 * @returns            Cleanup function — call it to stop tracking
 */
export function startSeparationTracking(
  myUid: string,
  partnerUid: string,
  onSeparated: () => void,
): () => void {
  let intervalId: ReturnType<typeof setInterval>;

  const check = () => {
    Geolocation.getCurrentPosition(
      async (pos: GeoPosition) => {
        try {
          const { latitude: myLat, longitude: myLng } = pos.coords;

          // Fetch nearby riders within a generous 5 km radius
          const riders = await getNearbyRiders(myLat, myLng, 5_000);
          const partner = riders.find((r) => r.uid === partnerUid);

          if (!partner) {
            // Partner not in RTDB — assume separated
            onSeparated();
            return;
          }

          const dist = haversineMeters(myLat, myLng, partner.lat, partner.lng);
          if (dist > SEPARATION_THRESHOLD_M) {
            onSeparated();
          }
        } catch (error) {
          logError(error as Error, { fn: 'startSeparationTracking:check' });
        }
      },
      (err: GeoError) => logError(new Error(err.message), { fn: 'startSeparationTracking:gps' }),
      { enableHighAccuracy: true, timeout: 4_000, maximumAge: 3_000 },
    );
  };

  check();
  intervalId = setInterval(check, POLL_INTERVAL_MS * 2); // Less aggressive for separation

  return () => clearInterval(intervalId);
}
