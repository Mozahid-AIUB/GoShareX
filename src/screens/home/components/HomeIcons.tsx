/**
 * HomeIcons — Gradient SVG icon set used across HomeScreen.
 * Pure presentational components, no external state.
 */

import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Circle, Path, Rect } from 'react-native-svg';

/** Sunrise / Morning Rush icon */
export const IconSunrise = ({ size = 28 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28">
    <Defs>
      <LinearGradient id="sunriseGrad" x1="0" y1="1" x2="0" y2="0">
        <Stop offset="0" stopColor="#FF8C00" />
        <Stop offset="1" stopColor="#FFD700" />
      </LinearGradient>
      <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FF6B35" />
        <Stop offset="1" stopColor="#FF9B5E" stopOpacity="0.4" />
      </LinearGradient>
    </Defs>
    <Path d="M14 6 L15.2 9.4 L18.8 9.4 L16 11.6 L17.2 15 L14 12.8 L10.8 15 L12 11.6 L9.2 9.4 L12.8 9.4 Z" fill="url(#sunriseGrad)" />
    <Path d="M5 16 Q14 9 23 16" stroke="url(#skyGrad)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <Path d="M2 18 H26" stroke="#FF8C00" strokeWidth="1.5" strokeLinecap="round" />
    <Path d="M14 3 L14 1" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" />
    <Path d="M7 5.5 L5.5 4" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" />
    <Path d="M21 5.5 L22.5 4" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

/** Sun / Mid Morning icon */
export const IconSun = ({ size = 28 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28">
    <Defs>
      <LinearGradient id="sunGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#FFE234" />
        <Stop offset="1" stopColor="#FFA500" />
      </LinearGradient>
    </Defs>
    <Circle cx="14" cy="14" r="5.5" fill="url(#sunGrad)" />
    <Path d="M14 3 L14 5.5M14 22.5 L14 25M3 14 L5.5 14M22.5 14 L25 14" stroke="#FFD700" strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M6.5 6.5 L8.3 8.3M19.7 19.7 L21.5 21.5M21.5 6.5 L19.7 8.3M8.3 19.7 L6.5 21.5" stroke="#FFA500" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

/** Bento box / Lunch icon */
export const IconLunch = ({ size = 28 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28">
    <Defs>
      <LinearGradient id="bentoGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#4CAF50" />
        <Stop offset="1" stopColor="#81C784" />
      </LinearGradient>
      <LinearGradient id="bentoLid" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#66BB6A" />
        <Stop offset="1" stopColor="#388E3C" />
      </LinearGradient>
    </Defs>
    <Rect x="4" y="9" width="20" height="14" rx="3" fill="url(#bentoGrad)" />
    <Rect x="4" y="9" width="20" height="5" rx="2" fill="url(#bentoLid)" />
    <Path d="M4 14 H24" stroke="#2E7D32" strokeWidth="0.8" />
    <Path d="M14 14 L14 23" stroke="#2E7D32" strokeWidth="0.8" />
    <Rect x="10" y="6" width="8" height="3" rx="1.5" fill="#A5D6A7" />
  </Svg>
);

/** Partly cloudy / Afternoon icon */
export const IconAfternoon = ({ size = 28 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28">
    <Defs>
      <LinearGradient id="afternoonSun" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#FFD54F" />
        <Stop offset="1" stopColor="#FF8F00" />
      </LinearGradient>
      <LinearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FFFFFF" />
        <Stop offset="1" stopColor="#E3F2FD" />
      </LinearGradient>
    </Defs>
    <Circle cx="11" cy="11" r="5" fill="url(#afternoonSun)" />
    <Path d="M11 4 L11 3M11 19 L11 18M4 11 L3 11M19 11 L18 11M6.2 6.2 L5.4 5.4M15.8 15.8 L16.6 16.6M15.8 6.2 L16.6 5.4" stroke="#FFB300" strokeWidth="1.4" strokeLinecap="round" />
    <Path d="M10 17 Q10 14 13 14 Q13 12 16 12 Q20 12 20 16 Q22 16 22 19 Q22 22 19 22 L11 22 Q8 22 8 19 Q8 17 10 17 Z" fill="url(#cloudGrad)" stroke="#BBDEFB" strokeWidth="0.5" />
  </Svg>
);

/** City evening / Evening Rush icon */
export const IconEvening = ({ size = 28 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28">
    <Defs>
      <LinearGradient id="eveningGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FF5722" />
        <Stop offset="1" stopColor="#BF360C" />
      </LinearGradient>
      <LinearGradient id="buildingGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#37474F" />
        <Stop offset="1" stopColor="#263238" />
      </LinearGradient>
    </Defs>
    <Path d="M0 14 Q14 4 28 14" fill="url(#eveningGrad)" />
    <Rect x="3" y="14" width="6" height="12" fill="url(#buildingGrad)" />
    <Rect x="11" y="10" width="5" height="16" fill="url(#buildingGrad)" />
    <Rect x="18" y="12" width="7" height="14" fill="url(#buildingGrad)" />
    <Rect x="4.5" y="16" width="1.5" height="1.5" fill="#FFD54F" />
    <Rect x="6.5" y="16" width="1.5" height="1.5" fill="#FFD54F" />
    <Rect x="12" y="12" width="1.5" height="1.5" fill="#FFD54F" />
    <Rect x="14" y="12" width="1.5" height="1.5" fill="#FFD54F" />
    <Rect x="19" y="14" width="1.5" height="1.5" fill="#FFD54F" />
    <Rect x="22" y="14" width="1.5" height="1.5" fill="#FFD54F" />
  </Svg>
);

/** Moon / Night Ride icon */
export const IconMoon = ({ size = 28 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28">
    <Defs>
      <LinearGradient id="moonGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#7C83FD" />
        <Stop offset="1" stopColor="#373FC4" />
      </LinearGradient>
    </Defs>
    <Path d="M18 5 Q10 7 10 14 Q10 21 18 23 Q10 24 6 18 Q2 13 5 7 Q8 2 18 5 Z" fill="url(#moonGrad)" />
    <Circle cx="22" cy="7" r="1" fill="#C5CAE9" />
    <Circle cx="19" cy="3" r="0.7" fill="#E8EAF6" />
    <Circle cx="25" cy="11" r="0.5" fill="#9FA8DA" />
  </Svg>
);

/** Wave hand / Greeting icon */
export const IconWave = ({ size = 22 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 22 22">
    <Defs>
      <LinearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#FFC107" />
        <Stop offset="1" stopColor="#FF8F00" />
      </LinearGradient>
    </Defs>
    <Path d="M7 4 Q8 2 10 3 L15 9 Q16 11 14 12 L13 13 Q15 15 14 17 Q13 20 10 19 L6 16 Q3 14 4 11 L6 8 Q7 6 7 4 Z" fill="url(#waveGrad)" />
    <Path d="M13 6 Q14 4 16 5 L18 9" stroke="#FFB300" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <Path d="M15 7 Q16 5.5 17.5 6.5 L19 10" stroke="#FFB300" strokeWidth="1" fill="none" strokeLinecap="round" />
  </Svg>
);

/** Fire icon (popular) */
export const IconFire = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14">
    <Defs>
      <LinearGradient id="fireGrad" x1="0.5" y1="0" x2="0.5" y2="1">
        <Stop offset="0" stopColor="#FF6B35" />
        <Stop offset="0.5" stopColor="#FF3D00" />
        <Stop offset="1" stopColor="#BF360C" />
      </LinearGradient>
      <LinearGradient id="fireInner" x1="0.5" y1="0" x2="0.5" y2="1">
        <Stop offset="0" stopColor="#FFD740" />
        <Stop offset="1" stopColor="#FF9100" />
      </LinearGradient>
    </Defs>
    <Path d="M7 1 Q8 4 10 5 Q11 7 10 9 Q9 12 7 13 Q5 12 4 9 Q3 7 4 5 Q6 4 7 1 Z" fill="url(#fireGrad)" />
    <Path d="M7 5 Q7.5 7 8 8 Q7.5 10 7 10.5 Q6.5 10 6 8 Q6.5 7 7 5 Z" fill="url(#fireInner)" />
  </Svg>
);

/** Star / Rating icon */
export const IconStar = ({ size = 12, color = '#FFB300' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 12 12">
    <Defs>
      <LinearGradient id="starGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#FFD740" />
        <Stop offset="1" stopColor="#FF8F00" />
      </LinearGradient>
    </Defs>
    <Path d="M6 1 L7.1 4.2 L10.5 4.2 L7.8 6.2 L8.9 9.4 L6 7.4 L3.1 9.4 L4.2 6.2 L1.5 4.2 L4.9 4.2 Z" fill="url(#starGrad)" />
  </Svg>
);

/** Smart brain / AI suggestion icon */
export const IconSmart = ({ size = 18 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 18 18">
    <Defs>
      <LinearGradient id="smartGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#7C4DFF" />
        <Stop offset="1" stopColor="#448AFF" />
      </LinearGradient>
    </Defs>
    <Path d="M9 2 Q12 2 13.5 4 Q15.5 4.5 15.5 7 Q16.5 8 16 10 Q16.5 12 15 13 Q15 15.5 12.5 15.5 L5.5 15.5 Q3 15.5 3 13 Q1.5 12 2 10 Q1.5 8 2.5 7 Q2.5 4.5 4.5 4 Q6 2 9 2 Z" fill="url(#smartGrad)" opacity="0.15" />
    <Path d="M9 2 Q12 2 13.5 4 Q15.5 4.5 15.5 7 Q16.5 8 16 10 Q16.5 12 15 13 Q15 15.5 12.5 15.5 L5.5 15.5 Q3 15.5 3 13 Q1.5 12 2 10 Q1.5 8 2.5 7 Q2.5 4.5 4.5 4 Q6 2 9 2 Z" stroke="url(#smartGrad)" strokeWidth="1.2" fill="none" />
    <Circle cx="6.5" cy="9" r="1" fill="#7C4DFF" />
    <Circle cx="9" cy="8" r="1" fill="#5C6BC0" />
    <Circle cx="11.5" cy="9" r="1" fill="#448AFF" />
    <Path d="M6.5 9 Q9 10 11.5 9" stroke="#7C4DFF" strokeWidth="0.7" fill="none" />
  </Svg>
);

/** Route arrow icon */
export const IconRouteArrow = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14">
    <Defs>
      <LinearGradient id="arrowGrad" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#1A56DB" />
        <Stop offset="1" stopColor="#0EA5E9" />
      </LinearGradient>
    </Defs>
    <Path d="M2 7 L9 7 M7 4 L10 7 L7 10" stroke="url(#arrowGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

/** Car / ride icon for partner */
export const IconCar = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14">
    <Defs>
      <LinearGradient id="carGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#1A56DB" />
        <Stop offset="1" stopColor="#06B6D4" />
      </LinearGradient>
    </Defs>
    <Path d="M3 6 L4.5 3.5 L9.5 3.5 L11 6 L12 6.5 L12 9 L2 9 L2 6.5 Z" fill="url(#carGrad)" />
    <Rect x="4" y="4.5" width="2" height="1.5" rx="0.5" fill="white" opacity="0.7" />
    <Rect x="8" y="4.5" width="2" height="1.5" rx="0.5" fill="white" opacity="0.7" />
    <Circle cx="4.5" cy="9.5" r="1.2" fill="#263238" />
    <Circle cx="4.5" cy="9.5" r="0.6" fill="#90A4AE" />
    <Circle cx="9.5" cy="9.5" r="1.2" fill="#263238" />
    <Circle cx="9.5" cy="9.5" r="0.6" fill="#90A4AE" />
  </Svg>
);

/** Map pin gradient icon */
export const IconMapPin = ({ size = 16, color1 = '#E53935', color2 = '#B71C1C' }: { size?: number; color1?: string; color2?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Defs>
      <LinearGradient id="pinGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={color1} />
        <Stop offset="1" stopColor={color2} />
      </LinearGradient>
    </Defs>
    <Path d="M8 1 Q11.5 1 11.5 5 Q11.5 8 8 14 Q4.5 8 4.5 5 Q4.5 1 8 1 Z" fill="url(#pinGrad)" />
    <Circle cx="8" cy="5.5" r="1.8" fill="white" opacity="0.7" />
  </Svg>
);

/** Live / pulse icon (green dot) */
export const IconLiveDot = ({ size = 10 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 10 10">
    <Defs>
      <LinearGradient id="liveGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#34D399" />
        <Stop offset="1" stopColor="#059669" />
      </LinearGradient>
    </Defs>
    <Circle cx="5" cy="5" r="4" fill="#12B76A" opacity="0.2" />
    <Circle cx="5" cy="5" r="2.5" fill="url(#liveGrad)" />
  </Svg>
);

/** Clock icon gradient */
export const IconClock = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14">
    <Defs>
      <LinearGradient id="clockGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#8E9DC0" />
        <Stop offset="1" stopColor="#4B5A7A" />
      </LinearGradient>
    </Defs>
    <Circle cx="7" cy="7" r="5.5" stroke="url(#clockGrad)" strokeWidth="1.2" fill="none" />
    <Path d="M7 4 L7 7 L9.5 8.5" stroke="url(#clockGrad)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
  </Svg>
);

/** Cash / BDT icon gradient */
export const IconCash = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14">
    <Defs>
      <LinearGradient id="cashGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#34D399" />
        <Stop offset="1" stopColor="#059669" />
      </LinearGradient>
    </Defs>
    <Rect x="1" y="3.5" width="12" height="7" rx="1.5" stroke="url(#cashGrad)" strokeWidth="1.2" fill="none" />
    <Circle cx="7" cy="7" r="2" stroke="url(#cashGrad)" strokeWidth="1" fill="none" />
    <Path d="M3 5.5 H3.5M10.5 5.5 H11M3 8.5 H3.5M10.5 8.5 H11" stroke="#34D399" strokeWidth="1" strokeLinecap="round" />
  </Svg>
);

/** Navigation gradient icon */
export const IconNavigation = ({ size = 13 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 13 13">
    <Defs>
      <LinearGradient id="navGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#1A56DB" />
        <Stop offset="1" stopColor="#06B6D4" />
      </LinearGradient>
    </Defs>
    <Path d="M6.5 1 L12 12 L6.5 9.5 L1 12 Z" fill="url(#navGrad)" />
  </Svg>
);

/** Bell icon gradient */
export const IconBell = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="bellGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#6366F1" />
        <Stop offset="1" stopColor="#8B5CF6" />
      </LinearGradient>
    </Defs>
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="url(#bellGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.73 21a2 2 0 01-3.46 0" stroke="url(#bellGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

/** Check confirmed icon */
export const IconCheck = ({ size = 16 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Defs>
      <LinearGradient id="checkGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#34D399" />
        <Stop offset="1" stopColor="#059669" />
      </LinearGradient>
    </Defs>
    <Circle cx="8" cy="8" r="7" fill="url(#checkGrad)" />
    <Path d="M4.5 8 L6.5 10.5 L11.5 5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

/** Route line dots */
export const IconRouteLine = ({ size = 16 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Defs>
      <LinearGradient id="routeLineGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#1A56DB" />
        <Stop offset="1" stopColor="#06B6D4" />
      </LinearGradient>
    </Defs>
    <Path d="M8 1 L8 15" stroke="url(#routeLineGrad)" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
  </Svg>
);
