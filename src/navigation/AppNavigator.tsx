import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
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

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Entry point — routes based on auth + suspension state */}
        <Stack.Screen name="Splash" component={SplashScreen} />

        {/* Auth flow */}
        <Stack.Screen name="Auth" component={AuthNavigator} />

        {/* Suspension wall — no back gesture */}
        <Stack.Screen
          name="Suspension"
          component={SuspensionScreen}
          options={{ gestureEnabled: false }}
        />

        {/* Main app */}
        <Stack.Screen name="MainApp" component={BottomTabNavigator} />

        {/* Modal / overlay screens */}
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            headerShown: true,
            title: 'Chat',
            headerStyle: { backgroundColor: '#1A73E8' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '800' },
          }}
        />
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
        <Stack.Screen
          name="RideHistory"
          component={RideHistoryScreen}
          options={{ headerShown: true, title: 'Ride History', headerStyle: { backgroundColor: '#fff' } }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: true, title: 'Settings', headerStyle: { backgroundColor: '#fff' } }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;