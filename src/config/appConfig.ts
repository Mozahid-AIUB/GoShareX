export const APP_CONFIG = {
  name: 'RideShare AIUB',
  version: '1.0.0',
  supportEmail: 'support@rideshare-aiub.com',
  
  // AIUB Coordinates
  campus: {
    lat: 23.8103,
    lng: 90.4125,
    name: 'AIUB Campus',
  },
  
  // Ride Settings
  ride: {
    maxWaitingTime: 10, // minutes
    confirmationTimeout: 30, // seconds
    autoStartSpeed: 5, // km/h
    minRating: 1,
    maxRating: 5,
  },
  
  // Location Settings
  location: {
    updateInterval: 5000, // ms
    proximityRadius: 30, // meters
    geofenceRadius: 100, // meters
    accuracyThreshold: 50, // meters
  },
  
  // Notification Settings
  notifications: {
    vibrationPattern: [0, 500, 200, 500],
    soundEnabled: true,
    priorityLevels: {
      low: 'low',
      default: 'default',
      high: 'high',
    },
  },
  
  // Badge Thresholds
  badges: {
    newRider: 0,
    regular: 6,
    trusted: 21,
    elite: 50,
    eliteRating: 4.5,
  },
  
  // Penalty System
  penalties: {
    strikeLimit: 3,
    suspensionDuration: 24, // hours
    noShowThreshold: 5,
  },
};

export default APP_CONFIG;
