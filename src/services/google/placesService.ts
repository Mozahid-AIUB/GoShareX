import ENV from '@/config/env';

import { buildQueryString, fetchJson, GOOGLE_API_ENDPOINTS } from './base';
import osmService from '@/services/osm/osmService';
import { logger } from '@/utils/logger';

// ============================================================
//  🔧 SWITCH: Google চালু/বন্ধ
//  USE_GOOGLE = false  → সবসময় ফ্রি OSM (Photon/OSRM)। Google ছোঁবে না।
//  USE_GOOGLE = true   → আগে Google চেষ্টা, fail করলে OSM fallback।
//  (billing ঠিক হলে শুধু এটা true করলেই Google ফিরে আসবে।)
// ============================================================
const USE_GOOGLE = false;

// Google key আছে ও placeholder নয়? — switch অন থাকলে তবেই Google চেষ্টা করি।
const hasGoogleKey = () =>
  USE_GOOGLE && !!ENV.googlePlacesApiKey && ENV.googlePlacesApiKey !== 'placeholder';

export interface PlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  description: string;
}

interface PlacesAutocompleteResponse {
  predictions: Array<{
    description: string;
    place_id: string;
    structured_formatting?: {
      main_text?: string;
      secondary_text?: string;
    };
  }>;
  status: string;
  error_message?: string;
}

interface PlacesNearbySearchResponse {
  results: Array<{
    place_id: string;
    name: string;
    vicinity?: string;
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
  }>;
  status: string;
  error_message?: string;
}

interface PlaceDetailsResponse {
  result?: {
    place_id?: string;
    name?: string;
    formatted_address?: string;
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
    rating?: number;
    user_ratings_total?: number;
    types?: string[];
    photos?: Array<{ photo_reference: string; width: number; height: number }>;
    opening_hours?: {
      open_now?: boolean;
      weekday_text?: string[];
    };
    international_phone_number?: string;
    website?: string;
  };
  status: string;
  error_message?: string;
}

export interface RichPlaceDetails {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  ratingCount?: number;
  types?: string[];
  photoUrls?: string[];
  openNow?: boolean;
  openingHours?: string[];
  phone?: string;
  website?: string;
}

class PlacesService {
  async autocomplete(params: {
    input: string;
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    sessionToken?: string;
    language?: string;
  }): Promise<PlaceSuggestion[]> {
    // Google key থাকলে আগে Google — fail করলে (billing/REQUEST_DENIED সহ) OSM।
    if (hasGoogleKey()) {
      try {
        const query = buildQueryString({
          input: params.input.trim(),
          key: ENV.googlePlacesApiKey,
          language: params.language ?? 'en',
          sessiontoken: params.sessionToken,
          location:
            params.latitude !== undefined && params.longitude !== undefined
              ? `${params.latitude},${params.longitude}`
              : undefined,
          radius: params.radiusMeters ?? 10000,
        });

        const data = await fetchJson<PlacesAutocompleteResponse>(
          `${GOOGLE_API_ENDPOINTS.placesAutocomplete}?${query}`
        );

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          throw new Error(data.error_message || `Places autocomplete failed: ${data.status}`);
        }

        return (data.predictions ?? []).map((prediction) => ({
          placeId: prediction.place_id,
          description: prediction.description,
          primaryText: prediction.structured_formatting?.main_text ?? prediction.description,
          secondaryText: prediction.structured_formatting?.secondary_text ?? '',
        }));
      } catch (e: any) {
        // Google fail (সাধারণত billing) → OSM fallback। নিচে গড়িয়ে যায়।
        logger.warn('places.autocomplete.google→osm', e?.message ?? String(e));
      }
    }

