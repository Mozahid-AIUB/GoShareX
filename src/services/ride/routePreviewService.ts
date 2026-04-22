import { getDestinationById, getDestinationByName } from '@/constants/destinations';
import { getPickupPointById, getPickupPointByName } from '@/constants/pickupPoints';
import routesService from '@/services/google/routesService';
import type { RideRoutePreview } from '@/types/ride.types';

import { estimateRouteFare } from './fareService';

const parseDurationSeconds = (duration?: string): number => {
  if (!duration) return 0;

  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

const resolvePickupCoords = (pickup?: string | null) => {
  if (!pickup) return null;
  const point = getPickupPointById(pickup) ?? getPickupPointByName(pickup);
  return point ? { latitude: point.lat, longitude: point.lng } : null;
};

const resolveDestinationCoords = (destination?: string | null) => {
  if (!destination) return null;
  const point = getDestinationById(destination) ?? getDestinationByName(destination);
  return point ? { latitude: point.lat, longitude: point.lng } : null;
};

export async function buildRideRoutePreview(params: {
  pickup?: string | null;
  destination?: string | null;
  fallbackFare?: number;
  riders?: number;
}): Promise<RideRoutePreview | null> {
  const riders = params.riders ?? 2;
  const pickup = params.pickup ?? '';
  const destination = params.destination ?? '';
  const pickupCoords = resolvePickupCoords(params.pickup);
  const destinationCoords = resolveDestinationCoords(params.destination);

  if (!pickup || !destination) {
    return null;
  }

  if (!pickupCoords || !destinationCoords) {
    const soloFare = params.fallbackFare ?? estimateRouteFare(pickup, destination);
    return {
      distanceMeters: 0,
      durationSeconds: 0,
      durationText: 'ETA unavailable',
      soloFare,
      splitFare: Math.ceil(soloFare / riders),
      pricingSource: 'fare_table',
    };
  }

  try {
    const route = await routesService.computeDriveRoute({
      origin: pickupCoords,
      destination: destinationCoords,
    });

    const durationSeconds = parseDurationSeconds(route.duration);
    const soloFare = estimateRouteFare(pickup, destination, route.distanceMeters);

    return {
      distanceMeters: route.distanceMeters,
      durationSeconds,
      durationText: durationSeconds > 0 ? `${Math.max(1, Math.round(durationSeconds / 60))} min` : 'ETA unavailable',
      soloFare,
      splitFare: Math.ceil(soloFare / riders),
      encodedPolyline: route.encodedPolyline,
      pricingSource: 'routes_api',
    };
  } catch {
    const soloFare = params.fallbackFare ?? estimateRouteFare(pickup, destination);
    return {
      distanceMeters: 0,
      durationSeconds: 0,
      durationText: 'ETA unavailable',
      soloFare,
      splitFare: Math.ceil(soloFare / riders),
      pricingSource: 'fare_table',
    };
  }
}
