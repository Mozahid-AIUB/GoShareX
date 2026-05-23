/**
 * staticMapService.ts — Google Maps Static API helpers.
 *
 * Returns image URLs (not network calls) — paste directly into <Image source={{ uri }} />.
 * Google bills per signed-URL render, not per generation, so caching the URL string
 * costs nothing; the actual API charge happens when the device fetches the image.
 */

import ENV from '@/config/env';
import { GOOGLE_API_ENDPOINTS } from './base';

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type StaticMapOptions = {
  width?: number;          // px (max 640 free, 2048 premium)
  height?: number;
  zoom?: number;           // 1-20
  scale?: 1 | 2;           // 2 = retina
  mapType?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
};

const DEFAULTS: Required<StaticMapOptions> = {
  width: 600,
  height: 300,
  zoom: 14,
  scale: 2,
  mapType: 'roadmap',
};

function buildBase(opts: StaticMapOptions): string {
  const o = { ...DEFAULTS, ...opts };
  const params = new URLSearchParams({
    size: `${o.width}x${o.height}`,
    scale: String(o.scale),
    maptype: o.mapType,
    key: ENV.googleMapsApiKey,
  });
  return `${GOOGLE_API_ENDPOINTS.staticMap}?${params.toString()}`;
}

/**
 * Generate a static map URL showing a single marker (e.g. pickup point preview).
 */
export function getPinPreviewUrl(point: LatLng, opts: StaticMapOptions = {}): string {
  const base = buildBase(opts);
  const marker = `markers=color:0x6366F1|${point.latitude},${point.longitude}`;
  return `${base}&center=${point.latitude},${point.longitude}&zoom=${opts.zoom ?? DEFAULTS.zoom}&${marker}`;
}

/**
 * Generate a static map URL showing a route between two points with an encoded polyline.
 * Use this for chat ride preview, history thumbnail, share images.
 *
 * @param origin Pickup coords
 * @param destination Drop-off coords
 * @param encodedPolyline (Optional) polyline from Routes/Directions API for accurate path
 */
export function getRoutePreviewUrl(
  origin: LatLng,
  destination: LatLng,
  encodedPolyline?: string,
  opts: StaticMapOptions = {},
): string {
  const base = buildBase(opts);
  const params: string[] = [];

  params.push(`markers=color:0x10B981|label:A|${origin.latitude},${origin.longitude}`);
  params.push(`markers=color:0xEF4444|label:B|${destination.latitude},${destination.longitude}`);

  if (encodedPolyline) {
    params.push(`path=color:0x6366F1ff|weight:4|enc:${encodedPolyline}`);
  } else {
    params.push(
      `path=color:0x6366F1ff|weight:4|${origin.latitude},${origin.longitude}|${destination.latitude},${destination.longitude}`,
    );
  }

  return `${base}&${params.join('&')}`;
}

/**
 * Generate a Street View static image URL for a location.
 */
export function getStreetViewUrl(
  point: LatLng,
  opts: { width?: number; height?: number; heading?: number; pitch?: number; fov?: number } = {},
): string {
  const params = new URLSearchParams({
    size: `${opts.width ?? 600}x${opts.height ?? 300}`,
    location: `${point.latitude},${point.longitude}`,
    heading: String(opts.heading ?? 0),
    pitch: String(opts.pitch ?? 0),
    fov: String(opts.fov ?? 90),
    key: ENV.googleMapsApiKey,
  });
  return `${GOOGLE_API_ENDPOINTS.streetViewStatic}?${params.toString()}`;
}
