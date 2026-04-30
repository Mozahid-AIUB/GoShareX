import ENV from '@/config/env';

import { fetchJson, GOOGLE_API_ENDPOINTS, GoogleApiError } from './base';

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type RouteLocation = {
  location: { latLng: LatLng };
};

export type ComputeRouteRequest = {
  origin: RouteLocation;
  destination: RouteLocation;
  intermediates?: RouteLocation[];
  travelMode: 'DRIVE' | 'BICYCLE' | 'WALK' | 'TWO_WHEELER' | 'TRANSIT';
  routingPreference?:
    | 'ROUTING_PREFERENCE_UNSPECIFIED'
    | 'TRAFFIC_UNAWARE'
    | 'TRAFFIC_AWARE'
    | 'TRAFFIC_AWARE_OPTIMAL';
  computeAlternativeRoutes?: boolean;
  extraComputations?: string[];
  languageCode?: string;
  units?: 'METRIC' | 'IMPERIAL';
};

export type SpeedReadingInterval = {
  startPolylinePointIndex?: number;
  endPolylinePointIndex?: number;
  speed: 'NORMAL' | 'SLOW' | 'TRAFFIC_JAM';
};

type RoutesApiResponse = {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    polyline?: {
      encodedPolyline?: string;
    };
    legs?: Array<{
      distanceMeters?: number;
      duration?: string;
      steps?: Array<{
        distanceMeters?: number;
        staticDuration?: string;
        navigationInstruction?: { instructions?: string };
      }>;
    }>;
    travelAdvisory?: {
      speedReadingIntervals?: SpeedReadingInterval[];
      transitFare?: { currencyCode?: string; units?: string };
    };
  }>;
};

const parseDuration = (value?: string | number): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

class RoutesService {
  async computeRoute(req: ComputeRouteRequest) {
    const fieldMask = [
      'routes.duration',
      'routes.distanceMeters',
      'routes.polyline.encodedPolyline',
      'routes.travelAdvisory.speedReadingIntervals',
      'routes.travelAdvisory.transitFare',
      'routes.legs.steps.navigationInstruction',
      'routes.legs.steps.distanceMeters',
      'routes.legs.steps.staticDuration',
    ].join(',');

    const data = await fetchJson<RoutesApiResponse>(GOOGLE_API_ENDPOINTS.routes, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': ENV.googleRoutesApiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify({
        origin: req.origin,
        destination: req.destination,
        intermediates: req.intermediates,
        travelMode: req.travelMode,
        routingPreference: req.routingPreference ?? 'TRAFFIC_AWARE',
        computeAlternativeRoutes: req.computeAlternativeRoutes ?? false,
        extraComputations: req.extraComputations ?? ['TRAFFIC_ON_POLYLINE'],
        languageCode: req.languageCode ?? 'en-US',
        units: req.units ?? 'METRIC',
      }),
    });

    const route = data.routes?.[0];
    if (!route) {
      return null;
    }

    return {
      distanceMeters: route.distanceMeters ?? 0,
      duration: parseDuration(route.duration),
      polyline: route.polyline
        ? { encodedPolyline: route.polyline.encodedPolyline ?? '' }
        : undefined,
      travelAdvisory: route.travelAdvisory,
      steps:
        route.legs?.[0]?.steps?.map(step => ({
          instruction: step.navigationInstruction?.instructions ?? '',
          distanceMeters: step.distanceMeters ?? 0,
          durationSeconds: parseDuration(step.staticDuration),
        })) ?? [],
    };
  }

  async computeDriveRoute(params: { origin: LatLng; destination: LatLng }) {
    const result = await this.computeRoute({
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
    });

    if (!result) {
      throw new GoogleApiError('Routes API returned no routes');
    }

    return {
      distanceMeters: result.distanceMeters,
      duration: `${result.duration}s`,
      encodedPolyline: result.polyline?.encodedPolyline ?? '',
    };
  }

  async computeAlternativeRoutes(
    req: Omit<ComputeRouteRequest, 'computeAlternativeRoutes'>
  ) {
    return this.computeRoute({ ...req, computeAlternativeRoutes: true });
  }
}

export default new RoutesService();
