/**
 * roadsService.ts — Google Roads API client.
 *
 * Use cases:
 * - snapToRoad: align noisy GPS points to actual roads (smooth marker movement)
 * - nearestRoad: find the closest road segment for a single point
 *
 * Quota note: Roads API is metered per request. Always batch points
 * (up to 100 per call) and cache results when possible.
 */

import ENV from '@/config/env';
import { fetchJson, GOOGLE_API_ENDPOINTS, GoogleApiError } from './base';
import { logger } from '@/utils/logger';

export type LatLng = {
  latitude: number;
  longitude: number;
};

type SnapToRoadsResponse = {
  snappedPoints?: Array<{
    location: { latitude: number; longitude: number };
    originalIndex?: number;
    placeId?: string;
  }>;
  warningMessage?: string;
};

class RoadsService {
  /**
   * Snap a path of GPS points to the nearest roads.
   * Returns aligned coordinates that lie exactly on a road centerline.
   *
   * @param points Up to 100 lat/lng pairs in order of travel
   * @param interpolate If true, Google adds extra points to follow road geometry
   */
  async snapToRoads(points: LatLng[], interpolate = true): Promise<LatLng[]> {
    if (!ENV.googleMapsApiKey) {
      throw new GoogleApiError('Google Maps API key missing for Roads API');
    }
    if (points.length === 0) return [];
    if (points.length > 100) {
      logger.warn('roadsService', `snapToRoads called with ${points.length} points; truncating to 100`);
      points = points.slice(0, 100);
    }

    const path = points.map((p) => `${p.latitude},${p.longitude}`).join('|');
    const url = `${GOOGLE_API_ENDPOINTS.roadsSnap}?path=${encodeURIComponent(path)}&interpolate=${interpolate}&key=${ENV.googleMapsApiKey}`;

    try {
      const data = await fetchJson<SnapToRoadsResponse>(url);
      if (data.warningMessage) {
        logger.warn('roadsService.snap', data.warningMessage);
      }
      return (data.snappedPoints ?? []).map((p) => ({
        latitude: p.location.latitude,
        longitude: p.location.longitude,
      }));
    } catch (err) {
      logger.error('roadsService.snapToRoads', err);
      // On failure, return original points (graceful degradation)
      return points;
    }
  }

  /**
   * Snap a single GPS point to its nearest road.
   * Cheaper than snapToRoads when you only have one point.
   */
  async snapSingle(point: LatLng): Promise<LatLng> {
    const result = await this.snapToRoads([point], false);
    return result[0] ?? point;
  }
}

export default new RoadsService();
