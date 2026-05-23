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
import { NearbyRider } from '@/types/ride.types';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ProfileSetup: { uid?: string; email?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Map: undefined;
  Board: undefined;
  Chats: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Suspension: { remainingHours?: number; suspendedUntil?: number; reason?: string };
  MainApp: NavigatorScreenParams<MainTabParamList>;
  VehicleConfirm: { rider?: NearbyRider; chatId?: string };
  RideConfirmed: { rideId?: string; rider?: NearbyRider; chatId?: string; fare?: number; splitFare?: number };
  RideActive: { rideId?: string; rider?: NearbyRider; fare?: number; splitFare?: number };
  RideComplete: { rideId?: string; rider?: NearbyRider; fare?: number; splitFare?: number };
  Chat: {
    chatId?: string;
    partnerName?: string;
    rider?: NearbyRider;
    anonymousMode?: 'anonymous_1v1' | 'anonymous_group';
  };
  ChatList: undefined;
  UserProfile: { userId?: string };
  EditProfile: undefined;
  Settings: undefined;
  RideHistory: undefined;
  PostBoard: { highlightPostId?: string };
  CreatePost: undefined;
  LiveMap: { destination?: string; pickup?: string } | undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  Legal: { initialTab?: 'terms' | 'privacy' } | undefined;
};

export type RootNavProp<
  T extends keyof RootStackParamList = keyof RootStackParamList
> = StackNavigationProp<RootStackParamList, T>;

export type RootRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;

export type RootScreenProps<T extends keyof RootStackParamList> = StackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  StackNavigationProp<RootStackParamList>
>;

// Aliases for backward compatibility
export type RootStackNavigationProp<
  T extends keyof RootStackParamList = keyof RootStackParamList
> = StackNavigationProp<RootStackParamList, T>;

export type RootStackRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;

export type RootStackScreenProps<T extends keyof RootStackParamList> = StackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabScreenNavigationProp = MainTabNavProp;

export type RideStackParamList = Pick<
  RootStackParamList,
  'RideConfirmed' | 'RideActive' | 'RideComplete'
>;