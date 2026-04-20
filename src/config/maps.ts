/**
 * RideShare AIUB — Map Configuration
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** AIUB main campus coordinates (used as the map origin) */
export const AIUB_COORDINATES: LatLng = {
  lat: 23.8103,
  lng: 90.4125,
};

/**
 * Approximate destination coordinates — used for geofence checks and
 * map markers.  Authoritative coords are fetched from Firestore on boot;
 * these serve as a local fallback.
 */
export const DESTINATION_COORDINATES: Record<string, LatLng> = {
  Kuril: { lat: 23.824, lng: 90.4274 },
  Badda: { lat: 23.7805, lng: 90.4267 },
  Rampura: { lat: 23.7539, lng: 90.4241 },
  'Notun Bazar': { lat: 23.8157, lng: 90.4328 },
  Gulshan: { lat: 23.7925, lng: 90.4078 },
  Banani: { lat: 23.7937, lng: 90.4066 },
  Uttara: { lat: 23.8759, lng: 90.3795 },
  'Mirpur 10': { lat: 23.806, lng: 90.3688 },
  Farmgate: { lat: 23.758, lng: 90.3908 },
  'Shahbag': { lat: 23.7388, lng: 90.3961 },
};

/**
 * Custom map style JSON.
 * Set to null to use the default Google Maps style.
 * Replace with a Snazzy Maps / Google Cloud Styling Wizard JSON array to customise.
 */
export const MAP_STYLE = null;

/** Default lat/lng delta for MapView region (roughly 500 m zoom) */
export const DEFAULT_DELTA = {
  latitudeDelta: 0.005,
  longitudeDelta: 0.005,
} as const;

/** Radius in metres drawn as the "search zone" circle on the live map */
export const SEARCH_RADIUS_METERS = 500;

/** Minimum movement (metres) that triggers a location update broadcast */
export const LOCATION_DISTANCE_FILTER = 10;

/** Interval (ms) between location broadcasts while actively riding */
export const RIDE_LOCATION_INTERVAL_MS = 5_000;
