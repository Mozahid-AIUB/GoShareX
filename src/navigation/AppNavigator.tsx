import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';

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

// Typed stack — VSCode now knows every valid screen name & params
const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen
          name="Suspension"
          component={SuspensionScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="MainApp" component={BottomTabNavigator} />
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
        <Stack.Screen
          name="LiveMap"
          component={LiveMapScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ChatList"
          component={ChatListScreen}
          options={{ headerShown: true, title: 'Chats', headerStyle: { backgroundColor: '#fff' } }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: true, title: 'Profile', headerStyle: { backgroundColor: '#fff' } }}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{ headerShown: true, title: 'Edit Profile', headerStyle: { backgroundColor: '#fff' } }}
        />
        <Stack.Screen
          name="PostBoard"
          component={PostBoardScreen}
          options={{ headerShown: true, title: 'Post Board', headerStyle: { backgroundColor: '#fff' } }}
        />
        <Stack.Screen
          name="CreatePost"
          component={CreatePostScreen}
          options={{ headerShown: true, title: 'Create Post', headerStyle: { backgroundColor: '#fff' } }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;