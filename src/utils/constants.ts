export const COLORS = {
  primary: '#1A73E8',
  primaryDark: '#1557B0',
  primaryLight: '#4A90E2',
  secondary: '#0D47A1',
  success: '#43A047',
  successLight: '#E8F5E9',
  warning: '#FF8F00',
  warningLight: '#FFF8E1',
  error: '#E53935',
  errorLight: '#FFEBEE',
  surface: '#FFFFFF',
  background: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E8ECF0',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  ripple: 'rgba(26,115,232,0.12)',
  overlay: 'rgba(0,0,0,0.5)',
  mapGreen: '#43A047',
  mapRed: '#E53935',
  mapGray: '#9E9E9E',
  gold: '#F9A825',
  silver: '#78909C',
  diamond: '#7B1FA2',
};

export const GRADIENTS = {
  primary: ['#1A73E8', '#1557B0'],
  success: ['#43A047', '#2E7D32'],
  warning: ['#FF8F00', '#E65100'],
  error: ['#E53935', '#B71C1C'],
  gold: ['#F9A825', '#F57F17'],
  dark: ['#1A1A2E', '#16213E'],
  surface: ['#FFFFFF', '#F5F7FA'],
};

export const TYPOGRAPHY = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '600' as const },
  h4: { fontSize: 18, fontWeight: '600' as const },
  body1: { fontSize: 16, fontWeight: '400' as const },
  body2: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  overline: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 1 },
  button: { fontSize: 16, fontWeight: '600' as const, letterSpacing: 0.5 },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const PROXIMITY = {
  instantAlert: 30,
  normalNotify: 100,
  visible: 300,
  geofenceRadius: 100,
};

export const RIDE = {
  confirmationTimeout: 30,
  rideStartTimeout: 600,
  locationUpdateInterval: 5000,
  movementThresholdKmh: 5,
  autoExpireMinutes: 30,
  maxRidersPerPost: 3,
  cancellationStrikeLimit: 3,
  suspensionHours: 24,
};

export const AIUB_EMAIL_DOMAIN = '@aiub.edu.bd';

export const PICKUP_POINTS = [
  'Main Gate',
  'Gate 2',
  'Canteen Area',
  'Parking Zone',
  'Admin Block',
] as const;

export const DESTINATIONS = [
  'Kuril',
  'Badda',
  'Rampura',
  'Notun Bazar',
  'Gulshan',
  'Banani',
  'Uttara',
] as const;

export type PickupPoint = typeof PICKUP_POINTS[number];
export type Destination = typeof DESTINATIONS[number];

export const BADGE_THRESHOLDS = {
  NEW_RIDER: 0,
  REGULAR: 6,
  TRUSTED: 21,
  ELITE: 50,
};

export const BADGE_LABELS = {
  NEW_RIDER: 'New Rider',
  REGULAR: 'Regular',
  TRUSTED: 'Trusted',
  ELITE: 'Elite Rider',
};

export const FIREBASE_COLLECTIONS = {
  USERS: 'users',
  ACTIVE_RIDERS: 'active_riders',
  RIDES: 'rides',
  CHATS: 'chats',
  POSTS: 'posts',
  FARE_TABLE: 'fare_table',
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
};

export const RTDB_PATHS = {
  ACTIVE_RIDERS: 'active_riders',
  RIDE_LOCATIONS: 'ride_locations',
};

export const QUICK_REPLIES = [
  { id: 'coming', label: 'আসছি', icon: 'check-circle' },
  { id: 'location', label: 'Location Share', icon: 'map-marker' },
  { id: 'deal', label: 'Deal হলো', icon: 'handshake' },
  { id: 'wait', label: 'একটু অপেক্ষা করো', icon: 'clock-outline' },
  { id: 'cancel', label: 'Cancel', icon: 'close-circle' },
];
