import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import HomeScreen from '@/screens/home/HomeScreen';
import LiveMapScreen from '@/screens/map/LiveMapScreen';
import PostBoardScreen from '@/screens/board/PostBoardScreen';
import ChatListScreen from '@/screens/chat/ChatListScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ emoji, focused }: { emoji: string; focused: boolean }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
);

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0', height: 58, paddingBottom: 6 },
        tabBarActiveTintColor: '#1A73E8',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tab.Screen name="Map" component={LiveMapScreen} options={{ tabBarLabel: 'Live Map', tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} /> }} />
      <Tab.Screen name="Board" component={PostBoardScreen} options={{ tabBarLabel: 'Board', tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }} />
      <Tab.Screen name="Chats" component={ChatListScreen} options={{ tabBarLabel: 'Chats', tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
