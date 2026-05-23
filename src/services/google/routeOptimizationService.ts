/**
 * routeOptimizationService.ts — Google Route Optimization (formerly Routes
 * with `optimize:true` waypoints in Directions API).
 *
 * Use case: group rides with 3+ pickups -> compute optimal pickup order
 * so total distance is minimized, then split fare proportional to leg
 * distance contribution.
 *
 * Implementation uses Directions API `waypoints=optimize:true|...` which
 * returns `waypoint_order` — the cheapest published path on Maps Platform
 * (Route Optimization API itself is a separate, vehicle-fleet-scale product;
 * Directions optimize covers the in-app use case 100% cheaper).
 */

import ENV from '@/config/env';
import { buildQueryString, fetchJson, GoogleApiError } from './base';
import { logger } from '@/utils/logger';

const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

export type LatLng = { latitude: number; longitude: number };

export type OptimizeInput = {
  start: LatLng;
  pickups: Array<{ id: string; location: LatLng }>;
  destination: LatLng;
  mode?: 'driving' | 'walking';
};

export type OptimizedRoute = {
  /** Pickup IDs in the optimal order (excludes start + destination). */
  pickupOrder: string[];
  /** Encoded polyline of the full optimized path. */
  polyline: string;
  /** Per-leg distance (meters) — start->p1, p1->p2, ..., pn->destination. */
  legDistances: number[];
  /** Per-leg duration (seconds). */
  legDurations: number[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
};

type DirectionsOptimizeResponse = {
  status: string;
  error_message?: string;
  routes?: Array<{
    waypoint_order?: number[];
    overview_polyline?: { points: string };
    legs?: Array<{
      distance?: { value: number };
      duration?: { value: number };
    }>;
  }>;
};

class RouteOptimizationService {
  /**
   * Compute the cheapest pickup ordering for a group ride.
   * Returns null on failure (caller should fall back to user-defined order).
   */
  async optimize(input: OptimizeInput): Promise<OptimizedRoute | null> {
    if (!ENV.googleDirectionsApiKey) {
      throw new GoogleApiError('Directions API key missing for route optimization');
    }
    if (input.pickups.length === 0) return null;
    if (input.pickups.length > 23) {
      // Directions API hard limit is 25 waypoints; we cap at 23 to leave room
      // for start + destination
      logger.warn('routeOptimizationService', `${input.pickups.length} pickups truncated to 23`);
      input.pickups = input.pickups.slice(0, 23);
    }

    const waypointPath = input.pickups
      .map((p) => `${p.location.latitude},${p.location.longitude}`)
      .join('|');

    const query = buildQueryString({
      origin: `${input.start.latitude},${input.start.longitude}`,
      destination: `${input.destination.latitude},${input.destination.longitude}`,
      waypoints: `optimize:true|${waypointPath}`,
      mode: input.mode ?? 'driving',
      key: ENV.googleDirectionsApiKey,
      language: 'en',
      units: 'metric',
    });

    try {
      const data = await fetchJson<DirectionsOptimizeResponse>(`${DIRECTIONS_URL}?${query}`);
      if (data.status !== 'OK') {
        logger.warn(
          'routeOptimizationService.optimize',
          data.error_message ?? data.status,
        );
        return null;
      }
      const route = data.routes?.[0];
      if (!route || !route.waypoint_order) return null;

      const pickupOrder = route.waypoint_order.map((idx) => input.pickups[idx].id);
      const legDistances = (route.legs ?? []).map((l) => l.distance?.value ?? 0);
      const legDurations = (route.legs ?? []).map((l) => l.duration?.value ?? 0);

      return {
        pickupOrder,
        polyline: route.overview_polyline?.points ?? '',
        legDistances,
        legDurations,
        totalDistanceMeters: legDistances.reduce((a, b) => a + b, 0),
        totalDurationSeconds: legDurations.reduce((a, b) => a + b, 0),
      };
    } catch (err) {
      logger.error('routeOptimizationService.optimize', err);
      return null;
    }
  }

  /**
   * Given total fare and leg distances, return per-rider fare share
   * proportional to the leg they were carried on.
   *
   * Example: 4-rider group, legs [2km, 3km, 1km, 4km], fare 100 BDT
   *  -> shares: [20, 30, 10, 40]
   */
  computeProportionalShare(totalFare: number, legDistances: number[]): number[] {
    const total = legDistances.reduce((a, b) => a + b, 0);
    if (total === 0) return legDistances.map(() => 0);
    return legDistances.map((d) => Math.round((d / total) * totalFare));
  }
}

export default new RouteOptimizationService();
