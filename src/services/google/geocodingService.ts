/**
 * geocodingService.ts — Google Geocoding API (forward + reverse).
 *
 * Forward: address string -> coords
 * Reverse: coords -> address string
 *
 * Use cases:
 * - User types a destination not in autocomplete -> get coords
 * - Show "you are at X" using current GPS
 */

import { logger } from '@/utils/logger';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase.config';

export type LatLng = { latitude: number; longitude: number };

export type GeocodingResult = {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId: string;
  locationType?: string;
};

type GoogleGeocodeResponse = {
  status: string;
  error_message?: string;
  results?: Array<{
    formatted_address: string;
    place_id: string;
    geometry: {
      location: { lat: number; lng: number };
      location_type?: string;
    };
  }>;
};

class GeocodingService {
  /**
   * Forward geocoding: address string -> coords.
   * Returns first / best match; null if nothing found.
   */
  async geocode(address: string, region = 'bd'): Promise<GeocodingResult | null> {
    if (!address.trim()) return null;

    try {
      const proxy = httpsCallable(functions, 'geocode');
      const result = await proxy({ address: address.trim(), region });
      const data = result.data as GoogleGeocodeResponse;
      if (data.status === 'ZERO_RESULTS') return null;
      if (data.status !== 'OK') {
        logger.warn('geocodingService.geocode', data.error_message ?? data.status);
        return null;
      }
      const r = data.results?.[0];
      if (!r) return null;
      return {
        formattedAddress: r.formatted_address,
        latitude: r.geometry.location.lat,
        longitude: r.geometry.location.lng,
        placeId: r.place_id,
        locationType: r.geometry.location_type,
      };
    } catch (err) {
      logger.error('geocodingService.geocode', err);
      return null;
    }
  }

  /**
   * Reverse geocoding: coords -> human-readable address.
   */
  async reverseGeocode(point: LatLng): Promise<string | null> {
    try {
      const proxy = httpsCallable(functions, 'reverseGeocode');
      const result = await proxy({ lat: point.latitude, lng: point.longitude });
      const data = result.data as GoogleGeocodeResponse;
      if (data.status !== 'OK') {
        logger.warn('geocodingService.reverse', data.error_message ?? data.status);
        return null;
      }
      return data.results?.[0]?.formatted_address ?? null;
    } catch (err) {
      logger.error('geocodingService.reverse', err);
      return null;
    }
  }
}

export default new GeocodingService();
