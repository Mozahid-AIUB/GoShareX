/**
 * RideShare AIUB — Color Palette
 * Single source of truth for all app colors.
 */

export const COLORS = {
  // Brand
  primary: '#1A73E8',
  primaryDark: '#1557B0',
  primaryLight: '#4A90E2',
  secondary: '#0D47A1',

  // Semantic
  success: '#43A047',
  successLight: '#E8F5E9',
  warning: '#FF8F00',
  warningLight: '#FFF8E1',
  error: '#E53935',
  errorLight: '#FFEBEE',

  // Surface
  surface: '#FFFFFF',
  background: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E8ECF0',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  // Utility
  overlay: 'rgba(0,0,0,0.5)',

  // Map markers
  mapGreen: '#43A047',
  mapRed: '#E53935',
  mapGray: '#9E9E9E',

  // Badge tiers
  gold: '#F9A825',
  silver: '#78909C',
  diamond: '#7B1FA2',
} as const;

export type ColorKey = keyof typeof COLORS;

/**
 * Linear-gradient color pairs.
 * Usage: <LinearGradient colors={GRADIENTS.primary} />
 */
export const GRADIENTS = {
  primary: ['#1A73E8', '#1557B0'],
  success: ['#43A047', '#2E7D32'],
  warning: ['#FF8F00', '#E65100'],
  error: ['#E53935', '#B71C1C'],
  gold: ['#F9A825', '#F57F17'],
  dark: ['#1A1A2E', '#16213E'],
} as const;

export type GradientKey = keyof typeof GRADIENTS;
