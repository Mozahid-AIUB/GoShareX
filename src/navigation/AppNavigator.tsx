import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import { useAuthStore } from '@/store/authStore';
import { startPresenceTracking, stopPresenceTracking } from '@/services/presenceService';
import { rideRequestService } from '@/services/supabase/rideRequestService';
import { useRequestStore } from '@/store/requestStore';
import IncomingRequestOverlay from '@/components/common/IncomingRequestOverlay';

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
import ChatListScreen from '@/screens/chat/ChatListScreen';
import LiveMapScreen from '@/screens/map/LiveMapScreen';
import PostBoardScreen from '@/screens/board/PostBoardScreen';
import CreatePostScreen from '@/screens/board/CreatePostScreen';
import VehicleConfirmScreen from '@/screens/ride/VehicleConfirmScreen';
import PrivacyPolicyScreen from '@/screens/legal/PrivacyPolicyScreen';
import LegalScreen from '@/screens/legal/LegalScreen';

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

  return (
    <NavigationContainer>
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
              options={{ headerShown: true, title: 'Ride History', headerStyle: DARK_HEADER, headerTitleStyle: DARK_HEADER_TITLE, headerTintColor: '#A5B4FC' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ headerShown: true, title: 'Settings', headerStyle: DARK_HEADER, headerTitleStyle: DARK_HEADER_TITLE, headerTintColor: '#A5B4FC' }}
            />
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
              options={{ headerShown: true, title: 'Edit Profile', headerStyle: DARK_HEADER, headerTitleStyle: DARK_HEADER_TITLE, headerTintColor: '#A5B4FC' }}
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
