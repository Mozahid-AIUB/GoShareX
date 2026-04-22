import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import HomeScreen from '@/screens/home/HomeScreen';
import LiveMapScreen from '@/screens/map/LiveMapScreen';
import PostBoardScreen from '@/screens/board/PostBoardScreen';
import ChatListScreen from '@/screens/chat/ChatListScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';
import { COLORS } from '@/constants/theme';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home', label: 'Home', icon: 'home-variant-outline', activeIcon: 'home-variant' as const, component: HomeScreen },
  { name: 'Map', label: 'Live', icon: 'map-marker-radius-outline', activeIcon: 'map-marker-radius' as const, component: LiveMapScreen },
  { name: 'Board', label: 'Board', icon: 'view-grid-outline', activeIcon: 'view-grid' as const, component: PostBoardScreen },
  { name: 'Chats', label: 'Chats', icon: 'message-text-outline', activeIcon: 'message-text' as const, component: ChatListScreen },
  { name: 'Profile', label: 'Profile', icon: 'account-circle-outline', activeIcon: 'account-circle' as const, component: ProfileScreen },
] as const;

const TabBarBackground = () => (
  <View style={styles.tabShell}>
    <View style={styles.topEdge} />
  </View>
);

const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: false,
        tabBarShowLabel: false,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 12,
          height: 78 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingTop: 10,
          borderTopWidth: 0,
          borderRadius: 30,
          backgroundColor: '#DDE7F5',
          shadowColor: '#5F7697',
          shadowOpacity: 0.22,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 14,
        },
        tabBarItemStyle: styles.tabItem,
      }}
    >
      {TABS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={[styles.tabPill, focused && styles.tabPillActive]}>
                <MaterialCommunityIcons
                  name={focused ? tab.activeIcon : tab.icon}
                  size={20}
                  color={focused ? COLORS.primary : '#8193AD'}
                />
                <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </View>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabShell: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: '#DDE7F5',
    borderWidth: 1,
    borderColor: '#C2D1E5',
    overflow: 'hidden',
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  tabItem: {
    paddingVertical: 0,
  },
  tabPill: {
    minWidth: 64,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillActive: {
    minWidth: 76,
    backgroundColor: '#F7FAFF',
    borderWidth: 1,
    borderColor: '#CCD9EB',
    shadowColor: '#8AA8CF',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#8193AD',
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});

export default BottomTabNavigator;
