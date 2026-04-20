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
  RideConfirmed: { rideId: string };
  RideActive: { rideId: string };
  RideComplete: { rideId: string };
  Chat: { chatId: string; partnerName: string };
  ChatList: undefined;
  Profile: { userId?: string };
  EditProfile: undefined;
  Settings: undefined;
  RideHistory: undefined;
  PostBoard: { highlightPostId?: string };
  CreatePost: undefined;
  Report: { reportedUserId: string; rideId?: string };
  LiveMap: { destination?: string; pickup?: string } | undefined;
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
