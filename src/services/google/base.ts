import ENV from '@/config/env';

type QueryValue = string | number | boolean | null | undefined;

export class GoogleApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'GoogleApiError';
  }
}

export const GOOGLE_API_ENDPOINTS = {
  placesAutocomplete: 'https://maps.googleapis.com/maps/api/place/autocomplete/json',
  placesNearbySearch: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
  directions: 'https://maps.googleapis.com/maps/api/directions/json',
  distanceMatrix: 'https://maps.googleapis.com/maps/api/distancematrix/json',
  routes: 'https://routes.googleapis.com/directions/v2:computeRoutes',
} as const;

export const buildQueryString = (params: Record<string, QueryValue>): string => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    query.append(key, String(value));
  });

  return query.toString();
};

export const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new GoogleApiError(`Google API request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const fetchJson = async <T>(
  url: string,
  init?: RequestInit,
  timeoutMs: number = ENV.apiTimeout
): Promise<T> => {
  const response = await withTimeout(fetch(url, init), timeoutMs);

  if (!response.ok) {
    throw new GoogleApiError(`Google API request failed with status ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
};
