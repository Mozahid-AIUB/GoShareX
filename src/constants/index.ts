export * from './fareTable';
export * from './destinations';
export * from './pickupPoints';
export * from './colors';
export * from './routes';

// App-wide constants
export const PROXIMITY_RADIUS_METERS = 30;
export const PROXIMITY_ALERT_RADIUS = 100;
export const LOCATION_UPDATE_INTERVAL_MS = 5000;
export const RIDE_REQUEST_TIMEOUT_SECONDS = 30;
export const RIDE_CONFIRM_TIMER_MINUTES = 10;
export const POST_EXPIRE_MINUTES = 30;
export const MAX_RIDERS_PER_RIDE = 3;
export const CANCELLATION_STRIKE_LIMIT = 3;
export const SUSPENSION_HOURS = 24;
export const AIUB_EMAIL_DOMAIN = '@aiub.edu.bd';
export const MIN_SPEED_FOR_RIDE_START_KMH = 5;
