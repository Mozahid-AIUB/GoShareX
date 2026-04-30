import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Circle, Path, Rect } from 'react-native-svg';
import PremiumIcon from '@/components/common/PremiumIcon';

import { auth } from '@/config/firebase.config';
import { DESTINATIONS } from '@/constants/destinations';
import { getFare, getSplitFare } from '@/constants/fareTable';
import { PICKUP_POINTS, getPickupPointById } from '@/constants/pickupPoints';
import { COLORS } from '@/constants/theme';
import { premiumTheme } from '@/design/premium';
import type { MainTabNavProp } from '@/navigation/types';
import distanceMatrixService from '@/services/google/distanceMatrixService';
import directionsService from '@/services/google/directionsService';
import routesService from '@/services/google/routesService';
import placesService, { type PlaceSuggestion } from '@/services/google/placesService';
import locationService from '@/services/firebase/locationService';
import type { RiderMatch } from '@/services/firebase/matchingService';
import { useRideStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { useNearbyRiders } from '@/hooks/useNearbyRiders';
import { useLocationStore } from '@/store';
import type { RideRequestState } from '@/store/rideStore';
import { VEHICLE_CONFIG, type VehicleType } from '@/store/rideStore';
import { sanitizeSpeedKmh } from '@/utils/locationSpeed';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import PremiumVehicleArt from '@/components/vehicles/PremiumVehicleArt';
import {
  recordSearch,
  getPopularSearches,
  recordPickupUsage,
  getFrequentPickups,
  getMostUsedPickup,
  type SearchEntry,
  type PickupHistoryEntry,
} from '@/services/search/searchHistoryService';


// ─── Design Tokens — light theme matching the S StyleSheet ───────────────────
const D = {
  bg: '#FAF8FF',
  card: '#FFFFFF',
  dark: '#1A1A2E',
  navy: '#10182D',
  primary: '#6366F1',
  primarySoft: 'rgba(99,102,241,0.08)',
  primaryMid: 'rgba(99,102,241,0.2)',
  accent: '#F59E0B',
  accentSoft: 'rgba(245,158,11,0.12)',
  green: '#0D9488',
  greenSoft: 'rgba(13,148,136,0.1)',
  red: '#EF4444',
  redSoft: 'rgba(239,68,68,0.1)',
  amber: '#F59E0B',
  text: '#1A1A2E',
  textSub: '#9896A8',
  textMuted: '#B0AACC',
  border: '#EDE8F5',
  borderStrong: '#D4D7FF',
  shadow: '#6366F1',
  radius: 20,
  radiusSm: 12,
  radiusLg: 28,
};

// ─── Vector Gradient SVG Icons (replacing all emojis) ────────────────────────

/** Sunrise / Morning Rush icon */
const IconSunrise = ({ size = 28 }: { size?: number }) => (
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
const IconSun = ({ size = 28 }: { size?: number }) => (
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
const IconLunch = ({ size = 28 }: { size?: number }) => (
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
const IconAfternoon = ({ size = 28 }: { size?: number }) => (
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
const IconEvening = ({ size = 28 }: { size?: number }) => (
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
const IconMoon = ({ size = 28 }: { size?: number }) => (
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
const IconWave = ({ size = 22 }: { size?: number }) => (
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
const IconFire = ({ size = 14 }: { size?: number }) => (
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
const IconStar = ({ size = 12, color = '#FFB300' }: { size?: number; color?: string }) => (
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
const IconSmart = ({ size = 18 }: { size?: number }) => (
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
const IconRouteArrow = ({ size = 14 }: { size?: number }) => (
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
const IconCar = ({ size = 14 }: { size?: number }) => (
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
const IconMapPin = ({ size = 16, color1 = '#E53935', color2 = '#B71C1C' }: { size?: number; color1?: string; color2?: string }) => (
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
const IconLiveDot = ({ size = 10 }: { size?: number }) => (
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
const IconClock = ({ size = 14 }: { size?: number }) => (
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
const IconCash = ({ size = 14 }: { size?: number }) => (
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
const IconNavigation = ({ size = 13 }: { size?: number }) => (
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
const IconBell = ({ size = 20 }: { size?: number }) => (
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
const IconCheck = ({ size = 16 }: { size?: number }) => (
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
const IconRouteLine = ({ size = 16 }: { size?: number }) => (
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

// ─── Vehicle SVG Icons (gradient, no emoji) ───────────────────────────────────

/** Bangladeshi Rickshaw — 3-wheel pedal rickshaw with canopy */
const IconRickshaw = ({ size = 32 }: { size?: number }) => (
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
    {/* Rear wheel (large) */}
    <Circle cx="35" cy="36" r="8" fill="url(#rickshawWheel)" />
    <Circle cx="35" cy="36" r="5" stroke="#6B7280" strokeWidth="1" fill="none" />
    <Circle cx="35" cy="36" r="1.5" fill="#9CA3AF" />
    {/* Front wheel (smaller) */}
    <Circle cx="11" cy="36" r="6" fill="url(#rickshawWheel)" />
    <Circle cx="11" cy="36" r="3.5" stroke="#6B7280" strokeWidth="1" fill="none" />
    <Circle cx="11" cy="36" r="1.2" fill="#9CA3AF" />
    {/* Third wheel (right side) */}
    <Circle cx="43" cy="36" r="5" fill="url(#rickshawWheel)" />
    <Circle cx="43" cy="36" r="3" stroke="#6B7280" strokeWidth="0.8" fill="none" />
    {/* Frame / chassis */}
    <Path d="M11 30 L15 22 L40 22 L44 28 L44 32 L10 32 Z" fill="url(#rickshawFrame)" />
    {/* Passenger cabin */}
    <Path d="M20 10 L44 10 L44 22 L20 22 Z" fill="url(#rickshawBody)" />
    {/* Canopy top */}
    <Path d="M18 10 Q31 4 46 8 L46 12 Q33 8 18 14 Z" fill="url(#rickshawCanopy)" />
    {/* Canopy stripes */}
    <Path d="M24 10 L22 22M30 9 L29 22M36 8.5 L35 22M42 8.8 L41 22" stroke="#065F46" strokeWidth="0.8" opacity="0.6" />
    {/* Seat */}
    <Rect x="22" y="17" width="18" height="4" rx="2" fill="#059669" />
    {/* Handlebar */}
    <Path d="M11 24 L15 24 M13 20 L13 24" stroke="url(#rickshawFrame)" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

/** Motorcycle / Bike icon */
const IconBikeVehicle = ({ size = 32 }: { size?: number }) => (
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
    {/* Rear wheel */}
    <Circle cx="36" cy="34" r="9" fill="url(#bikeWheel)" />
    <Circle cx="36" cy="34" r="5.5" stroke="#6B7280" strokeWidth="1.2" fill="none" />
    <Circle cx="36" cy="34" r="1.8" fill="#9CA3AF" />
    {/* Front wheel */}
    <Circle cx="12" cy="34" r="9" fill="url(#bikeWheel)" />
    <Circle cx="12" cy="34" r="5.5" stroke="#6B7280" strokeWidth="1.2" fill="none" />
    <Circle cx="12" cy="34" r="1.8" fill="#9CA3AF" />
    {/* Main frame */}
    <Path d="M12 25 L20 14 L30 14 L36 25" stroke="url(#bikeBody)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M20 25 L36 25" stroke="url(#bikeBody)" strokeWidth="3" strokeLinecap="round" />
    <Path d="M12 25 L20 25" stroke="url(#bikeBody)" strokeWidth="3" strokeLinecap="round" />
    {/* Engine/tank */}
    <Path d="M21 14 Q24 12 30 14 L32 22 L19 22 Z" fill="url(#bikeBody)" />
    {/* Seat */}
    <Path d="M24 14 Q30 13 36 17 L34 19 Q29 16 24 17 Z" fill="url(#bikeAccent)" />
    {/* Headlight */}
    <Circle cx="11" cy="20" r="3" fill="#FCD34D" opacity="0.9" />
    <Circle cx="11" cy="20" r="1.5" fill="#FBBF24" />
    {/* Handlebar */}
    <Path d="M8 20 L14 18 M8 20 L8 23" stroke="url(#bikeBody)" strokeWidth="1.8" strokeLinecap="round" />
    {/* Exhaust */}
    <Path d="M36 28 Q42 30 44 32" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" fill="none" />
  </Svg>
);

/** CNG Auto-rickshaw / 3-wheel motorized */
const IconCNG = ({ size = 32 }: { size?: number }) => (
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
    {/* Rear wheel */}
    <Circle cx="34" cy="36" r="8" fill="url(#cngWheel)" />
    <Circle cx="34" cy="36" r="5" stroke="#6B7280" strokeWidth="1.2" fill="none" />
    <Circle cx="34" cy="36" r="1.8" fill="#9CA3AF" />
    {/* Second rear wheel */}
    <Circle cx="42" cy="36" r="5" fill="url(#cngWheel)" />
    <Circle cx="42" cy="36" r="3" stroke="#6B7280" strokeWidth="0.8" fill="none" />
    {/* Front wheel */}
    <Circle cx="12" cy="36" r="7" fill="url(#cngWheel)" />
    <Circle cx="12" cy="36" r="4.5" stroke="#6B7280" strokeWidth="1" fill="none" />
    <Circle cx="12" cy="36" r="1.5" fill="#9CA3AF" />
    {/* Body */}
    <Path d="M8 30 L14 18 L44 18 L46 28 L46 32 L8 32 Z" fill="url(#cngBody)" />
    {/* Roof */}
    <Path d="M12 18 Q28 12 46 16 L46 18 L12 18 Z" fill="url(#cngRoof)" />
    {/* Windows */}
    <Rect x="15" y="20" width="8" height="6" rx="1.5" fill="url(#cngWindow)" opacity="0.85" />
    <Rect x="26" y="20" width="8" height="6" rx="1.5" fill="url(#cngWindow)" opacity="0.85" />
    <Rect x="37" y="20" width="6" height="6" rx="1.5" fill="url(#cngWindow)" opacity="0.85" />
    {/* Front windshield */}
    <Path d="M8 30 L13 20 L16 20 L12 30 Z" fill="url(#cngWindow)" opacity="0.7" />
    {/* Headlight */}
    <Circle cx="9" cy="28" r="2.5" fill="#FCD34D" opacity="0.95" />
    {/* CNG badge */}
    <Rect x="24" y="26" width="12" height="5" rx="1.5" fill="#065F46" />
    <Path d="M26 30 Q27 27.5 29 28 Q28 29 29 30 M31 27.5 L31 30 M33 27.5 Q35 27.5 34 29 Q33 30 35 30" stroke="#34D399" strokeWidth="0.9" fill="none" strokeLinecap="round" />
  </Svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getGreeting = (h: number) => {
  if (h >= 4 && h < 12) return 'Good morning';
  if (h >= 12 && h < 15) return 'Good noon';
  if (h >= 15 && h < 18) return 'Good afternoon';
  return 'Good evening';
};

const LIVE_PARTNER_FEED_ENABLED = true;
const MY_LOCATION_PICKUP_ID = 'current_location';

type TimeContext = {
  label: string;
  icon: React.ReactNode;
  color: string;
  sub: string;
};

const getTimeContext = (h: number): TimeContext => {
  if (h >= 4 && h < 7) return {
    label: 'Early Morning',
    icon: <IconSunrise size={26} />,
    color: D.amber,
    sub: 'Quiet roads | Early starters',
  };
  if (h >= 7 && h < 10) return {
    label: 'Morning Rush',
    icon: <IconSunrise size={26} />,
    color: D.amber,
    sub: 'High demand | Fast partner discovery',
  };
  if (h >= 10 && h < 12) return {
    label: 'Mid Morning',
    icon: <IconSun size={26} />,
    color: D.primary,
    sub: 'Good availability for short rides',
  };
  if (h >= 12 && h < 15) return {
    label: 'Noon',
    icon: <IconLunch size={26} />,
    color: D.green,
    sub: 'Good availability for midday trips',
  };
  if (h >= 15 && h < 18) return {
    label: 'Afternoon',
    icon: <IconAfternoon size={26} />,
    color: D.primary,
    sub: 'Good route overlap for departures',
  };
  if (h >= 18 && h < 21) return {
    label: 'Evening Rush',
    icon: <IconEvening size={26} />,
    color: D.red,
    sub: 'Peak demand | More live riders',
  };
  return {
    label: 'Night Ride',
    icon: <IconMoon size={26} />,
    color: D.navy,
    sub: 'Fewer riders | Clearer route decisions',
  };
};

const fmtDist = (m: number) => (m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`);

type WayPoint = { id: string; label: string; type: 'pickup' | 'stop' | 'destination' };

type RouteDestination = {
  id: string; name: string; subtitle: string;
  soloFare: number; splitFare: number; etaMin: number;
};

// ─── Google API Enhanced Types ────────────────────────────────────────────────
type RouteInfo = {
  distanceMeters: number;
  durationSeconds: number;
  polyline?: string;
  steps?: RouteStep[];
  trafficCondition?: 'NORMAL' | 'SLOW' | 'TRAFFIC_JAM';
};

type RouteStep = {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
};

type DistanceMatrixResult = {
  distanceMeters: number;
  durationSeconds: number;
  durationInTrafficSeconds?: number;
};

type VisiblePartner = {
  id: string;
  name: string;
  rating: number;
  badge: string;
  department?: string;
  destination: string;
  destinationId?: string;
  destinationName: string;
  pickupPoint: string;
  splitFare: number;
  distanceMeters: number;
  etaMinutes: number;
  matchScore: number;
  lat: number;
  lng: number;
  isMatch: boolean;
};

type AppNotification = {
  id: string;
  type: string;
  message?: string;
  read: boolean;
  createdAt?: number;
  toUserId?: string;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated pulsing live dot — now using SVG gradient */
const LiveDot = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        position: 'absolute', width: 14, height: 14, borderRadius: 7,
        backgroundColor: D.green, opacity: 0.25, transform: [{ scale: pulse }],
      }} />
      <IconLiveDot size={10} />
    </View>
  );
};

/** Trust badge chip */
const TrustChip = ({ badge, confirmed }: { badge: string; confirmed?: boolean }) => {
  const cfg =
    confirmed ? { bg: D.greenSoft, text: D.green, icon: 'check-circle' } :
      badge === 'Instant' ? { bg: D.primarySoft, text: D.primary, icon: 'lightning-bolt' } :
        badge === 'Trusted' ? { bg: D.greenSoft, text: D.green, icon: 'shield-check' } :
          badge === 'Elite Rider' ? { bg: '#F3E8FF', text: '#7C3AED', icon: 'star-circle' } :
            { bg: D.border, text: D.textMuted, icon: 'account' };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: cfg.bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
      <MaterialCommunityIcons name={cfg.icon as any} size={11} color={cfg.text} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: cfg.text, letterSpacing: 0.3 }}>{confirmed ? 'Confirmed' : badge}</Text>
    </View>
  );
};

/** Match score ring */
const MatchRing = ({ score }: { score: number }) => {
  const color = score >= 90 ? D.green : score >= 75 ? D.primary : D.accent;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, borderColor: color, backgroundColor: color + '18' }}>
      <Text style={{ fontSize: 13, fontWeight: '800', color }}>{score}</Text>
      <Text style={{ fontSize: 7, color, fontWeight: '700', letterSpacing: 0.3, marginTop: -1 }}>MATCH</Text>
    </View>
  );
};

/** Route waypoint row card (FROM/TO/STOP) */
const RouteCard = ({
  waypoints, onFromPress, onToPress, onAddStop, onSwap, onRemoveStop, elevated,
}: {
  waypoints: WayPoint[];
  onFromPress: () => void;
  onToPress: (idx: number) => void;
  onAddStop: () => void;
  onSwap: () => void;
  onRemoveStop: (idx: number) => void;
  elevated: boolean;
}) => {
  const from = waypoints[0];
  const destinations = waypoints.slice(1);

  return (
    <View style={[S.routeCard, elevated && S.routeCardElevated]}>
      {/* FROM row */}
      <Pressable style={S.routeRow} onPress={onFromPress} android_ripple={{ color: '#EEF2FF' }}>
        <View style={S.routeIconWrapFrom}>
          <MaterialCommunityIcons name="map-marker" size={18} color="#6366F1" />
        </View>
        <View style={S.routeTextWrap}>
          <Text style={S.routeLabelFrom}>FROM</Text>
          <Text
            style={[S.routeRowValue, !from?.label && S.routeRowPlaceholder]}
            numberOfLines={1}
          >
            {from?.label || 'Choose pickup point'}
          </Text>
        </View>
        <View style={S.routeChevronWrap}>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#6366F1" />
        </View>
      </Pressable>

      {/* Divider with swap */}
      <View style={S.routeDividerRow}>
        <View style={S.routeDividerLine} />
        <TouchableOpacity style={S.swapBtn} onPress={onSwap} activeOpacity={0.75}>
          <MaterialCommunityIcons name="swap-vertical" size={16} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* TO / STOP row(s) */}
      {destinations.map((wp, idx) => (
        <View key={wp.id}>
          <Pressable
            style={S.routeRow}
            onPress={() => onToPress(idx + 1)}
            android_ripple={{ color: '#FEF2F2' }}
          >
            <View style={wp.type === 'stop' ? S.routeIconWrapStop : S.routeIconWrapTo}>
              <MaterialCommunityIcons
                name={wp.type === 'stop' ? 'map-marker-plus' : 'flag-checkered'}
                size={18}
                color={wp.type === 'stop' ? '#F59E0B' : '#EF4444'}
              />
            </View>
            <View style={S.routeTextWrap}>
              <Text style={wp.type === 'stop' ? S.routeLabelStop : S.routeLabelTo}>
                {wp.type === 'stop' ? 'STOP' : 'TO'}
              </Text>
              <Text
                style={[S.routeRowValue, !wp.label && S.routeRowPlaceholder]}
                numberOfLines={1}
              >
                {wp.label || 'Where are you going?'}
              </Text>
            </View>
            {destinations.length > 1 && wp.type === 'stop' ? (
              <TouchableOpacity onPress={() => onRemoveStop(idx + 1)} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ) : !wp.label ? (
              <View style={S.searchBadge}>
                <MaterialCommunityIcons name="magnify" size={15} color="#EF4444" />
              </View>
            ) : (
              <View style={S.routeChevronWrap}>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#EF4444" />
              </View>
            )}
          </Pressable>
          {idx < destinations.length - 1 && <View style={S.routeInnerDivider} />}
        </View>
      ))}

      {/* Add stop */}
      <TouchableOpacity style={S.addStopBtn} onPress={onAddStop} activeOpacity={0.8}>
        <MaterialCommunityIcons name="plus-circle-outline" size={16} color="#6366F1" />
        <Text style={S.addStopText}>Add a stop</Text>
      </TouchableOpacity>
    </View>
  );
};

/** Quick destination chip — compact horizontal suggestion pill */
const DestCard = ({
  item, selected, onSelect, rank,
}: {
  item: RouteDestination; selected: boolean; onSelect: () => void; rank: number;
}) => (
  <TouchableOpacity
    style={[S.destChip, selected && S.destChipSelected]}
    onPress={onSelect}
    activeOpacity={0.8}
  >
    {rank === 0 && <IconFire size={11} />}
    <View style={S.destChipInner}>
      <Text style={[S.destChipName, selected && S.destChipNameSelected]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={[S.destChipFare, selected && S.destChipFareSelected]}>
        ৳{item.splitFare} split
      </Text>
    </View>
  </TouchableOpacity>
);

/** Partner card */
const PartnerCard = ({
  partner, requestState, onRequest, onChat,
}: {
  partner: VisiblePartner; requestState: RideRequestState; onRequest: () => void; onChat: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const isConfirmed = requestState === 'confirmed';
  const isPending = requestState === 'pending';

  return (
    <Animated.View style={[S.partnerCard, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} style={{ gap: 0 }}>
        {/* Header */}
        <View style={S.partnerHeader}>
          <View style={S.partnerAvatar}>
            <Text style={S.partnerAvatarText}>{partner.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={S.partnerName}>{partner.name}</Text>
              <TrustChip badge={partner.badge} confirmed={isConfirmed} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <IconStar size={11} />
              <Text style={S.partnerMeta}> {partner.rating?.toFixed(1)}</Text>
            </View>
          </View>
          <MatchRing score={partner.matchScore} />
        </View>

        {/* Info row */}
        <View style={S.partnerInfoRow}>
          <View style={S.partnerInfoItem}>
            <IconMapPin size={14} color1="#8E9DC0" color2="#4B5A7A" />
            <Text style={S.partnerInfoVal}>{fmtDist(partner.distanceMeters)} away</Text>
          </View>
          <View style={S.partnerInfoDivider} />
          <View style={S.partnerInfoItem}>
            <IconClock size={14} />
            <Text style={S.partnerInfoVal}>ETA {partner.etaMinutes} min</Text>
          </View>
          <View style={S.partnerInfoDivider} />
          <View style={S.partnerInfoItem}>
            <IconCash size={14} />
            <Text style={[S.partnerInfoVal, { color: D.green, fontWeight: '700' }]}>BDT {partner.splitFare}</Text>
          </View>
        </View>

        {/* Destination */}
        <View style={S.partnerDest}>
          <IconNavigation size={13} />
          <Text style={S.partnerDestText}>Going to {partner.destinationName}</Text>
        </View>

        {/* Actions */}
        <View style={S.partnerActions}>
          <TouchableOpacity
            style={[
              S.btnRequest,
              isPending && { backgroundColor: D.amber },
              isConfirmed && { backgroundColor: D.green },
            ]}
            onPress={onRequest}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name={isConfirmed ? 'check' : isPending ? 'clock-outline' : 'hand-wave-outline'}
              size={16}
              color="#FFF"
            />
            <Text style={S.btnRequestText}>
              {isConfirmed ? 'Confirmed' : isPending ? 'Pending…' : 'Request'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={S.btnChat} onPress={onChat} activeOpacity={0.82}>
            <MaterialCommunityIcons name="message-text-outline" size={16} color={D.primary} />
            <Text style={S.btnChatText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Animated.View>
  );
};

// ─── PICKUP SELECTOR MODAL ──────────────────────────────────────────────────
const PickupModal = ({
  visible, selected, currentLocation, currentLocationLabel, frequentPickups, onSelect, onClose, onSelectGPS,
}: {
  visible: boolean;
  selected: string;
  currentLocation: { latitude: number; longitude: number } | null;
  currentLocationLabel: string;
  frequentPickups: PickupHistoryEntry[];
  onSelect: (id: string) => void;
  onClose: () => void;
  onSelectGPS: () => Promise<void>;
}) => {
  const [gpsLoading, setGpsLoading] = React.useState(false);
  // IDs of pickup points that appear in frequent list (to avoid duplicate in full list)
  const frequentIds = new Set(frequentPickups.map(f => f.id));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.modalOverlay}>
        <TouchableOpacity style={S.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[S.modalSheet, { maxHeight: '90%' }]}>
          <View style={S.modalHandle} />
          <Text style={S.modalTitle}>Where are you boarding from?</Text>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* ── Live location option ── */}
            <TouchableOpacity
              style={[S.pickupItem, selected === MY_LOCATION_PICKUP_ID && S.pickupItemSelected, gpsLoading && { opacity: 0.7 }]}
              onPress={async () => {
                if (gpsLoading) return;
                setGpsLoading(true);
                try {
                  await onSelectGPS();
                  onClose();
                } finally {
                  setGpsLoading(false);
                }
              }}
              activeOpacity={0.82}
            >
              <View style={[S.pickupIcon, (selected === MY_LOCATION_PICKUP_ID || gpsLoading) && { backgroundColor: D.primary }]}>
                <MaterialCommunityIcons
                  name={gpsLoading ? 'loading' : 'crosshairs-gps'}
                  size={18}
                  color={(selected === MY_LOCATION_PICKUP_ID || gpsLoading) ? '#FFFFFF' : D.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.pickupName, (selected === MY_LOCATION_PICKUP_ID || gpsLoading) && { color: D.primary }]}>
                  {gpsLoading ? 'Getting your location...' : 'My current location'}
                </Text>
                <Text style={S.pickupNameBn}>
                  {gpsLoading
                    ? 'Please wait, fetching GPS...'
                    : currentLocation
                      ? currentLocationLabel
                      : 'Tap to fetch live GPS location'}
                </Text>
              </View>
              {!gpsLoading && selected === MY_LOCATION_PICKUP_ID && (
                <MaterialCommunityIcons name="check-circle" size={20} color={D.primary} />
              )}
              {gpsLoading && (
                <ActivityIndicator size="small" color={D.primary} />
              )}
            </TouchableOpacity>

            {/* ── Frequently used section ── */}
            {frequentPickups.length > 0 && (
              <>
                <View style={S.pickupSectionHeader}>
                  <MaterialCommunityIcons name="history" size={13} color="#9896A8" />
                  <Text style={S.pickupSectionLabel}>Frequently used</Text>
                </View>
                {frequentPickups.map((fp) => (
                  <TouchableOpacity
                    key={fp.id}
                    style={[S.pickupItem, S.pickupItemFrequent, selected === fp.id && S.pickupItemSelected]}
                    onPress={() => { onSelect(fp.id); onClose(); }}
                    activeOpacity={0.82}
                  >
                    <View style={[S.pickupIcon, { backgroundColor: 'rgba(99,102,241,0.08)' }, selected === fp.id && { backgroundColor: D.primary }]}>
                      <MaterialCommunityIcons
                        name="map-marker-check"
                        size={18}
                        color={selected === fp.id ? '#FFFFFF' : D.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[S.pickupName, selected === fp.id && { color: D.primary }]}>{fp.name}</Text>
                      <Text style={S.pickupNameBn}>
                        Used {fp.count} time{fp.count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {selected === fp.id
                      ? <MaterialCommunityIcons name="check-circle" size={20} color={D.primary} />
                      : <View style={S.pickupCountBadge}>
                        <Text style={S.pickupCountText}>{fp.count}×</Text>
                      </View>
                    }
                  </TouchableOpacity>
                ))}
              </>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── DESTINATION SEARCH MODAL ────────────────────────────────────────────────
const DestinationModal = ({
  visible, onClose, onSelect, onSelectSuggestion, onSelectCustomHistory, currentLocation,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: RouteDestination) => void;
  onSelectSuggestion: (item: PlaceSuggestion) => void;
  onSelectCustomHistory: (entry: SearchEntry) => void;
  currentLocation: { latitude: number; longitude: number } | null;
}) => {
  const [query, setQuery] = useState('');
  const [remoteSuggestions, setRemoteSuggestions] = useState<PlaceSuggestion[]>([]);
  const [popularSearches, setPopularSearches] = useState<SearchEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 300);
      // Load popular searches when modal opens
      getPopularSearches(8).then(setPopularSearches).catch(() => { });
    } else {
      setQuery(''); setRemoteSuggestions([]); setError('');
    }
  }, [visible]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setRemoteSuggestions([]); setError(''); setIsSearching(false); return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setIsSearching(true); setError('');
        const res = await placesService.autocomplete({
          input: query,
          latitude: currentLocation?.latitude,
          longitude: currentLocation?.longitude,
          radiusMeters: 15000,
          sessionToken: `session_${Date.now()}`,
        });
        if (!cancelled) setRemoteSuggestions(res.slice(0, 8));
      } catch (e) {
        if (!cancelled) {
          setRemoteSuggestions([]);
          setError('Search unavailable. Check your connection.');
        }
      } finally { if (!cancelled) setIsSearching(false); }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, currentLocation]);

  const handleSelectHistory = (entry: SearchEntry) => {
    recordSearch({ id: entry.id, name: entry.name, lat: entry.lat, lng: entry.lng, placeId: entry.placeId }).catch(() => { });
    // Custom Places entries (lat/lng present) need customDestination set — not just destination id
    if (entry.lat && entry.lng) {
      onSelectCustomHistory(entry);
    } else {
      const dest: RouteDestination = {
        id: entry.id,
        name: entry.name,
        subtitle: `Used ${entry.count} time${entry.count > 1 ? 's' : ''}`,
        soloFare: 0,
        splitFare: 0,
        etaMin: 0,
      };
      onSelect(dest);
    }
    onClose();
  };

  const handleRemote = (s: PlaceSuggestion) => {
    recordSearch({
      id: s.placeId,
      name: s.primaryText,
      subtitle: s.secondaryText,
      placeId: s.placeId,
    }).catch(() => { });

    onSelectSuggestion(s);
    onClose();
  };

  const showHistory = query.trim().length < 2;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.modalOverlay}>
        <TouchableOpacity style={S.modalBackdrop} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <View style={[S.modalSheet, { maxHeight: '88%' }]}>
          <View style={S.modalHandle} />
          <Text style={S.modalTitle}>Where to?</Text>

          <View style={S.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={18} color={D.textMuted} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search destination or address..."
              placeholderTextColor={D.textMuted}
              style={S.searchInput}
              returnKeyType="search"
            />
            {isSearching
              ? <ActivityIndicator size="small" color={D.primary} />
              : query.length > 0
                ? <TouchableOpacity onPress={() => setQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={D.textMuted} />
                </TouchableOpacity>
                : null}
          </View>

          {!!error && <Text style={{ color: COLORS.error, fontSize: 12, marginBottom: 8, fontWeight: '600' }}>{error}</Text>}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Popular / recent searches when no query */}
            {showHistory && popularSearches.length > 0 && (
              <>
                <Text style={S.modalSection}>Popular searches</Text>
                {popularSearches.map((entry, i) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={S.destSearchRow}
                    onPress={() => handleSelectHistory(entry)}
                    activeOpacity={0.82}
                  >
                    <View style={[S.destSearchIcon, i === 0 && { backgroundColor: D.accentSoft }]}>
                      {i === 0 ? <IconFire size={16} /> : <IconClock size={16} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={S.destSearchTitle}>{entry.name}</Text>
                      <Text style={S.destSearchMeta}>
                        {entry.count === 1 ? 'Recently visited' : `Searched ${entry.count} times`}
                      </Text>
                    </View>
                    {i === 0 && (
                      <View style={{ backgroundColor: D.accentSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: D.amber }}>TOP</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Empty state when no history */}
            {showHistory && popularSearches.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <IconSmart size={36} />
                <Text style={{ fontSize: 14, color: D.textSub, marginTop: 12, fontWeight: '600' }}>
                  Start typing to search
                </Text>
                <Text style={{ fontSize: 12, color: D.textMuted, marginTop: 4, textAlign: 'center' }}>
                  Your popular destinations will appear here after your first search
                </Text>
              </View>
            )}

            {/* Remote Google Places results */}
            {!showHistory && remoteSuggestions.length > 0 && (
              <>
                <Text style={S.modalSection}>Search results</Text>
                {remoteSuggestions.map(s => (
                  <TouchableOpacity key={s.placeId} style={S.destSearchRow} onPress={() => handleRemote(s)} activeOpacity={0.82}>
                    <View style={S.destSearchIcon}>
                      <IconMapPin size={16} color1={D.primary} color2="#0D47A1" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={S.destSearchTitle}>{s.primaryText}</Text>
                      <Text style={S.destSearchMeta}>{s.secondaryText || s.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* No results */}
            {!showHistory && !isSearching && remoteSuggestions.length === 0 && !error && (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text style={{ fontSize: 13, color: D.textMuted }}>No results found for "{query}"</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation<MainTabNavProp>();
  const tabBarHeight = useBottomTabBarHeight();
  const {
    destination, customDestination, pickupPoint, setDestination, setCustomDestination, setPickupPoint,
    setPartner, setStatus, requestStates,
    setRequestState, clearRequestState, triggerRouteSearch,
    vehicleType, setVehicleType,
  } = useRideStore();

  // শুধু completed ride এর পরে destination reset করো — normal navigation এ না
  useFocusEffect(
    useCallback(() => {
      const { status } = useRideStore.getState();
      if (status === 'completed') {
        setDestination('');
        setCustomDestination(null);
        setWaypoints([
          { id: 'from', label: '', type: 'pickup' },
          { id: 'to_0', label: '', type: 'destination' },
        ]);
      }
    }, [setDestination, setCustomDestination])
  );

  const lat = useLocationStore((s) => s.latitude);
  const lng = useLocationStore((s) => s.longitude);
  const setLocation = useLocationStore((s) => s.setLocation);
  // Route state
  const [waypoints, setWaypoints] = useState<WayPoint[]>([
    { id: 'from', label: '', type: 'pickup' },
    { id: 'to_0', label: '', type: 'destination' },
  ]);

  const { user: storeUser } = useAuthStore();
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; accuracy?: number; address?: string } | null>(null);
  const [currentLocationLabel, setCurrentLocationLabel] = useState('My current location');
  const [isResolvingCurrentLocation, setIsResolvingCurrentLocation] = useState(false);
  const [elevated, setElevated] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDestModal, setShowDestModal] = useState(false);
  const [activeDestIdx, setActiveDestIdx] = useState(1);
  const [partnerDistances, setPartnerDistances] = useState<Record<string, DistanceMatrixResult>>({});
  const [hasSearchedPassengers, setHasSearchedPassengers] = useState(false);

  // ── New Google API state
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const [trafficLabel, setTrafficLabel] = useState<string | null>(null);
  const [customFareInput, setCustomFareInput] = useState('');
  const [vehicleOpen, setVehicleOpen] = useState(false);

  const [pendingPartner, setPendingPartner] = useState<VisiblePartner | null>(null);
  const [frequentPickups, setFrequentPickups] = useState<PickupHistoryEntry[]>([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 60], outputRange: [1, 0.85], extrapolate: 'clamp' });

  const selectedPickup = pickupPoint ?? '';
  const selectedPickupDetails = useMemo(() => {
    if (selectedPickup === MY_LOCATION_PICKUP_ID) {
      return currentLocation
        ? {
          id: MY_LOCATION_PICKUP_ID,
          name: currentLocationLabel,
          nameBn: 'Live location',
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        }
        : null;
    }
    if (!selectedPickup) return null;
    return getPickupPointById(selectedPickup) ?? null;
  }, [currentLocation, currentLocationLabel, selectedPickup]);
  const selectedPickupLabel = useMemo(
    () =>
      selectedPickup === MY_LOCATION_PICKUP_ID
        ? currentLocationLabel
        : selectedPickupDetails?.name ?? '',
    [currentLocationLabel, selectedPickup, selectedPickupDetails]
  );
  const selectedDestDetails = useMemo(
    () =>
      customDestination
        ? {
          id: customDestination.id,
          name: customDestination.name,
          lat: customDestination.lat,
          lng: customDestination.lng,
          baseFare: 0,
          estimatedTime: 0,
        }
        : DESTINATIONS.find(d => d.id === destination),
    [customDestination, destination]
  );

  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  useEffect(() => {
    // Refresh immediately on mount in case state init ran at different time
    setCurrentHour(new Date().getHours());
    const msUntilNextHour = (60 - new Date().getMinutes()) * 60 * 1000 - new Date().getSeconds() * 1000;
    const timer = setTimeout(() => {
      setCurrentHour(new Date().getHours());
    }, msUntilNextHour);
    return () => clearTimeout(timer);
  }, []);
  const timeCtx  = useMemo(() => getTimeContext(currentHour), [currentHour]);
  const greeting = useMemo(() => getGreeting(currentHour),    [currentHour]);
  useNearbyRiders(destination, LIVE_PARTNER_FEED_ENABLED && !!destination);
  const { nearbyRiders } = useRideStore();

  // Sync route card FROM label — only when user has explicitly chosen a pickup
  useEffect(() => {
    if (!selectedPickup) return;
    setWaypoints(prev => {
      const copy = [...prev];
      copy[0] = { ...copy[0], label: selectedPickupLabel };
      return copy;
    });
  }, [selectedPickup, selectedPickupLabel]);

  // Sync TO label from store
  useEffect(() => {
    if (selectedDestDetails) {
      setWaypoints(prev => {
        const copy = [...prev];
        const toIdx = copy.findIndex(w => w.type === 'destination');
        if (toIdx !== -1) copy[toIdx] = { ...copy[toIdx], label: selectedDestDetails.name };
        return copy;
      });
    }
  }, [selectedDestDetails]);

  useEffect(() => {
    setHasSearchedPassengers(false);
  }, [selectedPickupDetails, selectedDestDetails]);

  // ── Google Routes API: fetch optimised route when pickup + destination set ──
  useEffect(() => {
    const origin =
      selectedPickup === MY_LOCATION_PICKUP_ID
        ? currentLocation
          ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
          : null
        : selectedPickupDetails;

    if (!origin || !selectedDestDetails) {
      setRouteInfo(null);
      return;
    }
    let cancelled = false;
    const fetchRoute = async () => {
      try {
        setIsFetchingRoute(true);
        // Routes API — preferred over Directions for richer traffic + polyline data
        const result = await routesService.computeRoute({
          origin: {
            location: {
              latLng: {
                latitude: origin.lat,
                longitude: origin.lng,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: selectedDestDetails.lat,
                longitude: selectedDestDetails.lng,
              },
            },
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: false,
          extraComputations: ['TRAFFIC_ON_POLYLINE'],
        });
        if (!cancelled && result) {
          setRouteInfo({
            distanceMeters: result.distanceMeters,
            durationSeconds: result.duration,
            polyline: result.polyline?.encodedPolyline,
            trafficCondition: result.travelAdvisory?.speedReadingIntervals?.[0]?.speed ?? 'NORMAL',
          });
          const trafficSpeed = result.travelAdvisory?.speedReadingIntervals?.[0]?.speed;
          if (trafficSpeed === 'TRAFFIC_JAM') setTrafficLabel('Heavy traffic');
          else if (trafficSpeed === 'SLOW') setTrafficLabel('Slow traffic');
          else setTrafficLabel(null);
        }
      } catch (e) {
        // Fallback: Directions API
        try {
          const directions = await directionsService.getDirections({
            origin: `${origin.lat},${origin.lng}`,
            destination: `${selectedDestDetails.lat},${selectedDestDetails.lng}`,
            mode: 'driving',
            departureTime: 'now',
            trafficModel: 'best_guess',
          });
          if (!cancelled && directions?.routes?.[0]) {
            const leg = directions.routes[0].legs[0];
            setRouteInfo({
              distanceMeters: leg.distance.value,
              durationSeconds: leg.duration.value,
              steps: leg.steps.map((s: any) => ({
                instruction: s.html_instructions.replace(/<[^>]+>/g, ''),
                distanceMeters: s.distance.value,
                durationSeconds: s.duration.value,
              })),
            });
          }
        } catch (_) {
          setRouteInfo(null);
        }
      } finally {
        if (!cancelled) setIsFetchingRoute(false);
      }
    };
    fetchRoute();
    return () => { cancelled = true; };
  }, [currentLocation, selectedPickup, selectedPickupDetails, selectedDestDetails]);

  // ── Distance Matrix API: batch compute distances for all visible partners ──
  useEffect(() => {
    if (!currentLocation || !destination || nearbyRiders.length === 0) return;
    let cancelled = false;

    const fetchDistances = async () => {
      try {
        const origins = [`${currentLocation.latitude},${currentLocation.longitude}`];

        // Only include riders that have valid GPS coordinates.
        // Previously, missing lat/lng fell back to the user's own pickup coords,
        // giving wrong distances — e.g. a rider 500m away appearing as 0m.
        const validRiders = nearbyRiders
          .filter(r => r.lat && r.lng)
          .slice(0, 10);

        if (validRiders.length === 0) return;

        const destinations = validRiders.map(r => `${r.lat},${r.lng}`);

        // Distance Matrix API — get walking distances from current user to each rider
        const matrix = await distanceMatrixService.getMatrix({
          origins,
          destinations,
          mode: 'walking',
          units: 'metric',
          departureTime: 'now',
          trafficModel: 'pessimistic',
        });

        const elements = matrix?.rows?.[0]?.elements ?? [];

        if (!cancelled && elements.length > 0) {
          const updates: Record<string, DistanceMatrixResult> = {};
          elements.forEach((el: any, i: number) => {
            const rider = validRiders[i];
            if (!rider || el.status !== 'OK') return;
            updates[rider.uid] = {
              distanceMeters: el.distance?.value ?? 0,
              durationSeconds: el.duration?.value ?? 0,
              durationInTrafficSeconds: el.duration_in_traffic?.value,
            };
          });
          setPartnerDistances(prev => ({ ...prev, ...updates }));
        }
      } catch (_) {
        return;
      }
    };

    fetchDistances();
    return () => { cancelled = true; };
  }, [currentLocation, destination, nearbyRiders, selectedPickupDetails]);

  const visiblePartners = useMemo(() => {
    if (!destination) return [];
    const base = nearbyRiders.length > 0 ? nearbyRiders : [];
    return base
      .filter(r =>
        // isMatch already guarantees: same destination + within radius
        // r.destination === destination alone is NOT enough — pickup point must also match
        // otherwise riders from different pickup points appear as valid partners
        r.isMatch || r.destination === destination
      )
      .map((r): VisiblePartner => {
        const api = partnerDistances[r.uid];
        return {
          id: r.uid,
          name: r.name,
          rating: r.rating,
          badge: r.badge,
          destination: r.destination,
          destinationName: DESTINATIONS.find(d => d.id === r.destination)?.name ?? r.destination,
          pickupPoint: r.pickupPoint,
          splitFare: Math.ceil(getFare(selectedPickup, r.destination) / 2),
          distanceMeters: api?.distanceMeters ?? r.distance ?? 0,
          etaMinutes: api?.durationInTrafficSeconds
            ? Math.max(1, Math.round(api.durationInTrafficSeconds / 60))
            : api?.durationSeconds
              ? Math.max(1, Math.round(api.durationSeconds / 60))
              : 2,
          matchScore: Math.min(100, Math.max(0, Math.round(
            70 +
            (r.rating - 3) * 10 +
            (r.isMatch ? 20 : 0) +
            (r.pickupPoint === selectedPickupLabel ? 10 : 0)
          ))),
          lat: r.lat,
          lng: r.lng,
          isMatch: r.isMatch,
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [destination, nearbyRiders, partnerDistances, selectedPickup, selectedPickupLabel]);

  const refreshExactCurrentLocation = useCallback(async () => {
    setIsResolvingCurrentLocation(true);
    try {
      const ok = await locationService.requestPermissions();
      if (!ok) {
        Alert.alert('Location permission needed', 'Allow location access so we can map your exact current route.');
        return null;
      }

      const loc = await locationService.getFreshCurrentLocation({
        maxAccuracyMeters: 50,
        timeoutMs: 6000,
      });

      if (!loc) {
        Alert.alert('Location unavailable', 'We could not get your live location. Please turn on GPS and try again.');
        return null;
      }

      setCurrentLocation(loc);
      setLocation(
        loc.latitude,
        loc.longitude,
        loc.accuracy,
        sanitizeSpeedKmh(loc.speedMps, loc.accuracy)
      );

      const address = await locationService.reverseGeocode(loc.latitude, loc.longitude);
      if (address?.trim()) {
        setCurrentLocationLabel(address);
        loc.address = address;
      } else {
        loc.address = 'My current location';
        setCurrentLocationLabel('My current location');
      }

      // Low accuracy is silently accepted on background load — only warn when user explicitly taps GPS

      return loc;
    } catch {
      Alert.alert('Location error', 'We could not refresh your exact location right now. Please try again.');
      return null;
    } finally {
      setIsResolvingCurrentLocation(false);
    }
  }, [setLocation]);

  // Derive user name — rerun whenever store or auth user updates
  const userName = useMemo(() => {
    const raw = storeUser?.name?.trim() || auth.currentUser?.displayName?.trim() || '';
    if (!raw) return '';
    return raw.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }, [storeUser?.name, auth.currentUser?.displayName]);

  useEffect(() => {

    // Smart FROM default: most-used pickup point (AIUB campus points only, not GPS)
    getMostUsedPickup().then((top) => {
      if (top && !pickupPoint && top.id !== MY_LOCATION_PICKUP_ID) {
        setPickupPoint(top.id);
        setWaypoints(prev => {
          const copy = [...prev];
          copy[0] = { ...copy[0], label: top.name };
          return copy;
        });
      }
    }).catch(() => { });

    // Smart TO default: intentionally disabled — user must pick destination each session

    // Load frequent pickups for PickupModal suggestion list
    getFrequentPickups(5).then(setFrequentPickups).catch(() => { });

    // GPS runs silently in background — does NOT auto-set FROM
    void refreshExactCurrentLocation().catch(() => setCurrentLocation(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshExactCurrentLocation]);

  // Real-time notifications subscription
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, type: '', read: false, ...d.data() } as AppNotification));
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.read).length);
    }, () => { });
    return unsub;
  }, []);

  // Handlers
  const handleSwap = () => {
    setWaypoints(prev => {
      const copy = [...prev];
      const tmp = copy[0].label;
      copy[0] = { ...copy[0], label: copy[copy.length - 1].label };
      copy[copy.length - 1] = { ...copy[copy.length - 1], label: tmp };
      return copy;
    });
  };

  const handleAddStop = () => {
    setWaypoints(prev => {
      const last = prev[prev.length - 1];
      const stops = prev.slice(1, -1);
      return [
        prev[0],
        ...stops,
        { id: `stop_${Date.now()}`, label: '', type: 'stop' },
        last,
      ];
    });
  };

  const handleRemoveStop = (idx: number) => {
    setWaypoints(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDestSelect = (item: RouteDestination) => {
    setCustomDestination(null);
    setDestination(item.id);
    setWaypoints(prev => {
      const copy = [...prev];
      copy[activeDestIdx] = { ...copy[activeDestIdx], label: item.name };
      return copy;
    });
    recordSearch({ id: item.id, name: item.name }).catch(() => { });
  };

  const handleCustomHistorySelect = (entry: SearchEntry) => {
    const customId = entry.id.startsWith('custom_') ? entry.id : `custom_${entry.id}`;
    setCustomDestination({
      id: customId,
      name: entry.name,
      lat: entry.lat!,
      lng: entry.lng!,
      placeId: entry.placeId,
    });
    setDestination(customId);
    setWaypoints(prev => {
      const copy = [...prev];
      copy[activeDestIdx] = { ...copy[activeDestIdx], label: entry.name };
      return copy;
    });
  };

  const handleSuggestionSelect = async (item: PlaceSuggestion) => {
    try {
      const details = await placesService.getPlaceDetails({ placeId: item.placeId });
      const customId = `custom_${details.placeId}`;

      setCustomDestination({
        id: customId,
        name: details.name,
        lat: details.latitude,
        lng: details.longitude,
        placeId: details.placeId,
        address: details.address,
      });
      setDestination(customId);
      setWaypoints(prev => {
        const copy = [...prev];
        copy[activeDestIdx] = { ...copy[activeDestIdx], label: details.name };
        return copy;
      });
      recordSearch({
        id: customId,
        name: details.name,
        lat: details.latitude,
        lng: details.longitude,
        placeId: details.placeId,
      }).catch(() => { });
    } catch {
      Alert.alert('Destination error', 'We could not lock the exact destination point. Please choose again.');
    }
  };

  const handlePassengerSearch = async () => {
    let livePickupDetails = selectedPickupDetails;

    if (selectedPickup === MY_LOCATION_PICKUP_ID) {
      const freshLocation = await refreshExactCurrentLocation();
      if (!freshLocation) {
        return;
      }

      livePickupDetails = {
        id: MY_LOCATION_PICKUP_ID,
        name: freshLocation.address ?? currentLocationLabel,
        nameBn: 'Live location',
        lat: freshLocation.latitude,
        lng: freshLocation.longitude,
      };
    }

    if (!livePickupDetails) {
      Alert.alert('Select pickup point', 'Tap the FROM field to choose where you\'re boarding from.');
      return;
    }
    if (!selectedDestDetails) {
      Alert.alert('Select destination', 'Tap the TO field to choose where you\'re going.');
      return;
    }

    setPickupPoint(selectedPickup);
    setDestination(selectedDestDetails.id);
    setVehicleType(vehicleType);
    triggerRouteSearch();
    setHasSearchedPassengers(true);
    navigation.navigate('Map');
  };

  const handlePostLater = () => {
    navigation.navigate('Board');
  };

  const buildRiderPayload = (partner: VisiblePartner): import('@/types/ride.types').NearbyRider => ({
    uid: partner.id,
    name: partner.name,
    distance: partner.distanceMeters,
    destination: partner.destination,
    pickupPoint: selectedPickupLabel,
    rating: partner.rating,
    badge: partner.badge,
    lat: partner.lat ?? currentLocation?.latitude ?? selectedPickupDetails?.lat ?? 23.7749,
    lng: partner.lng ?? currentLocation?.longitude ?? selectedPickupDetails?.lng ?? 90.3990,
    isMatch: destination === partner.destination,
  });

  const handleRequest = (partner: VisiblePartner) => {
    setPartner(buildRiderPayload(partner));
    setStatus('waiting');
    setRequestState(partner.id, 'pending');
    setPendingPartner(partner);
  };

  const handleChat = (partner: VisiblePartner) => {
    setPartner(buildRiderPayload(partner));
    setStatus('matched');
    setRequestState(partner.id, 'confirmed');
    setPendingPartner(null);
    navigation.navigate('Chat', { rider: buildRiderPayload(partner), partnerName: partner.name });
  };

  // ── Route info strip label
  const routeEtaLabel = routeInfo
    ? `${Math.max(1, Math.round(routeInfo.durationSeconds / 60))} min | ${(routeInfo.distanceMeters / 1000).toFixed(1)} km`
    : null;

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={D.bg} />

      {/* Route Card — sticky top */}
      {/* Routes API live route strip */}
      {(routeEtaLabel || isFetchingRoute) && (
        <View style={S.routeStrip}>
          <IconRouteLine size={14} />
          {isFetchingRoute ? (
            <Text style={S.routeStripText}>Updating route...</Text>
          ) : (
            <>
              <Text style={S.routeStripText}>{routeEtaLabel}</Text>
              {trafficLabel && (
                <View style={S.trafficBadge}>
                  <Text style={S.trafficBadgeText}>{trafficLabel}</Text>
                </View>
              )}
            </>
          )}
          <TouchableOpacity
            style={{ marginLeft: 'auto' }}
            onPress={() => navigation.navigate('Map')}
            activeOpacity={0.8}
          >
            <View style={S.mapPreviewBtn}>
              <MaterialCommunityIcons name="map-outline" size={13} color={D.primary} />
              <Text style={S.mapPreviewText}>Route + live ETA</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={S.scroll}
        contentContainerStyle={[S.scrollContent, { paddingBottom: tabBarHeight + 32 }]}
        showsVerticalScrollIndicator={false}
        onScroll={e => setElevated(e.nativeEvent.contentOffset.y > 8)}
        scrollEventThrottle={16}
      >
        {/* Header greeting */}
        <Animated.View style={[S.header, { opacity: headerOpacity }]}>
          {/* Left — greeting block */}
          <View style={{ flex: 1 }}>
            {/* Row 1: "Good morning 👋" — big */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={S.greetingLine}>{greeting}</Text>
              <IconWave size={20} />
            </View>
            {/* Row 2: Name — small muted */}
            <Text style={S.greetingName}>{userName}</Text>
            {/* Row 3: Time context label only — no sub */}
            <View style={S.timeCtxRow}>
              <View style={S.timeCtxIconSm}>{timeCtx.icon}</View>
              <Text style={S.timeCtxText}>{timeCtx.label}</Text>
            </View>
          </View>

          {/* Right — bell + LIVE below */}
          <View style={S.headerRight}>
            <TouchableOpacity
              style={S.bellBtn}
              activeOpacity={0.8}
              onPress={() => {
                setShowNotifModal(true);
                notifications.filter((n) => !n.read).forEach((n) => {
                  updateDoc(doc(db, 'notifications', n.id), { read: true }).catch(() => { });
                });
                setUnreadCount(0);
              }}
            >
              <IconBell size={20} />
              {unreadCount > 0 && (
                <View style={S.notifBadge}>
                  <Text style={S.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={S.livePillInline}>
              <LiveDot />
              <Text style={S.liveTextInline}>LIVE</Text>
            </View>
          </View>
        </Animated.View>

        <RouteCard
          waypoints={waypoints}
          elevated={elevated}
          onFromPress={() => setShowPickupModal(true)}
          onToPress={(idx) => { setActiveDestIdx(idx); setShowDestModal(true); }}
          onAddStop={handleAddStop}
          onSwap={handleSwap}
          onRemoveStop={handleRemoveStop}
        />

        {/* ── ETA strip — only when destination selected ── */}
        {selectedDestDetails && routeInfo && (
          <View style={S.etaStrip}>
            <MaterialCommunityIcons name="clock-fast" size={15} color="#14B8A6" />
            <Text style={S.etaText}>
              {Math.max(1, Math.round(routeInfo.durationSeconds / 60))} min
              {' · '}
              {(routeInfo.distanceMeters / 1000).toFixed(1)} km
            </Text>
            {trafficLabel && (
              <View style={S.trafficBadge}>
                <Text style={S.trafficBadgeText}>{trafficLabel}</Text>
              </View>
            )}
            {isFetchingRoute && <ActivityIndicator size={12} color="#14B8A6" style={{ marginLeft: 4 }} />}
          </View>
        )}

        {/* ── Vehicle + Fare + Search ── */}
        {(() => {
          const cfg = VEHICLE_CONFIG[vehicleType];
          const baseFare = selectedDestDetails
            ? getFare(selectedPickup, selectedDestDetails.id)
            : null;
          const suggestedTotal = baseFare
            ? Math.ceil(baseFare * cfg.fareMultiplier)
            : null;
          const splitFare = customFareInput
            ? Math.ceil(parseInt(customFareInput, 10) / 2)
            : suggestedTotal ? Math.ceil(suggestedTotal / 2) : null;

          return (
            <View style={S.bottomFlow}>
              {/* Vehicle selector pill */}
              <TouchableOpacity
                style={S.vehicleSelectedPill}
                activeOpacity={0.85}
                onPress={() => setVehicleOpen(o => !o)}
              >
                <View style={S.vehicleSelectedLeft}>
                  <View style={S.vehicleIconWrap}>
                    <PremiumVehicleArt type={vehicleType} size={36} active />
                  </View>
                  <View>
                    <Text style={S.vehicleSelectedName}>{cfg.label}</Text>
                    <Text style={S.vehicleSelectedDesc}>{cfg.description}</Text>
                  </View>
                </View>
                <View style={S.vehicleSelectedRight}>
                  {splitFare && (
                    <Text style={S.vehicleSelectedFare}>৳{splitFare}/person</Text>
                  )}
                  <MaterialCommunityIcons
                    name={vehicleOpen ? 'chevron-up' : 'chevron-down'}
                    size={20} color="#555"
                  />
                </View>
              </TouchableOpacity>

              {/* Expanded vehicle options */}
              {vehicleOpen && (
                <View style={S.vehicleOptionList}>
                  {(Object.keys(VEHICLE_CONFIG) as VehicleType[]).filter(v => v !== vehicleType).map((v) => {
                    const vc = VEHICLE_CONFIG[v];
                    const active = vehicleType === v;
                    const optTotal = baseFare ? Math.ceil(baseFare * vc.fareMultiplier) : null;
                    return (
                      <TouchableOpacity
                        key={v}
                        style={[S.vehicleOptionRow, active && S.vehicleOptionRowActive]}
                        activeOpacity={0.8}
                        onPress={() => { setVehicleType(v); setVehicleOpen(false); setCustomFareInput(''); }}
                      >
                        <View style={S.vehicleOptionIconWrap}>
                          <PremiumVehicleArt type={v} size={40} active={active} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[S.vehicleOptionName, active && { color: '#6366F1' }]}>{vc.label}</Text>
                          <Text style={S.vehicleOptionDesc}>{vc.description}</Text>
                        </View>
                        {optTotal ? (
                          <View>
                            <Text style={[S.vehicleOptionFare, active && { color: '#6366F1' }]}>
                              ৳{Math.ceil(optTotal / 2)}
                            </Text>
                            <Text style={S.vehicleOptionFareSub}>per person</Text>
                          </View>
                        ) : null}
                        {active && (
                          <MaterialCommunityIcons name="check-circle" size={20} color="#6366F1" style={{ marginLeft: 10 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Fare input — only when destination selected */}
              {selectedDestDetails ? (
                <View style={S.fareInputWrap}>
                  <Text style={S.farePrefix}>৳</Text>
                  <TextInput
                    style={S.fareInput}
                    value={customFareInput}
                    onChangeText={(t) => setCustomFareInput(t.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    placeholder={suggestedTotal ? String(suggestedTotal) : '0'}
                    placeholderTextColor="#B0AACC"
                    maxLength={4}
                    returnKeyType="done"
                  />
                  <Text style={S.fareSuffix}>total</Text>
                  {splitFare ? (
                    <View style={S.farePill}>
                      <Text style={S.farePillText}>৳{splitFare} split</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                /* No destination — show prompt instead of empty fare box */
                <View style={S.fareEmptyHint}>
                  <MaterialCommunityIcons name="map-marker-outline" size={16} color="#9896A8" />
                  <Text style={S.fareEmptyHintText}>Select a destination to set fare</Text>
                </View>
              )}

              {/* Find riders button */}
              <TouchableOpacity
                style={S.searchPassengersBtn}
                activeOpacity={0.88}
                onPress={() => { void handlePassengerSearch(); }}
              >
                <MaterialCommunityIcons name="account-search-outline" size={20} color="#FFF" />
                <Text style={S.searchPassengersText}>Find riders going my way</Text>
              </TouchableOpacity>

              {/* Secondary actions */}
              <View style={S.secondaryRow}>
                <TouchableOpacity style={S.secondaryBtn} activeOpacity={0.8} onPress={handlePostLater}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color="#1A1A2E" />
                  <Text style={S.secondaryBtnText}>Post for later</Text>
                </TouchableOpacity>
                <View style={S.secondaryDivider} />
                <TouchableOpacity style={S.secondaryBtn} activeOpacity={0.8} onPress={() => navigation.navigate('Map')}>
                  <MaterialCommunityIcons name="map-outline" size={16} color="#1A1A2E" />
                  <Text style={S.secondaryBtnText}>Live map</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}




        {/* Live partner feed — show as soon as destination selected */}
        {LIVE_PARTNER_FEED_ENABLED && selectedDestDetails ? (
          <View style={S.section}>
            <View style={S.sectionHeader}>
              <View>
                <Text style={S.sectionTitle}>People on this route</Text>
                <Text style={S.sectionSub}>
                  From {selectedPickupLabel} to {selectedDestDetails.name}
                </Text>
              </View>
              <View style={S.liveCountBadge}>
                <LiveDot />
                <Text style={S.liveCountText}>{visiblePartners.length} live</Text>
              </View>
            </View>

            {visiblePartners.length === 0 ? (
              <View style={S.emptyState}>
                <MaterialCommunityIcons name="account-search-outline" size={40} color={D.border} />
                <Text style={S.emptyTitle}>No one found on this route yet</Text>
                <Text style={S.emptySub}>When someone is going from this pickup to this destination, you can request or chat here.</Text>
              </View>
            ) : (
              visiblePartners.map(p => (
                <PartnerCard
                  key={p.id}
                  partner={p}
                  requestState={requestStates[p.id] ?? 'idle'}
                  onRequest={() =>
                    (requestStates[p.id] ?? 'idle') === 'confirmed'
                      ? handleChat(p)
                      : handleRequest(p)
                  }
                  onChat={() => handleChat(p)}
                />
              ))
            )}

            <TouchableOpacity
              style={S.postRideBtn}
              activeOpacity={0.82}
              onPress={handlePostLater}
            >
              <MaterialCommunityIcons name="plus" size={18} color={D.primary} />
              <Text style={S.postRideText}>Post for 20/30 minutes later</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Modals */}
      <PickupModal
        visible={showPickupModal}
        selected={selectedPickup}
        currentLocation={currentLocation ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude } : null}
        currentLocationLabel={currentLocationLabel}
        frequentPickups={frequentPickups}
        onSelect={(id) => {
          setPickupPoint(id);
          const pt = getPickupPointById(id);
          const label = id === MY_LOCATION_PICKUP_ID ? currentLocationLabel : pt?.name ?? '';
          setWaypoints(prev => {
            const copy = [...prev];
            copy[0] = { ...copy[0], label };
            return copy;
          });
          // Only record fixed AIUB pickup points — never save GPS location to history
          if (id !== MY_LOCATION_PICKUP_ID && pt) {
            recordPickupUsage({
              id,
              name: pt.name,
              nameBn: pt.nameBn,
              lat: pt.lat,
              lng: pt.lng,
            }).then(() => getFrequentPickups(5).then(setFrequentPickups)).catch(() => { });
          }
        }}
        onSelectGPS={async () => {
          // Fresh GPS fetch — runs when user taps "My current location"
          const loc = await refreshExactCurrentLocation();
          if (!loc) return;
          const freshLabel = loc.address ?? currentLocationLabel;
          setPickupPoint(MY_LOCATION_PICKUP_ID);
          setWaypoints(prev => {
            const copy = [...prev];
            copy[0] = { ...copy[0], label: freshLabel };
            return copy;
          });
        }}
        onClose={() => setShowPickupModal(false)}
      />

      <DestinationModal
        visible={showDestModal}
        onClose={() => setShowDestModal(false)}
        onSelect={handleDestSelect}
        onSelectSuggestion={handleSuggestionSelect}
        onSelectCustomHistory={handleCustomHistorySelect}
        currentLocation={currentLocation}
      />

      {/* Request confirmation sheet */}
      <Modal
        visible={!!pendingPartner}
        transparent
        animationType="slide"
        onRequestClose={() => { if (pendingPartner) clearRequestState(pendingPartner.id); setPendingPartner(null); }}
      >
        <View style={S.modalOverlay}>
          <TouchableOpacity
            style={S.modalBackdrop}
            activeOpacity={1}
            onPress={() => { if (pendingPartner) clearRequestState(pendingPartner.id); setPendingPartner(null); }}
          />
          <View style={S.modalSheet}>
            <View style={S.modalHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <View style={[S.partnerAvatar, { width: 52, height: 52, borderRadius: 26 }]}>
                <Text style={[S.partnerAvatarText, { fontSize: 22 }]}>{pendingPartner?.name?.charAt(0)}</Text>
              </View>
              <View>
                <Text style={S.modalTitle}>{pendingPartner?.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <IconStar size={11} />
                  <Text style={S.modalSub}> {pendingPartner?.rating?.toFixed(1)}</Text>
                </View>
              </View>
            </View>

            <View style={S.confirmCard}>
              <View style={S.confirmRow}>
                <IconNavigation size={15} />
                <Text style={S.confirmLabel}>Going to</Text>
                <Text style={S.confirmVal}>{pendingPartner?.destinationName ?? 'Route'}</Text>
              </View>
              <View style={S.confirmRow}>
                <IconClock size={15} />
                <Text style={S.confirmLabel}>ETA meetup</Text>
                <Text style={S.confirmVal}>{pendingPartner?.etaMinutes ?? '--'} min</Text>
              </View>
              {routeInfo && (
                <View style={S.confirmRow}>
                  <MaterialCommunityIcons name="road-variant" size={15} color={D.primary} />
                  <Text style={S.confirmLabel}>Route ETA</Text>
                  <Text style={S.confirmVal}>
                    {Math.max(1, Math.round(routeInfo.durationSeconds / 60))} min · {(routeInfo.distanceMeters / 1000).toFixed(1)} km
                  </Text>
                </View>
              )}
              <View style={S.confirmRow}>
                <IconCash size={15} />
                <Text style={S.confirmLabel}>Split fare</Text>
                <Text style={[S.confirmVal, { color: D.green }]}>
                  BDT {pendingPartner ? getSplitFare(selectedPickup, pendingPartner.destination, 2) : '--'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={S.primaryBtn}
              activeOpacity={0.85}
              onPress={() => pendingPartner && handleChat(pendingPartner)}
            >
              <MaterialCommunityIcons name="message-text-outline" size={18} color="#FFF" />
              <Text style={S.primaryBtnText}>Continue to chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={S.modalSecondaryBtn}
              activeOpacity={0.85}
              onPress={() => { setPendingPartner(null); navigation.navigate('Map'); }}
            >
              <MaterialCommunityIcons name="map-outline" size={18} color={D.text} />
              <Text style={S.modalSecondaryBtnText}>Open live map</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Notifications sheet ── */}
      <Modal visible={showNotifModal} transparent animationType="slide" onRequestClose={() => setShowNotifModal(false)}>
        <View style={S.modalOverlay}>
          <TouchableOpacity style={S.modalBackdrop} activeOpacity={1} onPress={() => setShowNotifModal(false)} />
          <View style={[S.modalSheet, { backgroundColor: '#0C1128', maxHeight: '80%' }]}>
            <View style={[S.modalHandle, { backgroundColor: 'rgba(192,132,252,0.3)' }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#EEF2FF', letterSpacing: -0.3 }}>Notifications</Text>
              {notifications.length > 0 && (
                <TouchableOpacity onPress={() => {
                  notifications.forEach((n) => updateDoc(doc(db, 'notifications', n.id), { read: true }).catch(() => { }));
                }} activeOpacity={0.7}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#C084FC' }}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>
            {notifications.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <PremiumIcon name="bell-ring-outline" size={22} tone="violet" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#EEF2FF', marginTop: 12 }}>No notifications yet</Text>
                <Text style={{ fontSize: 12, color: '#6B7A99', marginTop: 6, textAlign: 'center' }}>
                  You'll get notified when someone joins your ride post
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {notifications.map((n) => (
                  <View key={n.id} style={{
                    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                    backgroundColor: n.read ? 'rgba(255,255,255,0.03)' : 'rgba(192,132,252,0.08)',
                    borderRadius: 14, padding: 14, marginBottom: 8,
                    borderWidth: 1, borderColor: n.read ? 'rgba(255,255,255,0.06)' : 'rgba(192,132,252,0.2)',
                  }}>
                    <PremiumIcon
                      name={n.type === 'post_matched' ? 'party-popper' : n.type === 'post_joined' ? 'hand-wave-outline' : 'bell-ring-outline'}
                      size={14}
                      tone={n.type === 'post_matched' ? 'green' : n.type === 'post_joined' ? 'amber' : 'violet'}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#EEF2FF', lineHeight: 18 }}>
                        {n.message ?? 'New notification'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#6B7A99', marginTop: 4 }}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </Text>
                    </View>
                    {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#C084FC', marginTop: 4 }} />}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // ── Colors (light warm theme) ──
  // BG: #FAF8FF  Card: #FFFFFF  Border: #EDE8F5  Text: #1A1A2E  Sub: #7C7A8E

  safe: { flex: 1, backgroundColor: '#FAF8FF' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  // ── Header ──
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginTop: 8, marginBottom: 20,
  },
  greetingLine: { fontSize: 28, fontWeight: '900', color: '#1A1A2E', letterSpacing: -0.8, lineHeight: 32 },
  greetingName: { fontSize: 13, fontWeight: '500', color: '#9896A8', letterSpacing: 0.1, marginTop: 2 },
  greetingSub: { fontSize: 13, color: '#9896A8', marginTop: 3, fontWeight: '500' },

  livePillInline: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(13,148,136,0.08)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(13,148,136,0.25)',
  },
  liveTextInline: { fontSize: 9, fontWeight: '900', color: '#0D9488', letterSpacing: 1.5 },

  timeCtxRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  timeCtxIconSm: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  timeCtxText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  timeCtxDot: { fontSize: 12, color: '#C4BFDA', fontWeight: '500' },
  timeCtxSub: { fontSize: 12, color: '#9896A8', fontWeight: '400', flex: 1 },

  headerRight: { alignItems: 'center', gap: 6, marginLeft: 12 },
  bellBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#EDE8F5',
    elevation: 3,
    shadowColor: '#6366F1', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  timeCtxIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F3F0FF',
    borderWidth: 1, borderColor: '#EDE8F5',
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#EF4444', borderRadius: 9, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: '#FAF8FF',
  },
  notifBadgeText: { fontSize: 9, fontWeight: '900', color: '#FFFFFF' },

  // ── Route card ──
  routeCard: {
    marginHorizontal: 0, marginVertical: 0, marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14, paddingTop: 6, paddingBottom: 6,
    borderWidth: 1.5, borderColor: '#E8E4F8',
    elevation: 4,
    shadowColor: '#6366F1', shadowOpacity: 0.10, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  routeCardElevated: { borderColor: '#6366F1', borderWidth: 2 },
  routeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 4, gap: 12,
  },
  routeIconWrapFrom: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  routeIconWrapTo: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },
  routeIconWrapStop: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#FFFBEB',
    alignItems: 'center', justifyContent: 'center',
  },
  routeChevronWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#F8F7FF',
    alignItems: 'center', justifyContent: 'center',
  },
  routeTextWrap: { flex: 1 },
  routeLabelFrom: {
    fontSize: 10, fontWeight: '800', color: '#6366F1',
    letterSpacing: 1.4, marginBottom: 2,
  },
  routeLabelTo: {
    fontSize: 10, fontWeight: '800', color: '#EF4444',
    letterSpacing: 1.4, marginBottom: 2,
  },
  routeLabelStop: {
    fontSize: 10, fontWeight: '800', color: '#F59E0B',
    letterSpacing: 1.4, marginBottom: 2,
  },
  routeRowValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  routeRowPlaceholder: { color: '#9CA3AF', fontWeight: '500', fontSize: 14 },
  routeDividerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, marginVertical: 0, gap: 10,
  },
  routeDividerLine: {
    flex: 1, height: 1,
    backgroundColor: '#F0EDF8',
    marginLeft: 50,
  },
  routeInnerDivider: {
    height: 1, backgroundColor: '#F9F8FF', marginHorizontal: 50,
  },
  swapBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#EEF2FF', borderWidth: 1.5, borderColor: '#C7D2FE',
    alignItems: 'center', justifyContent: 'center',
  },
  addStopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 11, paddingHorizontal: 6,
    borderTopWidth: 1, borderTopColor: '#F3F0FC', marginTop: 2,
  },
  addStopText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
  searchBadge: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FECACA',
  },

  // ── Route API strip ──
  routeStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 10, backgroundColor: 'rgba(20,184,166,0.07)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.2)',
  },
  routeStripText: { fontSize: 12, fontWeight: '700', color: '#0D9488' },
  trafficBadge: {
    backgroundColor: 'rgba(244,63,94,0.1)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(244,63,94,0.2)',
  },
  trafficBadgeText: { fontSize: 11, fontWeight: '700', color: '#E11D48' },
  mapPreviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EEF0FF', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: '#D4D7FF',
  },
  mapPreviewText: { fontSize: 11, fontWeight: '700', color: '#6366F1' },

  // ── Context strip ──
  contextStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#EDE8F5',
    elevation: 2, shadowColor: '#6366F1', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  contextLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  contextSub: { fontSize: 12, color: '#9896A8', marginTop: 1 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveText: { fontSize: 10, fontWeight: '900', color: '#0D9488', letterSpacing: 1.2 },

  // ── (compat stubs) ──
  searchFlowCard: { marginBottom: 0 },
  searchFlowGlow: {}, searchFlowHeader: {}, searchFlowEyebrow: {},
  searchFlowEyebrowText: {}, searchFlowStatus: {}, searchFlowStatusText: {},
  searchFlowTitle: {}, searchFlowSub: {}, searchActionRow: {},
  postLaterBtn: {}, postLaterText: {},

  // ── Vehicle selector ──
  vehicleSelectedPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#EDE8F5',
    paddingHorizontal: 16, paddingVertical: 14,
    elevation: 2, shadowColor: '#6366F1', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  vehicleSelectedLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vehicleSelectedEmoji: { fontSize: 28 },
  vehicleIconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  vehicleSelectedName: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  vehicleSelectedDesc: { fontSize: 12, color: '#9896A8', marginTop: 2 },
  vehicleSelectedRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vehicleSelectedFare: { fontSize: 14, fontWeight: '700', color: '#6366F1' },
  vehicleOptionList: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EDE8F5',
    backgroundColor: '#FFFFFF',
    elevation: 3, shadowColor: '#6366F1', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  vehicleOptionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: '#F5F2FC',
  },
  vehicleOptionRowActive: { backgroundColor: '#F3F0FC' },
  vehicleOptionEmoji: { fontSize: 24, width: 30, textAlign: 'center' },
  vehicleOptionIconWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  vehicleOptionName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  vehicleOptionDesc: { fontSize: 12, color: '#B0AACC', marginTop: 2 },
  vehicleOptionFare: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },

  // ── Fare input ──
  fareInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#EDE8F5', paddingHorizontal: 16, height: 58,
    elevation: 2, shadowColor: '#6366F1', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  farePrefix: { fontSize: 22, fontWeight: '700', color: '#6366F1' },
  fareInput: { flex: 1, fontSize: 26, fontWeight: '800', color: '#1A1A2E' },
  fareSuffix: { fontSize: 13, color: '#B0AACC', fontWeight: '600' },
  farePill: {
    backgroundColor: '#EEF0FF', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#D4D7FF',
  },
  farePillText: { fontSize: 12, fontWeight: '700', color: '#6366F1' },
  fareHint: { fontSize: 12, color: '#0D9488', fontWeight: '600' },
  fareEmptyHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F2FC', borderRadius: 14,
    borderWidth: 1, borderColor: '#EDE8F5', paddingHorizontal: 16, height: 48,
  },
  fareEmptyHintText: { fontSize: 13, color: '#B0AACC', fontWeight: '600' },
  vehicleOptionFareSub: { fontSize: 10, color: '#B0AACC', textAlign: 'right', marginTop: 1 },

  // ── ETA strip ──
  etaStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(20,184,166,0.07)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.2)',
  },
  etaText: { fontSize: 13, fontWeight: '700', color: '#0D9488', flex: 1 },

  // ── Bottom flow ──
  bottomFlow: { gap: 10, marginBottom: 16 },
  searchPassengersBtn: {
    height: 58, backgroundColor: '#6366F1', borderRadius: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    elevation: 6, shadowColor: '#6366F1', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  searchPassengersText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  secondaryRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#EDE8F5', overflow: 'hidden',
    elevation: 1, shadowColor: '#6366F1', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  secondaryDivider: { width: 1, height: 22, backgroundColor: '#EDE8F5' },

  // ── Sections ──
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 6, letterSpacing: -0.2 },
  sectionSub: { fontSize: 13, color: '#9896A8', fontWeight: '600', letterSpacing: 0.1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  liveCountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(20,184,166,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.25)',
  },
  liveCountText: { fontSize: 12, fontWeight: '800', color: '#0D9488', letterSpacing: 0.3 },

  // ── Destination chips ──
  destChipRow: { paddingTop: 10, paddingBottom: 6, gap: 10, flexDirection: 'row', paddingHorizontal: 0 },
  destChip: {
    flexDirection: 'column', alignItems: 'flex-start',
    backgroundColor: '#FFFFFF', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#EDE8F5', minWidth: 130,
    elevation: 2, shadowColor: '#6366F1', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  destChipSelected: { borderColor: '#6366F1', backgroundColor: '#F3F0FC' },
  destChipInner: { gap: 1 },
  destChipName: { fontSize: 14, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.2 },
  destChipNameSelected: { color: '#6366F1' },
  destChipFare: { fontSize: 12, fontWeight: '700', color: '#0D9488', marginTop: 6 },
  destChipFareSelected: { color: '#6366F1' },

  // ── Partner card ──
  partnerCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#EDE8F5',
    elevation: 3, shadowColor: '#6366F1', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  partnerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  partnerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#EEF0FF', borderWidth: 2, borderColor: '#D4D7FF',
    alignItems: 'center', justifyContent: 'center',
  },
  partnerAvatarText: { fontSize: 20, fontWeight: '900', color: '#6366F1' },
  partnerName: { fontSize: 17, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.2 },
  partnerMeta: { fontSize: 12, color: '#9896A8', marginTop: 2, fontWeight: '600' },

  partnerInfoRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAF8FF', borderRadius: 14,
    padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#EDE8F5',
  },
  partnerInfoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  partnerInfoVal: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', letterSpacing: 0.2 },
  partnerInfoDivider: { width: 1, height: 18, backgroundColor: '#EDE8F5' },

  partnerDest: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FAF8FF', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12,
  },
  partnerDestText: { fontSize: 13, fontWeight: '600', color: '#4A4860' },

  partnerActions: {
    flexDirection: 'row', gap: 8,
    borderTopWidth: 1, borderTopColor: '#F3F0FC',
    paddingTop: 12, marginTop: 12,
  },
  btnRequest: {
    flex: 1, height: 44, borderRadius: 14, backgroundColor: '#6366F1',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  btnRequestText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  btnChat: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#F3F0FC', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E0D8F8',
  },
  btnChatText: { color: '#6366F1', fontSize: 12, fontWeight: '700' },

  // ── Match score badge ──
  matchBadge: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2.5, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FAF8FF',
  },
  matchNum: { fontSize: 14, fontWeight: '900', letterSpacing: -0.3 },
  matchLbl: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },

  // ── Badge chips ──
  badgeChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 4 },
  badgeElite: { backgroundColor: '#F3EEFF', borderWidth: 0.5, borderColor: '#D4B8FF' },
  badgeTrusted: { backgroundColor: '#E6FAF8', borderWidth: 0.5, borderColor: '#99E6DF' },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  badgeEliteText: { color: '#7C3AED' },
  badgeTrustedText: { color: '#0D9488' },

  // ── Modal styles ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26,26,46,0.4)', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1 },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, maxHeight: '90%',
    borderWidth: 1, borderColor: '#EDE8F5', borderBottomWidth: 0,
  },
  modalHandle: {
    width: 48, height: 5, borderRadius: 2.5,
    backgroundColor: '#E0D8F8', alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1A1A2E', marginBottom: 4, letterSpacing: -0.3 },
  modalSub: { fontSize: 13, color: '#9896A8', marginBottom: 16, fontWeight: '500' },

  // ── Pickup / Destination items ──
  pickupItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAF8FF', borderRadius: 16,
    padding: 14, marginBottom: 10, borderWidth: 1.2,
    borderColor: '#EDE8F5',
  },
  pickupItemSelected: {
    borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(99,102,241,0.08)',
  },
  pickupIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.12)', alignItems: 'center', justifyContent: 'center',
    marginRight: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
  },
  pickupName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  pickupNameBn: { fontSize: 12, color: '#9896A8', fontWeight: '500' },
  pickupItemFrequent: { borderColor: 'rgba(99,102,241,0.15)' },
  pickupSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 2, paddingBottom: 8, paddingTop: 14,
  },
  pickupSectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#9896A8', letterSpacing: 0.6, textTransform: 'uppercase',
  },
  pickupCountBadge: {
    backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
  },
  pickupCountText: { fontSize: 11, fontWeight: '800', color: '#6366F1' },

  // ── Search modal ──
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F3F4F8', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#E0D8F8',
  },
  searchInput: {
    flex: 1, color: '#1A1A2E', fontSize: 15, fontWeight: '500',
    marginHorizontal: 8, paddingVertical: 0,
  },
  modalSection: {
    fontSize: 12, fontWeight: '800', color: '#9896A8', marginBottom: 10, marginTop: 14, letterSpacing: 0.4,
  },
  destSearchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F7FC', borderRadius: 14,
    padding: 14, marginBottom: 8, borderWidth: 1,
    borderColor: '#EDE8F5',
  },
  destSearchIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.1)', alignItems: 'center', justifyContent: 'center',
    marginRight: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.18)',
  },
  destSearchTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  destSearchMeta: { fontSize: 12, color: '#6E7E99', marginTop: 2, fontWeight: '500' },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 32, marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E', marginTop: 12, letterSpacing: -0.2 },
  emptySubtitle: { fontSize: 13, color: '#6E7E99', marginTop: 4, textAlign: 'center', fontWeight: '500' },
  emptySub: { fontSize: 12, color: '#6E7E99', marginTop: 8, textAlign: 'center', fontWeight: '400', lineHeight: 18 },

  // ── Post ride button ──
  postRideBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 8, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: '#6366F1', borderRadius: 14, paddingVertical: 15,
  },
  postRideText: { fontSize: 14, fontWeight: '600', color: '#6366F1' },

  // ── Confirm card ──
  confirmCard: {
    backgroundColor: '#FAF8FF', borderRadius: 16,
    padding: 14, marginBottom: 14, gap: 10,
    borderWidth: 1, borderColor: '#EDE8F5',
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  confirmLabel: { fontSize: 13, color: '#9896A8', flex: 1, fontWeight: '500' },
  confirmVal: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },

  // ── Buttons ──
  primaryBtn: {
    height: 52, backgroundColor: '#6366F1', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 10, borderWidth: 1.5, borderColor: '#6366F1',
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  modalSecondaryBtn: {
    height: 52, backgroundColor: '#F3F4F8', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderColor: '#EDE8F5',
  },
  modalSecondaryBtnText: { color: '#1A1A2E', fontSize: 15, fontWeight: '700' },
});
