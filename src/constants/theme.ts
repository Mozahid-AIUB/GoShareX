import { MD3LightTheme } from 'react-native-paper';

export const COLORS = {
  primary: '#0F6BFF',
  primaryLight: '#7CB8FF',
  accent: '#7DE2D1',
  success: '#2FA772',
  warning: '#FFB648',
  error: '#E05353',
  background: '#EEF4FF',
  surface: '#FFFFFF',
  text: '#14213D',
  textSecondary: '#6E7E99',
  border: '#D7E3F8',
  glass: 'rgba(255,255,255,0.72)',
  glassStrong: 'rgba(255,255,255,0.88)',
  pinMatch: '#2FA772',
  pinNoMatch: '#E05353',
  pinInRide: '#95A3BD',
  zoneInstant: 'rgba(47,167,114,0.15)',
  zoneNormal: 'rgba(15,107,255,0.10)',
} as const;

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    secondary: COLORS.accent,
  },
};
