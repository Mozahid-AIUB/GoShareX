import { MD3LightTheme } from 'react-native-paper';

export const COLORS = {
  primary: '#1B5E20',         // deep green — brand
  primaryLight: '#4CAF50',
  accent: '#FF6F00',          // amber — CTA
  success: '#43A047',
  warning: '#FFA000',
  error: '#E53935',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  // Rider pin colors
  pinMatch: '#43A047',
  pinNoMatch: '#E53935',
  pinInRide: '#9E9E9E',
  // Proximity zones
  zoneInstant: 'rgba(67,160,71,0.15)',
  zoneNormal: 'rgba(255,160,0,0.10)',
} as const;

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    secondary: COLORS.accent,
  },
};
