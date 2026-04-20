/**
 * Google Maps Configuration
 */

import ENV from './env';

export const MAPS_CONFIG = {
  apiKey: ENV.googleMapsApiKey,
  
  // AIUB Campus Center
  defaultCenter: {
    latitude: 23.8103,
    longitude: 90.4125,
  },
  
  defaultZoom: 16,
  defaultPitch: 0,
  defaultHeading: 0,
  
  // Map Style
  mapStyle: 'standard',
  
  // UI Controls
  controls: {
    myLocation: true,
    compass: true,
    zoom: true,
    mapType: false,
    scale: false,
  },
  
  // Geofence Settings
  geofence: {
    radius: ENV.geofenceRadiusMeters,
    strokeColor: '#1A73E8',
    strokeWidth: 2,
    fillColor: 'rgba(26, 115, 232, 0.1)',
  },
  
  // Proximity Circle
  proximityCircle: {
    radius: ENV.proximityRadiusMeters,
    strokeColor: '#34A853',
    strokeWidth: 2,
    fillColor: 'rgba(52, 168, 83, 0.15)',
    dashPattern: [10, 5],
  },
};

export default MAPS_CONFIG;
