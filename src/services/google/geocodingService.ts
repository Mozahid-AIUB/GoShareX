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

import ENV from '@/config/env';
import { buildQueryString, fetchJson, GoogleApiError } from './base';
import { logger } from '@/utils/logger';

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

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
    if (!ENV.googleMapsApiKey) {
      throw new GoogleApiError('Google Maps API key missing for Geocoding');
    }
    if (!address.trim()) return null;

    const query = buildQueryString({
      address: address.trim(),
      key: ENV.googleMapsApiKey,
      region,
      language: 'en',
    });

    try {
      const data = await fetchJson<GoogleGeocodeResponse>(`${GEOCODE_URL}?${query}`);
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
    if (!ENV.googleMapsApiKey) return null;

    const query = buildQueryString({
      latlng: `${point.latitude},${point.longitude}`,
      key: ENV.googleMapsApiKey,
      language: 'en',
    });

    try {
      const data = await fetchJson<GoogleGeocodeResponse>(`${GEOCODE_URL}?${query}`);
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
