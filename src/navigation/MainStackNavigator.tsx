import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { COLORS } from '@/constants/colors';
import BottomTabNavigator from './BottomTabNavigator';

// Overlay screens
import ChatScreen from '@/screens/chat/ChatScreen';
import RideConfirmedScreen from '@/screens/ride/RideConfirmedScreen';
import RideActiveScreen from '@/screens/ride/RideActiveScreen';
import RideCompleteScreen from '@/screens/ride/RideCompleteScreen';
import SettingsScreen from '@/screens/profile/SettingsScreen';
import RideHistoryScreen from '@/screens/profile/RideHistoryScreen';

import type { RootStackParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();

const headerDefaults = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.primary,
  headerTitleStyle: { fontWeight: '700' as const, color: COLORS.textPrimary },
  headerBackTitleVisible: false,
};

/**
 * MainStackNavigator
 * Houses the BottomTabNavigator and all overlay/modal screens that sit on top
 * of the main tab UI (chat, ride flow, settings, history).
 */
const MainStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Primary tab experience */}
      <Stack.Screen name="MainApp" component={BottomTabNavigator} />

      {/* Chat */}
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          headerShown: true,
          title: (route.params as { partnerName?: string }).partnerName ?? 'Chat',
          ...headerDefaults,
        })}
      />

      {/* Ride flow — gesture disabled so users cannot accidentally go back */}
      <Stack.Screen
        name="RideConfirmed"
        component={RideConfirmedScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="RideActive"
        component={RideActiveScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="RideComplete"
        component={RideCompleteScreen}
        options={{ gestureEnabled: false }}
      />

      {/* Profile overlays */}
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, title: 'Settings', ...headerDefaults }}
      />
      <Stack.Screen
        name="RideHistory"
        component={RideHistoryScreen}
        options={{ headerShown: true, title: 'Ride History', ...headerDefaults }}
      />
    </Stack.Navigator>
  );
};

export default MainStackNavigator;
