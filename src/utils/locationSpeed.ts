const KMH_PER_MPS = 3.6;
// Only clamp GPS jitter below 1 km/h — anything above that is real movement
const JITTER_THRESHOLD_KMH = 1;
// Poor GPS accuracy (>25m) can produce fake speed readings below this value
const POOR_ACCURACY_FAKE_SPEED_KMH = 2;
const POOR_ACCURACY_THRESHOLD_METERS = 25;

/**
 * GPS speed often jitters a little even when the phone is stationary.
 * Only clamp readings below 1 km/h to zero — walking speed (~3-5 km/h)
 * and above must always show through.
 */
export function sanitizeSpeedKmh(
  speedMps: number | null | undefined,
  accuracyMeters?: number | null
): number | null {
  if (speedMps == null || speedMps < 0) return null;

  const speedKmh = speedMps * KMH_PER_MPS;
  const accuracy = accuracyMeters ?? null;

  // Pure GPS jitter — below 1 km/h is always noise
  if (speedKmh < JITTER_THRESHOLD_KMH) return 0;

  // Poor GPS lock: fake speed readings can appear below 2 km/h
  if (accuracy != null && accuracy > POOR_ACCURACY_THRESHOLD_METERS && speedKmh < POOR_ACCURACY_FAKE_SPEED_KMH) {
    return 0;
  }

  return speedKmh;
}
