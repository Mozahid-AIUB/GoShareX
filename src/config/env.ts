/**
 * Environment Configuration
 * Enterprise-grade environment variable management with validation
 * @module config/env
 */

import Constants from 'expo-constants';

interface EnvConfig {
  // Firebase
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
  firebaseMeasurementId?: string;

  // Google Maps
  googleMapsApiKey: string;

  // App
  appEnv: 'development' | 'staging' | 'production';
  appVersion: string;
  apiTimeout: number;

  // Feature Flags
  enableAnalytics: boolean;
  enableCrashlytics: boolean;
  enablePerformanceMonitoring: boolean;

  // Geolocation
  locationUpdateInterval: number;
  proximityRadiusMeters: number;
  geofenceRadiusMeters: number;

  // Ride Settings
  rideConfirmationTimeoutSeconds: number;
  rideWaitingTimeoutMinutes: number;
  autoCancelInactiveMinutes: number;

  // Notifications
  notificationSoundEnabled: boolean;
  vibrationEnabled: boolean;
  highPriorityNotifications: boolean;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = Constants.expoConfig?.extra?.[key] || process.env[key] || defaultValue;
  
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
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
  // Firebase Configuration
  firebaseApiKey: getEnvVar('FIREBASE_API_KEY', ''),
  firebaseAuthDomain: getEnvVar('FIREBASE_AUTH_DOMAIN', ''),
  firebaseProjectId: getEnvVar('FIREBASE_PROJECT_ID', ''),
  firebaseStorageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET', ''),
  firebaseMessagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID', ''),
  firebaseAppId: getEnvVar('FIREBASE_APP_ID', ''),
  firebaseMeasurementId: getEnvVar('FIREBASE_MEASUREMENT_ID', ''),

  // Google Maps
  googleMapsApiKey: getEnvVar('GOOGLE_MAPS_API_KEY', ''),

  // App Configuration
  appEnv: getEnvVar('APP_ENV', 'development') as 'development' | 'staging' | 'production',
  appVersion: getEnvVar('APP_VERSION', '1.0.0'),
  apiTimeout: getNumberEnvVar('API_TIMEOUT', 30000),

  // Feature Flags
  enableAnalytics: getBooleanEnvVar('ENABLE_ANALYTICS', true),
  enableCrashlytics: getBooleanEnvVar('ENABLE_CRASHLYTICS', true),
  enablePerformanceMonitoring: getBooleanEnvVar('ENABLE_PERFORMANCE_MONITORING', true),

  // Geolocation Settings
  locationUpdateInterval: getNumberEnvVar('LOCATION_UPDATE_INTERVAL', 5000),
  proximityRadiusMeters: getNumberEnvVar('PROXIMITY_RADIUS_METERS', 30),
  geofenceRadiusMeters: getNumberEnvVar('GEOFENCE_RADIUS_METERS', 100),

  // Ride Settings
  rideConfirmationTimeoutSeconds: getNumberEnvVar('RIDE_CONFIRMATION_TIMEOUT_SECONDS', 30),
  rideWaitingTimeoutMinutes: getNumberEnvVar('RIDE_WAITING_TIMEOUT_MINUTES', 10),
  autoCancelInactiveMinutes: getNumberEnvVar('AUTO_CANCEL_INACTIVE_MINUTES', 5),

  // Notification Settings
  notificationSoundEnabled: getBooleanEnvVar('NOTIFICATION_SOUND_ENABLED', true),
  vibrationEnabled: getBooleanEnvVar('VIBRATION_ENABLED', true),
  highPriorityNotifications: getBooleanEnvVar('HIGH_PRIORITY_NOTIFICATIONS', true),
};

export const validateEnvironment = (): void => {
  const requiredVars: (keyof EnvConfig)[] = [
    'firebaseApiKey',
    'firebaseProjectId',
    'googleMapsApiKey',
  ];

  const missing = requiredVars.filter(key => !ENV[key]);

  if (missing.length > 0 && ENV.appEnv === 'production') {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and app.json configuration.'
    );
  }

  if (__DEV__) {
    console.log('✅ Environment configuration validated');
    console.log(`📱 Environment: ${ENV.appEnv}`);
    console.log(`🔢 Version: ${ENV.appVersion}`);
  }
};

export default ENV;
