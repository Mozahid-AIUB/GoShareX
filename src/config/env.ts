import Constants from 'expo-constants';

interface EnvConfig {
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
  firebaseMeasurementId?: string;
  googleMapsApiKey: string;
  googlePlacesApiKey: string;
  googleRoutesApiKey: string;
  googleDirectionsApiKey: string;
  googleDistanceMatrixApiKey: string;
  appEnv: 'development' | 'staging' | 'production';
  appVersion: string;
  apiTimeout: number;
  enableAnalytics: boolean;
  enableCrashlytics: boolean;
  enablePerformanceMonitoring: boolean;
  locationUpdateInterval: number;
  proximityRadiusMeters: number;
  geofenceRadiusMeters: number;
  rideConfirmationTimeoutSeconds: number;
  rideWaitingTimeoutMinutes: number;
  autoCancelInactiveMinutes: number;
  notificationSoundEnabled: boolean;
  vibrationEnabled: boolean;
  highPriorityNotifications: boolean;
}

const extraConfig =
  (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined) ??
  ((Constants as any).manifest?.extra as Record<string, string | undefined> | undefined) ??
  ((Constants as any).manifest2?.extra as Record<string, string | undefined> | undefined) ??
  {};

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = extraConfig[key] || defaultValue;
  if (!value && defaultValue === undefined) {
    console.warn(`Missing environment variable: ${key}`);
    return '';
  }
  return value as string;
};

const getBooleanEnvVar = (key: string, defaultValue: boolean = false): boolean => {
  const value = getEnvVar(key, defaultValue.toString());
  return value === 'true' || value === '1';
};

const getNumberEnvVar = (key: string, defaultValue: number): number => {
  const value = getEnvVar(key, defaultValue.toString());
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const ENV: EnvConfig = {
  firebaseApiKey: getEnvVar('FIREBASE_API_KEY'),
  firebaseAuthDomain: getEnvVar('FIREBASE_AUTH_DOMAIN'),
  firebaseProjectId: getEnvVar('FIREBASE_PROJECT_ID'),
  firebaseStorageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET'),
  firebaseMessagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
  firebaseAppId: getEnvVar('FIREBASE_APP_ID'),
  firebaseMeasurementId: getEnvVar('FIREBASE_MEASUREMENT_ID', 'optional'),
  googleMapsApiKey: getEnvVar('GOOGLE_MAPS_API_KEY'),
  googlePlacesApiKey: getEnvVar('GOOGLE_PLACES_API_KEY', getEnvVar('GOOGLE_MAPS_API_KEY')),
  googleRoutesApiKey: getEnvVar('GOOGLE_ROUTES_API_KEY', getEnvVar('GOOGLE_MAPS_API_KEY')),
  googleDirectionsApiKey: getEnvVar('GOOGLE_DIRECTIONS_API_KEY', getEnvVar('GOOGLE_MAPS_API_KEY')),
  googleDistanceMatrixApiKey: getEnvVar('GOOGLE_DISTANCE_MATRIX_API_KEY', getEnvVar('GOOGLE_MAPS_API_KEY')),
  appEnv: getEnvVar('APP_ENV', 'development') as 'development' | 'staging' | 'production',
  appVersion: getEnvVar('APP_VERSION', '1.0.0'),
  apiTimeout: getNumberEnvVar('API_TIMEOUT', 30000),
  enableAnalytics: getBooleanEnvVar('ENABLE_ANALYTICS', true),
  enableCrashlytics: getBooleanEnvVar('ENABLE_CRASHLYTICS', true),
  enablePerformanceMonitoring: getBooleanEnvVar('ENABLE_PERFORMANCE_MONITORING', true),
  locationUpdateInterval: getNumberEnvVar('LOCATION_UPDATE_INTERVAL', 5000),
  proximityRadiusMeters: getNumberEnvVar('PROXIMITY_RADIUS_METERS', 200),
  geofenceRadiusMeters: getNumberEnvVar('GEOFENCE_RADIUS_METERS', 100),
  rideConfirmationTimeoutSeconds: getNumberEnvVar('RIDE_CONFIRMATION_TIMEOUT_SECONDS', 30),
  rideWaitingTimeoutMinutes: getNumberEnvVar('RIDE_WAITING_TIMEOUT_MINUTES', 10),
  autoCancelInactiveMinutes: getNumberEnvVar('AUTO_CANCEL_INACTIVE_MINUTES', 5),
  notificationSoundEnabled: getBooleanEnvVar('NOTIFICATION_SOUND_ENABLED', true),
  vibrationEnabled: getBooleanEnvVar('VIBRATION_ENABLED', true),
  highPriorityNotifications: getBooleanEnvVar('HIGH_PRIORITY_NOTIFICATIONS', true),
};

const REQUIRED_KEYS: (keyof EnvConfig)[] = [
  'firebaseApiKey',
  'firebaseAuthDomain',
  'firebaseProjectId',
  'firebaseStorageBucket',
  'firebaseMessagingSenderId',
  'firebaseAppId',
  'googleMapsApiKey',
];

export const validateEnvironment = (): void => {
  const missing = REQUIRED_KEYS.filter((k) => !ENV[k]);
  if (missing.length > 0) {
    const msg = `[GoShareX] Missing required env vars: ${missing.join(', ')}`;
    if (!__DEV__) {
      throw new Error(msg);
    }
    console.error(msg);
  } else if (__DEV__) {
    console.log(`[GoShareX] Env loaded — ${ENV.appEnv} v${ENV.appVersion}`);
  }
};

export default ENV;
