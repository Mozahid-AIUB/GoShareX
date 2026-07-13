import ENV from '@/config/env';

import { buildQueryString, fetchJson, GOOGLE_API_ENDPOINTS } from './base';
import osmService from '@/services/osm/osmService';
import { logger } from '@/utils/logger';

// 🔧 SWITCH: Google চালু/বন্ধ (placesService-এর সাথে একই অর্থ)।
// false → সবসময় ফ্রি OSRM; true → আগে Google, fail করলে OSRM।
const USE_GOOGLE = false;

const hasGoogleKey = () =>
  USE_GOOGLE && !!ENV.googleDirectionsApiKey && ENV.googleDirectionsApiKey !== 'placeholder';

type LatLng = {
  latitude: number;
  longitude: number;
};

export type DirectionsRequest = {
  origin: string;
  destination: string;
  waypoints?: string[];
  mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
  departureTime?: 'now' | number;
  trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
  alternatives?: boolean;
  language?: string;
  units?: 'metric' | 'imperial';
  region?: string;
};

export type DirectionsLeg = {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  duration_in_traffic?: { text: string; value: number };
  start_address: string;
  end_address: string;
  steps: Array<{
    html_instructions: string;
    distance: { text: string; value: number };
    duration: { text: string; value: number };
    travel_mode: string;
    polyline: { points: string };
  }>;
};

export type DirectionsRoute = {
  summary: string;
  legs: DirectionsLeg[];
  overview_polyline: { points: string };
  warnings: string[];
  copyrights: string;
};

export type DirectionsResponse = {
  status: string;
  routes: DirectionsRoute[];
  geocoded_waypoints?: Array<{ status: string; place_id: string }>;
  error_message?: string;
};

class DirectionsService {
  async getDirections(req: DirectionsRequest): Promise<DirectionsResponse> {
    const query = buildQueryString({
      key: ENV.googleDirectionsApiKey,
      origin: req.origin,
      destination: req.destination,
      mode: req.mode ?? 'driving',
      language: req.language ?? 'en',
      units: req.units ?? 'metric',
      region: req.region ?? 'bd',
      departure_time: req.departureTime,
      traffic_model: req.trafficModel,
      alternatives: req.alternatives ? 'true' : undefined,
      waypoints: req.waypoints?.length ? req.waypoints.join('|') : undefined,
    });

    const data = await fetchJson<DirectionsResponse>(
      `${GOOGLE_API_ENDPOINTS.directions}?${query}`
    );

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(data.error_message || `Directions API status: ${data.status}`);
    }

    return data;
  }

  async getTravelTime(
    origin: string,
    destination: string,
    mode: DirectionsRequest['mode'] = 'driving'
  ): Promise<number> {
    const result = await this.getDirections({
      origin,
      destination,
      mode,
      departureTime: 'now',
      trafficModel: 'best_guess',
    });

    const leg = result.routes?.[0]?.legs?.[0];
    if (!leg) return 0;

    return leg.duration_in_traffic?.value ?? leg.duration.value;
  }

  async getRoute(params: {
    origin: LatLng;
    destination: LatLng;
    mode?: DirectionsRequest['mode'];
  }) {
    // Google key থাকলে আগে Google — fail করলে (billing সহ) OSRM (ফ্রি)।
    if (hasGoogleKey()) {
      try {
        const data = await this.getDirections({
          origin: `${params.origin.latitude},${params.origin.longitude}`,
          destination: `${params.destination.latitude},${params.destination.longitude}`,
          mode: params.mode ?? 'walking',
        });

        const route = data.routes?.[0];
        const leg = route?.legs?.[0];
        // Google সাড়া দিল কিন্তু route নেই → OSRM চেষ্টা করি।
        if (route?.overview_polyline?.points) {
          return {
            summary: route?.summary ?? '',
            polyline: route.overview_polyline.points,
            distanceText: leg?.distance?.text ?? '',
            distanceMeters: leg?.distance?.value ?? 0,
            durationText: leg?.duration?.text ?? '',
            durationSeconds: leg?.duration?.value ?? 0,
            startAddress: leg?.start_address ?? '',
            endAddress: leg?.end_address ?? '',
          };
        }
      } catch (e: any) {
        logger.warn('directions.getRoute.google→osm', e?.message ?? String(e));
      }
    }

    // ---- ফ্রি fallback: OSRM ----
    return osmService.getRoute({ origin: params.origin, destination: params.destination });
  }
}

export default new DirectionsService();
