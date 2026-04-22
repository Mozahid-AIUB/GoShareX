import ENV from '@/config/env';

import { buildQueryString, fetchJson, GOOGLE_API_ENDPOINTS } from './base';

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

class PlacesService {
  async autocomplete(params: {
    input: string;
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    language?: string;
  }): Promise<PlaceSuggestion[]> {
    const query = buildQueryString({
      input: params.input.trim(),
      key: ENV.googlePlacesApiKey,
      language: params.language ?? 'en',
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
  }

  async findNearbyRickshawStands(params: {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    keyword?: string;
  }) {
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
}

export default new PlacesService();
