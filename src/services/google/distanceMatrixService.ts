import ENV from '@/config/env';

import { buildQueryString, fetchJson, GOOGLE_API_ENDPOINTS } from './base';

type LatLng = {
  latitude: number;
  longitude: number;
};

export type DistanceMatrixRequest = {
  origins: string[];
  destinations: string[];
  mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
  units?: 'metric' | 'imperial';
  departureTime?: 'now' | number;
  trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
  language?: string;
  region?: string;
};

export interface DistanceMatrixResponse {
  rows?: Array<{
    elements?: Array<{
      status?: string;
      distance?: { text?: string; value?: number };
      duration?: { text?: string; value?: number };
      duration_in_traffic?: { text?: string; value?: number };
    }>;
  }>;
  status: string;
  error_message?: string;
}

class DistanceMatrixService {
  async getMatrix(req: DistanceMatrixRequest): Promise<DistanceMatrixResponse> {
    const query = buildQueryString({
      key: ENV.googleDistanceMatrixApiKey,
      origins: req.origins.join('|'),
      destinations: req.destinations.join('|'),
      mode: req.mode ?? 'driving',
      units: req.units ?? 'metric',
      language: req.language ?? 'en',
      region: req.region ?? 'bd',
      departure_time: req.departureTime,
      traffic_model: req.trafficModel,
    });

    const data = await fetchJson<DistanceMatrixResponse>(
      `${GOOGLE_API_ENDPOINTS.distanceMatrix}?${query}`
    );

    if (data.status !== 'OK') {
      throw new Error(data.error_message || `Distance Matrix request failed: ${data.status}`);
    }

    return data;
  }

  async getWalkingMatrix(origin: LatLng, destinations: LatLng[]) {
    const data = await this.getMatrix({
      origins: [`${origin.latitude},${origin.longitude}`],
      destinations: destinations.map((item) => `${item.latitude},${item.longitude}`),
      mode: 'walking',
    });

    return (data.rows?.[0]?.elements ?? []).map((element) => ({
      status: element.status ?? 'UNKNOWN',
      distanceText: element.distance?.text ?? '',
      distanceMeters: element.distance?.value ?? 0,
      durationText: element.duration?.text ?? '',
      durationSeconds: element.duration?.value ?? 0,
      durationInTrafficSeconds: element.duration_in_traffic?.value ?? 0,
    }));
  }
}

export default new DistanceMatrixService();
