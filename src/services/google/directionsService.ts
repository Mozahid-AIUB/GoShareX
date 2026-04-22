import ENV from '@/config/env';

import { buildQueryString, fetchJson, GOOGLE_API_ENDPOINTS } from './base';

type LatLng = {
  latitude: number;
  longitude: number;
};

interface DirectionsApiResponse {
  routes?: Array<{
    summary?: string;
    overview_polyline?: { points?: string };
    legs?: Array<{
      distance?: { text?: string; value?: number };
      duration?: { text?: string; value?: number };
      end_address?: string;
      start_address?: string;
    }>;
  }>;
  status: string;
  error_message?: string;
}

class DirectionsService {
  async getRoute(params: {
    origin: LatLng;
    destination: LatLng;
    mode?: 'walking' | 'driving' | 'bicycling' | 'transit';
  }) {
    const query = buildQueryString({
      origin: `${params.origin.latitude},${params.origin.longitude}`,
      destination: `${params.destination.latitude},${params.destination.longitude}`,
      mode: params.mode ?? 'walking',
      key: ENV.googleDirectionsApiKey,
    });

    const data = await fetchJson<DirectionsApiResponse>(
      `${GOOGLE_API_ENDPOINTS.directions}?${query}`
    );

    if (data.status !== 'OK') {
      throw new Error(data.error_message || `Directions request failed: ${data.status}`);
    }

    const route = data.routes?.[0];
    const leg = route?.legs?.[0];

    return {
      summary: route?.summary ?? '',
      polyline: route?.overview_polyline?.points ?? '',
      distanceText: leg?.distance?.text ?? '',
      distanceMeters: leg?.distance?.value ?? 0,
      durationText: leg?.duration?.text ?? '',
      durationSeconds: leg?.duration?.value ?? 0,
      startAddress: leg?.start_address ?? '',
      endAddress: leg?.end_address ?? '',
    };
  }
}

export default new DirectionsService();
