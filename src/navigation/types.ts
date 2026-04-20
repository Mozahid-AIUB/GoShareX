/**
 * RideShare AIUB — Navigation Type Definitions
 */
import {
  NavigatorScreenParams,
  CompositeNavigationProp,
  RouteProp,
} from '@react-navigation/native';
import {
  StackNavigationProp,
  StackScreenProps,
} from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// ─── Auth Stack ─────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  ProfileSetup: {
    uid: string;
    email: string;
  };
};

// ─── Bottom Tab ──────────────────────────────────────────────────────────────

export type MainTabParamList = {
  Home: undefined;
  LiveMap: undefined;
  PostBoard: undefined;
  ChatList: undefined;
  Profile: undefined;
};

// ─── Ride Stack ──────────────────────────────────────────────────────────────

export type RideStackParamList = {
  RideConfirmed: { rideId: string };
  RideActive: { rideId: string };
  RideComplete: { rideId: string };
};

// ─── Main (Root) Stack ───────────────────────────────────────────────────────

export type RootStackParamList = {
  // Auth flow
  Auth: NavigatorScreenParams<AuthStackParamList>;

  // Main tabs
  MainApp: NavigatorScreenParams<MainTabParamList>;

  // Ride flow (accessible from anywhere)
  RideConfirmed: { rideId: string };
  RideActive: { rideId: string };
  RideComplete: { rideId: string };

  // Chat
  Chat: { chatId: string; partnerName: string };
  ChatList: undefined;

  // Profile & settings
  Profile: { userId?: string };
  EditProfile: undefined;
  Settings: undefined;
  RideHistory: undefined;

  // Board
  PostBoard: { highlightPostId?: string };
  CreatePost: undefined;

  // Moderation
  Suspension: { suspendedUntil: number };
  Report: { reportedUserId: string; rideId?: string };

  // Map
  LiveMap: undefined;
};

// ─── Typed navigation / route helpers ────────────────────────────────────────

/** Typed navigation prop for any screen inside the Root stack */
export type RootStackNavigationProp<
  T extends keyof RootStackParamList = keyof RootStackParamList,
> = StackNavigationProp<RootStackParamList, T>;

/** Typed route prop for any screen inside the Root stack */
export type RootStackRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;

/** Combined nav prop for tab screens that also need root stack actions */
export type MainTabScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  StackNavigationProp<RootStackParamList>
>;

/** Convenience screen props type */
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  StackScreenProps<RootStackParamList, T>;
