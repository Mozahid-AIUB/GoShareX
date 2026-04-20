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

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = Constants.expoConfig?.extra?.[key] || defaultValue;
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
  firebaseApiKey: 'AIzaSyB6Xce4UW1l1rTcoU8VINQlRgF3Wd5pV5M',
  firebaseAuthDomain: 'rideshare-aiub.firebaseapp.com',
  firebaseProjectId: 'rideshare-aiub',
  firebaseStorageBucket: 'rideshare-aiub.firebasestorage.app',
  firebaseMessagingSenderId: '612454425143',
  firebaseAppId: '1:612454425143:web:b9f88eba7614aecc7115b2',
  firebaseMeasurementId: 'G-4C79S2EWJF',
  googleMapsApiKey: getEnvVar('GOOGLE_MAPS_API_KEY', 'placeholder'),
  appEnv: getEnvVar('APP_ENV', 'development') as 'development' | 'staging' | 'production',
  appVersion: getEnvVar('APP_VERSION', '1.0.0'),
  apiTimeout: getNumberEnvVar('API_TIMEOUT', 30000),
  enableAnalytics: getBooleanEnvVar('ENABLE_ANALYTICS', true),
  enableCrashlytics: getBooleanEnvVar('ENABLE_CRASHLYTICS', true),
  enablePerformanceMonitoring: getBooleanEnvVar('ENABLE_PERFORMANCE_MONITORING', true),
  locationUpdateInterval: getNumberEnvVar('LOCATION_UPDATE_INTERVAL', 5000),
  proximityRadiusMeters: getNumberEnvVar('PROXIMITY_RADIUS_METERS', 30),
  geofenceRadiusMeters: getNumberEnvVar('GEOFENCE_RADIUS_METERS', 100),
  rideConfirmationTimeoutSeconds: getNumberEnvVar('RIDE_CONFIRMATION_TIMEOUT_SECONDS', 30),
  rideWaitingTimeoutMinutes: getNumberEnvVar('RIDE_WAITING_TIMEOUT_MINUTES', 10),
  autoCancelInactiveMinutes: getNumberEnvVar('AUTO_CANCEL_INACTIVE_MINUTES', 5),
  notificationSoundEnabled: getBooleanEnvVar('NOTIFICATION_SOUND_ENABLED', true),
  vibrationEnabled: getBooleanEnvVar('VIBRATION_ENABLED', true),
  highPriorityNotifications: getBooleanEnvVar('HIGH_PRIORITY_NOTIFICATIONS', true),
};

export const validateEnvironment = (): void => {
  if (__DEV__) {
    console.log('✅ Environment configuration loaded');
    console.log(`📱 Environment: ${ENV.appEnv}`);
  }
};

export default ENV;
