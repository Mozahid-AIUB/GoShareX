import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import { RootStackParamList } from './types';
import { useAuthStore } from '@/store/authStore';
import { startPresenceTracking, stopPresenceTracking } from '@/services/presenceService';
import { rideRequestService } from '@/services/supabase/rideRequestService';
import { useRequestStore } from '@/store/requestStore';
import IncomingRequestOverlay from '@/components/common/IncomingRequestOverlay';
import { useUnratedRideReminder } from '@/hooks/useUnratedRideReminder';
import { useLivePresence } from '@/hooks/useLivePresence';
import { handleNotificationResponse } from '@/services/notifications/pushHandler';
import { logger } from '@/utils/logger';

// navigation ref — notification tap থেকে screen-এ navigate করতে (component-এর
// বাইরে থেকেও ব্যবহারযোগ্য)।
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

import AuthNavigator from './AuthNavigator';
import BottomTabNavigator from './BottomTabNavigator';
import SplashScreen from '@/screens/auth/SplashScreen';
import SuspensionScreen from '@/screens/auth/SuspensionScreen';
import ChatScreen from '@/screens/chat/ChatScreen';
import RideConfirmedScreen from '@/screens/ride/RideConfirmedScreen';
import RideActiveScreen from '@/screens/ride/RideActiveScreen';
import RideCompleteScreen from '@/screens/ride/RideCompleteScreen';
import RideHistoryScreen from '@/screens/profile/RideHistoryScreen';
import SettingsScreen from '@/screens/profile/SettingsScreen';
import EditProfileScreen from '@/screens/profile/EditProfileScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';
import AdminDashboardScreen from '@/screens/admin/AdminDashboardScreen';
import ChatListScreen from '@/screens/chat/ChatListScreen';
import LiveMapScreen from '@/screens/map/LiveMapScreen';
import PostBoardScreen from '@/screens/board/PostBoardScreen';
import CreatePostScreen from '@/screens/board/CreatePostScreen';
import VehicleConfirmScreen from '@/screens/ride/VehicleConfirmScreen';
import PrivacyPolicyScreen from '@/screens/legal/PrivacyPolicyScreen';
import LegalScreen from '@/screens/legal/LegalScreen';

// NavigationContainer-এ explicit theme না দিলে phone system dark mode-এ
// থাকলে React Navigation নিজে থেকেই DarkTheme (কালো background) ধরে নেয় —
// Stack transition/tab-transition-এর মাঝে সেই কালো card background bleed
// করে "কালো layer flash" দেখাত। App সবসময় নিজের হালকা থিমেই থাকবে, phone
// dark mode-এ থাকুক বা না থাকুক — তাই এখানে fix করে দেওয়া হলো।
const APP_NAV_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FAF8FF',
  },
};

const DARK_HEADER = {
  backgroundColor: '#07090F',
  elevation: 0,
  shadowOpacity: 0,
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(255,255,255,0.08)',
} as const;

const DARK_HEADER_TITLE = {
  color: '#EEF2FF',
  fontWeight: '800' as const,
  fontSize: 16,
  letterSpacing: -0.3,
};

// EditProfile/RideHistory/Settings — এই screen-গুলো নিজেই হালকা থিম
// (#FAF8FF family), কিন্তু আগে DARK_HEADER ব্যবহার করত — header কালো,
// নিচের পুরো body সাদা, স্পষ্ট mismatch দেখাত। এই screen-গুলোর জন্য
// আলাদা হালকা header।
const LIGHT_HEADER = {
  backgroundColor: '#FAF8FF',
  elevation: 0,
  shadowOpacity: 0,
  borderBottomWidth: 1,
  borderBottomColor: '#EDE8F5',
} as const;

