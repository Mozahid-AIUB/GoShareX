import ENV from '@/config/env';

import { fetchJson, GOOGLE_API_ENDPOINTS } from './base';

type LatLng = {
  latitude: number;
  longitude: number;
};

interface RoutesApiResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    polyline?: {
      encodedPolyline?: string;
    };
  }>;
}

class RoutesService {
  async computeDriveRoute(params: {
    origin: LatLng;
    destination: LatLng;
  }) {
    const data = await fetchJson<RoutesApiResponse>(
      GOOGLE_API_ENDPOINTS.routes,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': ENV.googleRoutesApiKey,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: params.origin.latitude,
                longitude: params.origin.longitude,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: params.destination.latitude,
                longitude: params.destination.longitude,
              },
            },
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
        }),
      }
    );

    const route = data.routes?.[0];
    if (!route) {
      throw new Error('Routes API returned no routes');
    }

    return {
      distanceMeters: route.distanceMeters ?? 0,
      duration: route.duration ?? '',
      encodedPolyline: route.polyline?.encodedPolyline ?? '',
    };
  }
}

export default new RoutesService();
