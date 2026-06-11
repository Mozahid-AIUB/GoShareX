/**
 * homeHelpers — Pure helpers and shared types for HomeScreen.
 */

import React from 'react';
import {
  IconSunrise,
  IconSun,
  IconLunch,
  IconAfternoon,
  IconEvening,
  IconMoon,
} from '../components/HomeIcons';

// ─── Design tokens (mirrors local D in HomeScreen) ───────────────────────────
const COLORS = {
  amber: '#F59E0B',
  primary: '#6366F1',
  green: '#0D9488',
  red: '#EF4444',
  navy: '#10182D',
};

// ─── Constants ────────────────────────────────────────────────────────────────
export const LIVE_PARTNER_FEED_ENABLED = true;
export const MY_LOCATION_PICKUP_ID = 'current_location';

// ─── Types ────────────────────────────────────────────────────────────────────
export type TimeContext = {
  label: string;
  icon: React.ReactNode;
  color: string;
  sub: string;
};

export type WayPoint = {
  id: string;
  label: string;
  type: 'pickup' | 'stop' | 'destination';
};

export type RouteDestination = {
  id: string;
  name: string;
  subtitle: string;
  soloFare: number;
  splitFare: number;
  etaMin: number;
};

export type RouteInfo = {
  distanceMeters: number;
  durationSeconds: number;
  polyline?: string;
  steps?: RouteStep[];
  trafficCondition?: 'NORMAL' | 'SLOW' | 'TRAFFIC_JAM';
};

export type RouteStep = {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
};

export type DistanceMatrixResult = {
  distanceMeters: number;
  durationSeconds: number;
  durationInTrafficSeconds?: number;
};

export type VisiblePartner = {
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
  vehicleType?: 'rickshaw' | 'cng' | 'bike';
};

export type AppNotification = {
  id: string;
  type: string;
  message?: string;
  read: boolean;
  createdAt?: number;
  toUserId?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const getGreeting = (h: number): string => {
  if (h >= 4 && h < 12) return 'Good morning';
  if (h >= 12 && h < 15) return 'Good noon';
  if (h >= 15 && h < 18) return 'Good afternoon';
  return 'Good evening';
};

export const getTimeContext = (h: number): TimeContext => {
  if (h >= 4 && h < 7)
    return {
      label: 'Early Morning',
      icon: React.createElement(IconSunrise, { size: 26 }),
      color: COLORS.amber,
      sub: 'Quiet roads | Early starters',
    };
  if (h >= 7 && h < 10)
    return {
      label: 'Morning Rush',
      icon: React.createElement(IconSunrise, { size: 26 }),
      color: COLORS.amber,
      sub: 'High demand | Fast partner discovery',
    };
  if (h >= 10 && h < 12)
    return {
      label: 'Mid Morning',
      icon: React.createElement(IconSun, { size: 26 }),
      color: COLORS.primary,
      sub: 'Good availability for short rides',
    };
  if (h >= 12 && h < 15)
    return {
      label: 'Noon',
      icon: React.createElement(IconLunch, { size: 26 }),
      color: COLORS.green,
      sub: 'Good availability for midday trips',
    };
  if (h >= 15 && h < 18)
    return {
      label: 'Afternoon',
      icon: React.createElement(IconAfternoon, { size: 26 }),
      color: COLORS.primary,
      sub: 'Good route overlap for departures',
    };
  if (h >= 18 && h < 21)
    return {
      label: 'Evening Rush',
      icon: React.createElement(IconEvening, { size: 26 }),
      color: COLORS.red,
      sub: 'Peak demand | More live riders',
    };
  return {
    label: 'Night Ride',
    icon: React.createElement(IconMoon, { size: 26 }),
    color: COLORS.navy,
    sub: 'Fewer riders | Clearer route decisions',
  };
};

export const fmtDist = (m: number): string =>
  m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
