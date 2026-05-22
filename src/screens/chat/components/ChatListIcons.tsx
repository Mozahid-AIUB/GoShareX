/**
 * ChatListIcons — SVG icons for ChatListScreen.
 */

import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { premiumTheme } from '@/design/premium';

const C = {
  text: premiumTheme.text,
  textSub: premiumTheme.textMuted,
  textMuted: '#343D55',
  white: '#FFFFFF',
  teal: premiumTheme.teal,
  amber: premiumTheme.amber,
  purple: premiumTheme.primaryBright,
};

export const IconSearch = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke={C.textSub} strokeWidth="1.8" />
    <Path d="M21 21l-4.35-4.35" stroke={C.textSub} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

export const IconGhost = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 10h.01M15 10h.01M12 2a9 9 0 00-9 9v10l3-3 2.5 2.5L11 18l1 3 1-3 2.5 2.5L19 21l3 3V11a9 9 0 00-9-9z"
      stroke={C.white}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const IconGroup = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="7" r="4" stroke={C.white} strokeWidth="1.7" />
    <Path d="M3 20c0-4 2.7-7 6-7" stroke={C.white} strokeWidth="1.7" strokeLinecap="round" />
    <Circle cx="17" cy="9" r="3" stroke={C.white} strokeWidth="1.7" />
    <Path d="M21 20c0-3-1.8-5-4-5" stroke={C.white} strokeWidth="1.7" strokeLinecap="round" />
  </Svg>
);

export const IconMessage = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
      stroke={C.white}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const IconChevron = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18l6-6-6-6"
      stroke={C.textMuted}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const IconTimer = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={C.amber} strokeWidth="1.8" />
    <Path d="M12 7v5l3 3" stroke={C.amber} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

export const IconShield = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      stroke={C.purple}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </Svg>
);

export const IconClose = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={C.text} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const IconUsers = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="7" r="4" stroke={C.teal} strokeWidth="1.7" />
    <Path d="M3 20c0-4 2.7-7 6-7" stroke={C.teal} strokeWidth="1.7" strokeLinecap="round" />
    <Circle cx="17" cy="9" r="3" stroke={C.teal} strokeWidth="1.7" />
    <Path d="M21 20c0-3-1.8-5-4-5" stroke={C.teal} strokeWidth="1.7" strokeLinecap="round" />
  </Svg>
);

export const IconPlus = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={C.white} strokeWidth="2.2" strokeLinecap="round" />
  </Svg>
);

export const IconLock = ({
  size = 12,
  color = '#94A3B8',
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="2" />
    <Path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const IconGhostSm = ({
  size = 12,
  color = '#94A3B8',
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 10h.01M15 10h.01M12 2a9 9 0 00-9 9v10l3-3 2.5 2.5L11 18l1 3 1-3 2.5 2.5L19 21l3 3V11a9 9 0 00-9-9z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const IconTrash = ({
  size = 12,
  color = '#94A3B8',
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
