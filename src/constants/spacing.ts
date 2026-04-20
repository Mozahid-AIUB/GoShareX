/**
 * RideShare AIUB — Spacing & Radius System
 */
import { Platform } from 'react-native';

// Base spacing units (4-point grid)
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
} as const;

// Border radius
export const RADIUS = {
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 24,
  FULL: 999,
} as const;

// Pre-composed shadow styles
export const SHADOWS = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
    },
    android: {
      elevation: 2,
    },
  }) as {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  },

  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
    },
    android: {
      elevation: 4,
    },
  }) as {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  },

  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
  }) as {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  },
} as const;
