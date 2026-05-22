/**
 * VehicleIcons — Gradient SVG vehicle icons for HomeScreen.
 * Pure presentational components.
 */

import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Circle, Path, Rect } from 'react-native-svg';

/** Bangladeshi Rickshaw — 3-wheel pedal rickshaw with canopy */
export const IconRickshaw = ({ size = 32 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Defs>
      <LinearGradient id="rickshawBody" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#F59E0B" />
        <Stop offset="1" stopColor="#D97706" />
      </LinearGradient>
      <LinearGradient id="rickshawCanopy" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#10B981" />
        <Stop offset="1" stopColor="#047857" />
      </LinearGradient>
      <LinearGradient id="rickshawFrame" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#EF4444" />
        <Stop offset="1" stopColor="#B91C1C" />
      </LinearGradient>
      <LinearGradient id="rickshawWheel" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#374151" />
        <Stop offset="1" stopColor="#111827" />
      </LinearGradient>
    </Defs>
    <Circle cx="35" cy="36" r="8" fill="url(#rickshawWheel)" />
    <Circle cx="35" cy="36" r="5" stroke="#6B7280" strokeWidth="1" fill="none" />
    <Circle cx="35" cy="36" r="1.5" fill="#9CA3AF" />
    <Circle cx="11" cy="36" r="6" fill="url(#rickshawWheel)" />
    <Circle cx="11" cy="36" r="3.5" stroke="#6B7280" strokeWidth="1" fill="none" />
    <Circle cx="11" cy="36" r="1.2" fill="#9CA3AF" />
    <Circle cx="43" cy="36" r="5" fill="url(#rickshawWheel)" />
    <Circle cx="43" cy="36" r="3" stroke="#6B7280" strokeWidth="0.8" fill="none" />
    <Path d="M11 30 L15 22 L40 22 L44 28 L44 32 L10 32 Z" fill="url(#rickshawFrame)" />
    <Path d="M20 10 L44 10 L44 22 L20 22 Z" fill="url(#rickshawBody)" />
    <Path d="M18 10 Q31 4 46 8 L46 12 Q33 8 18 14 Z" fill="url(#rickshawCanopy)" />
    <Path d="M24 10 L22 22M30 9 L29 22M36 8.5 L35 22M42 8.8 L41 22" stroke="#065F46" strokeWidth="0.8" opacity="0.6" />
    <Rect x="22" y="17" width="18" height="4" rx="2" fill="#059669" />
    <Path d="M11 24 L15 24 M13 20 L13 24" stroke="url(#rickshawFrame)" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

/** Motorcycle / Bike icon */
export const IconBikeVehicle = ({ size = 32 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Defs>
      <LinearGradient id="bikeBody" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#6366F1" />
        <Stop offset="1" stopColor="#4338CA" />
      </LinearGradient>
      <LinearGradient id="bikeWheel" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#374151" />
        <Stop offset="1" stopColor="#111827" />
      </LinearGradient>
      <LinearGradient id="bikeAccent" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#818CF8" />
        <Stop offset="1" stopColor="#A5B4FC" />
      </LinearGradient>
    </Defs>
    <Circle cx="36" cy="34" r="9" fill="url(#bikeWheel)" />
    <Circle cx="36" cy="34" r="5.5" stroke="#6B7280" strokeWidth="1.2" fill="none" />
    <Circle cx="36" cy="34" r="1.8" fill="#9CA3AF" />
    <Circle cx="12" cy="34" r="9" fill="url(#bikeWheel)" />
    <Circle cx="12" cy="34" r="5.5" stroke="#6B7280" strokeWidth="1.2" fill="none" />
    <Circle cx="12" cy="34" r="1.8" fill="#9CA3AF" />
    <Path d="M12 25 L20 14 L30 14 L36 25" stroke="url(#bikeBody)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M20 25 L36 25" stroke="url(#bikeBody)" strokeWidth="3" strokeLinecap="round" />
    <Path d="M12 25 L20 25" stroke="url(#bikeBody)" strokeWidth="3" strokeLinecap="round" />
    <Path d="M21 14 Q24 12 30 14 L32 22 L19 22 Z" fill="url(#bikeBody)" />
    <Path d="M24 14 Q30 13 36 17 L34 19 Q29 16 24 17 Z" fill="url(#bikeAccent)" />
    <Circle cx="11" cy="20" r="3" fill="#FCD34D" opacity="0.9" />
    <Circle cx="11" cy="20" r="1.5" fill="#FBBF24" />
    <Path d="M8 20 L14 18 M8 20 L8 23" stroke="url(#bikeBody)" strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M36 28 Q42 30 44 32" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" fill="none" />
  </Svg>
);

/** CNG Auto-rickshaw / 3-wheel motorized */
export const IconCNG = ({ size = 32 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Defs>
      <LinearGradient id="cngBody" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#14B8A6" />
        <Stop offset="1" stopColor="#0D9488" />
      </LinearGradient>
      <LinearGradient id="cngRoof" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#0EA5E9" />
        <Stop offset="1" stopColor="#0284C7" />
      </LinearGradient>
      <LinearGradient id="cngWheel" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#374151" />
        <Stop offset="1" stopColor="#111827" />
      </LinearGradient>
      <LinearGradient id="cngWindow" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#BAE6FD" />
        <Stop offset="1" stopColor="#7DD3FC" />
      </LinearGradient>
    </Defs>
    <Circle cx="34" cy="36" r="8" fill="url(#cngWheel)" />
    <Circle cx="34" cy="36" r="5" stroke="#6B7280" strokeWidth="1.2" fill="none" />
    <Circle cx="34" cy="36" r="1.8" fill="#9CA3AF" />
    <Circle cx="42" cy="36" r="5" fill="url(#cngWheel)" />
    <Circle cx="42" cy="36" r="3" stroke="#6B7280" strokeWidth="0.8" fill="none" />
    <Circle cx="12" cy="36" r="7" fill="url(#cngWheel)" />
    <Circle cx="12" cy="36" r="4.5" stroke="#6B7280" strokeWidth="1" fill="none" />
    <Circle cx="12" cy="36" r="1.5" fill="#9CA3AF" />
    <Path d="M8 30 L14 18 L44 18 L46 28 L46 32 L8 32 Z" fill="url(#cngBody)" />
    <Path d="M12 18 Q28 12 46 16 L46 18 L12 18 Z" fill="url(#cngRoof)" />
    <Rect x="15" y="20" width="8" height="6" rx="1.5" fill="url(#cngWindow)" opacity="0.85" />
    <Rect x="26" y="20" width="8" height="6" rx="1.5" fill="url(#cngWindow)" opacity="0.85" />
    <Rect x="37" y="20" width="6" height="6" rx="1.5" fill="url(#cngWindow)" opacity="0.85" />
    <Path d="M8 30 L13 20 L16 20 L12 30 Z" fill="url(#cngWindow)" opacity="0.7" />
    <Circle cx="9" cy="28" r="2.5" fill="#FCD34D" opacity="0.95" />
    <Rect x="24" y="26" width="12" height="5" rx="1.5" fill="#065F46" />
    <Path d="M26 30 Q27 27.5 29 28 Q28 29 29 30 M31 27.5 L31 30 M33 27.5 Q35 27.5 34 29 Q33 30 35 30" stroke="#34D399" strokeWidth="0.9" fill="none" strokeLinecap="round" />
  </Svg>
);
