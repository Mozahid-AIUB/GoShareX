/**
 * groupRideOptimizer.ts — High-level helper that combines Route Optimization
 * + proportional fare split for 3+ rider group rides.
 *
 * Use this when:
 * - A post has 3+ interested riders all confirmed
 * - You have GPS coordinates for each joining rider
 * - You want optimal pickup order + per-rider fare share
 */

import routeOptimizationService, {
  type LatLng,
  type OptimizedRoute,
} from '@/services/google/routeOptimizationService';
import { logger } from '@/utils/logger';

export type GroupRider = {
  uid: string;
  name: string;
  pickupLocation: LatLng;
};

export type GroupRideResult = {
  /** Riders in optimal pickup order (uid + name + location). */
  orderedRiders: GroupRider[];
  /** Per-rider fare share, in BDT, indexed same as orderedRiders. */
  fareShares: number[];
  /** Total optimized route distance (meters). */
  totalDistanceMeters: number;
  /** Total optimized route duration (seconds). */
  totalDurationSeconds: number;
  /** Encoded polyline of the full optimized path. */
  polyline: string;
};

/**
 * Compute pickup order + fare split for a group ride.
 *
 * @param origin       Where the ride starts (e.g. first rider's location or post pickup point)
 * @param riders       All joining riders with their pickup coords
 * @param destination  Where everyone is going
 * @param totalFare    Total fare for the entire trip (BDT)
 *
 * @returns null on Route Optimization failure (caller should fall back to manual order + equal split)
 */
export async function optimizeGroupRide(
  origin: LatLng,
  riders: GroupRider[],
  destination: LatLng,
  totalFare: number,
): Promise<GroupRideResult | null> {
  if (riders.length === 0) return null;
  if (riders.length === 1) {
    // No optimization needed for solo
    return {
      orderedRiders: riders,
      fareShares: [totalFare],
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      polyline: '',
    };
  }

  const optimized: OptimizedRoute | null = await routeOptimizationService.optimize({
    start: origin,
    pickups: riders.map((r) => ({ id: r.uid, location: r.pickupLocation })),
    destination,
    mode: 'driving',
  });

  if (!optimized) {
    logger.warn('groupRideOptimizer', 'Route Optimization failed — falling back to equal split');
    return {
      orderedRiders: riders,
      fareShares: riders.map(() => Math.ceil(totalFare / riders.length)),
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      polyline: '',
    };
  }

  // Sort riders by the optimized pickupOrder (array of uids)
  const ridersByUid = new Map(riders.map((r) => [r.uid, r]));
  const orderedRiders = optimized.pickupOrder
    .map((uid) => ridersByUid.get(uid))
    .filter((r): r is GroupRider => !!r);

  // Fare split: each rider pays in proportion to the leg they were carried on.
  // Legs are: start -> rider1, rider1 -> rider2, ..., riderN -> destination
  // Rider i is carried on legs i, i+1, ..., N (i.e. from when they board to the end)
  const legDistances = optimized.legDistances;
  const totalDist = legDistances.reduce((a, b) => a + b, 0);

  const fareShares = orderedRiders.map((_, i) => {
    if (totalDist === 0) return Math.ceil(totalFare / orderedRiders.length);
    // Sum distances from leg i+1 onward (legs after this rider's pickup)
    const carriedDist = legDistances.slice(i + 1).reduce((a, b) => a + b, 0);
    return Math.round((carriedDist / totalDist) * totalFare);
  });

  // Adjust rounding so total matches exactly
  const sumShares = fareShares.reduce((a, b) => a + b, 0);
  const diff = totalFare - sumShares;
  if (diff !== 0 && fareShares.length > 0) {
    fareShares[0] += diff;
  }

  return {
    orderedRiders,
    fareShares,
    totalDistanceMeters: optimized.totalDistanceMeters,
    totalDurationSeconds: optimized.totalDurationSeconds,
    polyline: optimized.polyline,
  };
}

/**
 * Build a human-readable pickup order message for chat.
 *
 * Example output:
 *   "Pickup order:
 *    1. Mozahid (৳30)
 *    2. Sakib (৳40)
 *    3. Tania (৳30)
 *    Total: ৳100"
 */
export function formatPickupOrderMessage(result: GroupRideResult, totalFare: number): string {
  const lines = result.orderedRiders.map(
    (r, i) => `${i + 1}. ${r.name} (৳${result.fareShares[i]})`,
  );
  return ['Pickup order:', ...lines, `Total: ৳${totalFare}`].join('\n');
}
