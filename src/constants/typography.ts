/**
 * RideShare AIUB — Typography Scale
 */
import { TextStyle } from 'react-native';
import { COLORS } from './colors';

type TypographyStyle = Pick<
  TextStyle,
  'fontSize' | 'fontWeight' | 'letterSpacing' | 'lineHeight' | 'color'
>;

export const TYPOGRAPHY: Record<string, TypographyStyle> = {
  h1: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 36,
    color: COLORS.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    color: COLORS.textPrimary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: COLORS.textPrimary,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    color: COLORS.textPrimary,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: COLORS.textPrimary,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: COLORS.textMuted,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 24,
  },
} as const;
