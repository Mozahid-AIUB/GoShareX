/**
 * RideShare AIUB — Route Name Constants
 * Keep navigation screen names in one place to avoid typos.
 */

export const ROUTES = {
  // Auth stack
  SPLASH: 'Splash',
  LOGIN: 'Login',
  REGISTER: 'Register',
  PROFILE_SETUP: 'ProfileSetup',

  // Main app
  HOME: 'Home',
  LIVE_MAP: 'LiveMap',
  CHAT: 'Chat',
  CHAT_LIST: 'ChatList',

  // Ride flow
  RIDE_CONFIRMED: 'RideConfirmed',
  RIDE_ACTIVE: 'RideActive',
  RIDE_COMPLETE: 'RideComplete',

  // Board & community
  POST_BOARD: 'PostBoard',

  // Profile & settings
  PROFILE: 'Profile',
  SETTINGS: 'Settings',
  RIDE_HISTORY: 'RideHistory',
  EDIT_PROFILE: 'EditProfile',

  // Moderation
  SUSPENSION: 'Suspension',
  REPORT: 'Report',

  // Content creation
  CREATE_POST: 'CreatePost',
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];
