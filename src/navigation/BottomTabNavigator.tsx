import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import HomeScreen from '@/screens/home/HomeScreen';
import LiveMapScreen from '@/screens/map/LiveMapScreen';
import PostBoardScreen from '@/screens/board/PostBoardScreen';
import ChatListScreen from '@/screens/chat/ChatListScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

// ─── Light warm-white tab tokens ─────────────────────────────────────────────
const C = {
  bg: '#FFFFFF',
  border: '#EDE8F5',
  active: '#6366F1',
  inactive: '#B0AACC',
};

// ─── Pure SVG tab icons (zero dependencies) ───────────────────────────────────
const IconHome = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    {active ? (
      <Path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" fill={C.active} />
    ) : (
      <Path
        d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"
        stroke={C.inactive}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    )}
  </Svg>
);

const IconMap = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 20L3 17.382V4.618L9 7M9 20L15 17M9 20V7M15 17L21 19.382V6.618L15 4M15 17V4M15 4L9 7"
      stroke={active ? C.active : C.inactive}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {active && <Circle cx="15" cy="10" r="2.5" fill={C.active} opacity="0.5" />}
  </Svg>
);

const IconBoard = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="8" height="8" rx="2" fill={active ? C.active : 'none'} stroke={active ? C.active : C.inactive} strokeWidth="1.8" />
    <Rect x="13" y="3" width="8" height="8" rx="2" fill="none" stroke={active ? C.active : C.inactive} strokeWidth="1.8" opacity={active ? 0.5 : 1} />
    <Rect x="3" y="13" width="8" height="8" rx="2" fill="none" stroke={active ? C.active : C.inactive} strokeWidth="1.8" opacity={active ? 0.5 : 1} />
    <Rect x="13" y="13" width="8" height="8" rx="2" fill={active ? C.active : 'none'} stroke={active ? C.active : C.inactive} strokeWidth="1.8" opacity={active ? 0.7 : 1} />
  </Svg>
);

const IconChat = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
      fill={active ? C.active : 'none'}
      stroke={active ? C.active : C.inactive}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {active && <Path d="M8 10h8M8 13h5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />}
  </Svg>
);

const IconProfile = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" fill={active ? C.active : 'none'} stroke={active ? C.active : C.inactive} strokeWidth="1.8" />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={active ? C.active : C.inactive} strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </Svg>
);

// ─── Navigator ────────────────────────────────────────────────────────────────
const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      id={undefined}
      screenListeners={{
        tabPress: () => {
          Haptics.selectionAsync().catch(() => undefined);
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        lazy: true,
        // Library-native label rendering — handles vertical centering automatically
        tabBarShowLabel: true,
        tabBarActiveTintColor: C.active,
        tabBarInactiveTintColor: C.inactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.1,
          marginTop: -2,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
        // System-integrated docked bar — sits flush against the OS gesture bar
        tabBarStyle: {
          height: 58 + Math.max(insets.bottom, 12),
          paddingBottom: Math.max(insets.bottom, 12),
          paddingTop: 8,
          backgroundColor: C.bg,
          borderTopWidth: 1,
          borderTopColor: C.border,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -2 },
          elevation: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <IconHome active={focused} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={LiveMapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ focused }) => <IconMap active={focused} />,
        }}
      />
      <Tab.Screen
        name="Board"
        component={PostBoardScreen}
        options={{
          tabBarLabel: 'RidePool',
          tabBarIcon: ({ focused }) => <IconBoard active={focused} />,
        }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatListScreen}
        options={{
          tabBarLabel: 'Chats',
          tabBarIcon: ({ focused }) => <IconChat active={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <IconProfile active={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