    // ---- ফ্রি fallback: Photon (OSM) ----
    return osmService.autocomplete({
      input: params.input,
      latitude: params.latitude,
      longitude: params.longitude,
      limit: 8,
    });
  }

  async findNearbyRickshawStands(params: {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    keyword?: string;
  }) {
    if (!ENV.googlePlacesApiKey || ENV.googlePlacesApiKey === 'placeholder') {
      throw new Error('Google Places API key is missing at runtime');
    }

    const query = buildQueryString({
      key: ENV.googlePlacesApiKey,
      location: `${params.latitude},${params.longitude}`,
      radius: params.radiusMeters ?? 300,
      keyword: params.keyword ?? 'rickshaw stand',
    });

    const data = await fetchJson<PlacesNearbySearchResponse>(
      `${GOOGLE_API_ENDPOINTS.placesNearbySearch}?${query}`
    );

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(data.error_message || `Places nearby search failed: ${data.status}`);
    }

    return (data.results ?? []).map((item) => ({
      placeId: item.place_id,
      name: item.name,
      address: item.vicinity ?? '',
      latitude: item.geometry?.location?.lat ?? 0,
      longitude: item.geometry?.location?.lng ?? 0,
    }));
  }

  async getPlaceDetails(params: { placeId: string; language?: string }) {
    // OSM suggestion (osm: দিয়ে শুরু) → Photon দিয়ে coord (Google লাগে না)।
    if (params.placeId.startsWith('osm:')) {
      return osmService.getPlaceDetails(params.placeId);
    }

    if (hasGoogleKey()) {
      try {
        const query = buildQueryString({
          key: ENV.googlePlacesApiKey,
          place_id: params.placeId,
          language: params.language ?? 'en',
          fields: 'place_id,name,formatted_address,geometry',
        });

        const data = await fetchJson<PlaceDetailsResponse>(
          `${GOOGLE_API_ENDPOINTS.placesDetails}?${query}`
        );

        if (data.status !== 'OK' || !data.result?.geometry?.location) {
          throw new Error(data.error_message || `Place details failed: ${data.status}`);
        }

        return {
          placeId: data.result.place_id ?? params.placeId,
          name: data.result.name ?? 'Selected place',
          address: data.result.formatted_address ?? '',
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
        };
      } catch (e: any) {
        logger.warn('places.getPlaceDetails.google', e?.message ?? String(e));
        throw e; // Google place_id OSM দিয়ে resolve হবে না → আসল error দেখাই
      }
    }

    throw new Error('Google Places API key is missing at runtime');
  }

  /**
   * Rich Place Details: photos, hours, rating.
   * Costs more per call than basic getPlaceDetails — use only when user
   * actually views a destination card.
   */
  async getRichDetails(placeId: string, language = 'en'): Promise<RichPlaceDetails | null> {
    if (!ENV.googlePlacesApiKey || ENV.googlePlacesApiKey === 'placeholder') return null;

    const query = buildQueryString({
      key: ENV.googlePlacesApiKey,
      place_id: placeId,
      language,
      fields:
        'place_id,name,formatted_address,geometry,rating,user_ratings_total,types,photos,opening_hours,international_phone_number,website',
    });

    const data = await fetchJson<PlaceDetailsResponse>(
      `${GOOGLE_API_ENDPOINTS.placesDetails}?${query}`,
    );

    const r = data.result;
    const location = r?.geometry?.location;
    if (data.status !== 'OK' || !r || !location) return null;

    const photoUrls = (r.photos ?? []).slice(0, 4).map((p) =>
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${encodeURIComponent(p.photo_reference)}&key=${ENV.googlePlacesApiKey}`,
    );

    return {
      placeId: r.place_id ?? placeId,
      name: r.name ?? 'Selected place',
      address: r.formatted_address ?? '',
      latitude: location.lat,
      longitude: location.lng,
      rating: r.rating,
      ratingCount: r.user_ratings_total,
      types: r.types,
      photoUrls: photoUrls.length ? photoUrls : undefined,
      openNow: r.opening_hours?.open_now,
      openingHours: r.opening_hours?.weekday_text,
      phone: r.international_phone_number,
      website: r.website,
    };
  }
}

export default new PlacesService();
