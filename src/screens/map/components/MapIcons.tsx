/**
 * MapIcons — SVG icons for LiveMapScreen.
 * Pure presentational, parameterized by color where needed.
 */

import React from 'react';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

const COLORS = {
  text: '#EEF2FF',
  textSub: '#8892A4',
  primary: '#C084FC',
  amber: '#F59E0B',
  white: '#FFFFFF',
};

export const IconBack = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 12H5M5 12l7 7M5 12l7-7"
      stroke={COLORS.text}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const IconCenter = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <SvgCircle cx="12" cy="12" r="3" stroke={COLORS.primary} strokeWidth="2" />
    <Path
      d="M12 2v4M12 18v4M2 12h4M18 12h4"
      stroke={COLORS.primary}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const IconStar = ({ size = 12 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={COLORS.amber}>
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
);

export const IconChat = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
      stroke={COLORS.white}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const IconClose = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={COLORS.textSub}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </Svg>
);
