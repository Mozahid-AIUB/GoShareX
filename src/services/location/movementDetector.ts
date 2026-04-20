import { getSpeedKmh, startHighFrequencyTracking, type Coords } from './gpsService';
import { haversineDistance } from '@/utils/haversine';

const MOVEMENT_THRESHOLD_KMH = 5;
const SEPARATION_THRESHOLD_M = 200;
const CHECK_INTERVAL_MS = 10_000;

export function startMovementDetection(onMoving: () => void): () => void {
  let stopTracking: (() => void) | null = null;
  let confirmed = false;

  startHighFrequencyTracking((coords: Coords) => {
    if (confirmed) return;
    const speedKmh = getSpeedKmh(coords.speed);
    if (speedKmh >= MOVEMENT_THRESHOLD_KMH) {
      confirmed = true;
      onMoving();
    }
  }).then((stop) => {
    stopTracking = stop;
  });

  return () => {
    stopTracking?.();
  };
}

export function startSeparationMonitor(
  getMyCoords: () => Coords | null,
  getPartnerCoords: () => Coords | null,
  onSeparated: () => void
): () => void {
  let alerted = false;

  const interval = setInterval(() => {
    const me = getMyCoords();
    const partner = getPartnerCoords();
    if (!me || !partner || alerted) return;

    const distM = haversineDistance(me.lat, me.lng, partner.lat, partner.lng);
    if (distM > SEPARATION_THRESHOLD_M) {
      alerted = true;
      onSeparated();
    }
  }, CHECK_INTERVAL_MS);

  return () => clearInterval(interval);
}