const LIGHT_HEADER_TITLE = {
  color: '#1A1A2E',
  fontWeight: '800' as const,
  fontSize: 16,
  letterSpacing: -0.3,
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { isAuthenticated, isLoading, suspension, user } = useAuthStore();

  // online/offline presence — login থাকলে নিজেকে online মার্ক করি, logout-এ
  // offline। (আগে কেউ presence লিখত না, তাই chat-এ সবাই Offline দেখাত।)
  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      startPresenceTracking(user.uid);
      return () => { void stopPresenceTracking(user.uid); };
    }
  }, [isAuthenticated, user?.uid]);

  // GLOBAL incoming-request listener — যেকোনো screen-এ request banner আসে
  // (আগে শুধু HomeScreen-এর local listener ছিল)। store-এ রাখি, overlay দেখায়।
  const setIncoming = useRequestStore((s) => s.setIncoming);
  const clearIncoming = useRequestStore((s) => s.clear);
  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      const unsub = rideRequestService.listenToIncoming(user.uid, setIncoming);
      return () => { unsub(); clearIncoming(); };
    }
    clearIncoming();
  }, [isAuthenticated, user?.uid, setIncoming, clearIncoming]);

  // Check unrated ride reminders when app opens (every time focus)
  useUnratedRideReminder();

  // GLOBAL presence broadcaster — গন্তব্য সেট + "Go Live" on থাকলে যেকোনো
  // screen থেকে নিজের location active_riders-এ broadcast করে (আগে শুধু Live Map
  // screen-এ হত → দুজন Home-এ থাকলে কেউ কাউকে পেত না)। single owner।
  useLivePresence();

  // Notification tap → ঠিক screen-এ নিয়ে যাই। আগে listener register-ই হত না
  // (App.tsx শুধু Firebase configureNotificationHandler ডাকত) → tap-এ কিছু
  // হত না। এখন: (a) app বন্ধ থাকা অবস্থায় tap করে খুললে শেষ response,
  // (b) চলন্ত অবস্থায় tap — দুটোই handle করি। Expo Go-তে remote push নেই,
  // তাই listener নিরীহভাবে কিছু পায় না (crash করে না)।
  useEffect(() => {
    if (!isAuthenticated) return;

    // expo-notifications response → pushHandler যে shape চায় (data) সেভাবে
    // route করি। data থাকে response.notification.request.content.data-তে।
    const routeFrom = (response: Notifications.NotificationResponse | null) => {
      if (!response || !navigationRef.isReady()) return;
      const data = response.notification?.request?.content?.data ?? {};
      handleNotificationResponse({ data }, navigationRef as any);
    };

    // app বন্ধ ছিল, notification tap করে খোলা হলো → শেষ response route করি।
    Notifications.getLastNotificationResponseAsync()
      .then(routeFrom)
      .catch((e) => logger.warn('AppNavigator.lastNotif', String(e)));

    // app চলন্ত অবস্থায় tap → সরাসরি route।
    const sub = Notifications.addNotificationResponseReceivedListener(routeFrom);
    return () => sub.remove();
  }, [isAuthenticated]);

  return (
    <NavigationContainer ref={navigationRef} theme={APP_NAV_THEME}>
      <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
        {isLoading ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : suspension ? (
          <>
            <Stack.Screen
              name="Suspension"
              component={SuspensionScreen}
              initialParams={{ reason: suspension.reason, suspendedUntil: suspension.suspendedUntil }}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="Auth" component={AuthNavigator} />
          </>
        ) : !isAuthenticated ? (
          <>
            <Stack.Screen name="Auth" component={AuthNavigator} />
            <Stack.Screen name="Suspension" component={SuspensionScreen} options={{ gestureEnabled: false }} />
            {/* login screen-এর "Privacy Policy" লিংক আগে শুধু authenticated
                block-এ registered ছিল — unauthenticated অবস্থায় navigate()
                silently fail করত (কোনো matching route নেই)। sign-in-এর আগেই
                policy পড়তে পারা দরকার, তাই এখানেও যোগ করা হলো। */}
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Legal" component={LegalScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainApp" component={BottomTabNavigator} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
            <Stack.Screen name="VehicleConfirm" component={VehicleConfirmScreen} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="RideConfirmed" component={RideConfirmedScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="RideActive" component={RideActiveScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="RideComplete" component={RideCompleteScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen
              name="RideHistory"
              component={RideHistoryScreen}
              options={{ headerShown: true, title: 'Ride History', headerStyle: LIGHT_HEADER, headerTitleStyle: LIGHT_HEADER_TITLE, headerTintColor: '#6366F1' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ headerShown: true, title: 'Settings', headerStyle: LIGHT_HEADER, headerTitleStyle: LIGHT_HEADER_TITLE, headerTintColor: '#6366F1' }}
            />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="LiveMap" component={LiveMapScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="ChatList"
              component={ChatListScreen}
              options={{ headerShown: true, title: 'Chats', headerStyle: DARK_HEADER, headerTitleStyle: DARK_HEADER_TITLE, headerTintColor: '#A5B4FC' }}
            />
            <Stack.Screen
              name="UserProfile"
              component={ProfileScreen}
              options={{ headerShown: true, title: 'Profile', headerStyle: DARK_HEADER, headerTitleStyle: DARK_HEADER_TITLE, headerTintColor: '#A5B4FC' }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ headerShown: true, title: 'Edit Profile', headerStyle: LIGHT_HEADER, headerTitleStyle: LIGHT_HEADER_TITLE, headerTintColor: '#6366F1' }}
            />
            <Stack.Screen name="PostBoard" component={PostBoardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Legal" component={LegalScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
      {/* global incoming-request banner — সব screen-এর উপরে */}
      {isAuthenticated && <IncomingRequestOverlay />}
    </NavigationContainer>
  );
};

export default AppNavigator;
