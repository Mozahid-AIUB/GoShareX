/**
 * RideShare AIUB — Notification Constants
 */

export const NOTIFICATION_TYPES = {
  RIDE_REQUEST: 'ride_request',
  RIDE_CONFIRMED: 'ride_confirmed',
  RIDE_CANCELLED: 'ride_cancelled',
  DESTINATION_REACHED: 'destination_reached',
  PARTNER_NOT_RESPONDING: 'partner_not_responding',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/** Android notification channels */
export const NOTIFICATION_CHANNELS = {
  RIDES: {
    id: 'rides',
    name: 'Ride Notifications',
    description: 'Notifications related to your active and upcoming rides',
    importance: 4, // HIGH
    vibration: true,
    sound: true,
  },
  ALERTS: {
    id: 'alerts',
    name: 'App Alerts',
    description: 'General alerts and system notifications',
    importance: 3, // DEFAULT
    vibration: true,
    sound: true,
  },
} as const;

/**
 * Vibration patterns in milliseconds.
 * Format: [wait, vibrate, wait, vibrate, ...]
 */
export const VIBRATION_PATTERNS = {
  /** Three strong pulses — for incoming ride requests */
  strong: [0, 400, 200, 400, 200, 400],
  /** Single pulse — for confirmations */
  normal: [0, 300],
  /** Two medium pulses — for warnings */
  warning: [0, 300, 150, 300],
} as const;

export type VibrationPatternKey = keyof typeof VIBRATION_PATTERNS;
