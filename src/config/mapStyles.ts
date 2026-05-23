/**
 * mapStyles.ts — Custom Google Maps style presets.
 *
 * Apply via `<MapView customMapStyle={...} />`.
 * Style schemas designed in Google Cloud Console Map Styling > exported JSON.
 *
 * To create your own: https://mapstyle.withgoogle.com/
 */

export type MapStyleId = 'auto' | 'light' | 'dark' | 'brand';

/** Default Google look. Empty array = use device theme. */
export const STYLE_AUTO: object[] = [];

/** Clean light theme — reduced POIs, soft palette. */
export const STYLE_LIGHT: object[] = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'water', stylers: [{ color: '#e1eef7' }] },
  { featureType: 'landscape', stylers: [{ color: '#fafbff' }] },
];

/** Premium dark theme — like Uber driver app. */
export const STYLE_DARK: object[] = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64779e' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#334e87' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#023e58' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
];

/** GoShareX brand style — indigo/purple accents, minimal POIs. */
export const STYLE_BRAND: object[] = [
  { elementType: 'geometry', stylers: [{ color: '#f8f7ff' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4c4d6e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#e6e3f3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#eef0ff' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#c7c9f5' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#6366f1' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e0e8ff' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#8b8dd8' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#faf8ff' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#e8e4f4' }] },
];

export const MAP_STYLES: Record<MapStyleId, object[]> = {
  auto: STYLE_AUTO,
  light: STYLE_LIGHT,
  dark: STYLE_DARK,
  brand: STYLE_BRAND,
};

export const MAP_STYLE_LABELS: Record<MapStyleId, string> = {
  auto: 'Auto (default)',
  light: 'Light',
  dark: 'Dark',
  brand: 'GoShareX Brand',
};
