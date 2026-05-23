/**
 * useSnappedLocation — Buffer raw GPS points, call Roads API every few seconds
 * to snap them to the nearest road, and return the latest snapped coordinate.
 *
 * Falls back to raw coords if Roads API fails or is rate-limited.
 *
 * Quota note: batches up to 10 buffered points per call, max ~12 calls/min.
 */

import { useEffect, useRef, useState } from 'react';
import roadsService, { type LatLng } from '@/services/google/roadsService';
import { logger } from '@/utils/logger';

const SNAP_INTERVAL_MS = 5000;
const BUFFER_MAX = 10;
const MIN_BUFFER_TO_SNAP = 3;

export function useSnappedLocation(rawLat: number | null, rawLng: number | null): LatLng | null {
  const [snapped, setSnapped] = useState<LatLng | null>(null);
  const buffer = useRef<LatLng[]>([]);
  const lastSnapAt = useRef<number>(0);

  useEffect(() => {
    if (rawLat == null || rawLng == null) return;

    const raw: LatLng = { latitude: rawLat, longitude: rawLng };

    // Always show raw first (no flicker)
    if (!snapped) setSnapped(raw);

    // Add to buffer
    buffer.current = [...buffer.current.slice(-(BUFFER_MAX - 1)), raw];

    // Throttle snap calls
    const now = Date.now();
    if (
      buffer.current.length >= MIN_BUFFER_TO_SNAP &&
      now - lastSnapAt.current > SNAP_INTERVAL_MS
    ) {
      lastSnapAt.current = now;
      const batch = [...buffer.current];

      roadsService
        .snapToRoads(batch, false)
        .then((points) => {
          // Use the most recent snapped point (corresponds to latest raw point)
          const latest = points[points.length - 1];
          if (latest) setSnapped(latest);
        })
        .catch((err) => {
          logger.warn('useSnappedLocation', err);
          // Keep showing raw on failure
        });
    }
  }, [rawLat, rawLng, snapped]);

  return snapped;
}
