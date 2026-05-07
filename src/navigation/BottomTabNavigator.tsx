import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

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
  activeGlow: 'rgba(99,102,241,0.10)',
  inactive: '#B0AACC',
  text: '#1A1A2E',
  textInactive: '#9896A8',
};

// ─── Pure SVG tab icons (zero dependencies) ───────────────────────────────────
const IconHome = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    {active
      ? <Path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" fill={C.active} />
      : <Path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" stroke={C.inactive} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    }
  </Svg>
);

const IconMap = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M9 20L3 17.382V4.618L9 7M9 20L15 17M9 20V7M15 17L21 19.382V6.618L15 4M15 17V4M15 4L9 7"
      stroke={active ? C.active : C.inactive} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    {active && <Circle cx="15" cy="10" r="2.5" fill={C.active} opacity="0.5" />}
  </Svg>
);

const IconBoard = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="8" height="8" rx="2"
      fill={active ? C.active : 'none'}
      stroke={active ? C.active : C.inactive} strokeWidth="1.8" />
    <Rect x="13" y="3" width="8" height="8" rx="2"
      fill="none"
      stroke={active ? C.active : C.inactive} strokeWidth="1.8" opacity={active ? 0.5 : 1} />
    <Rect x="3" y="13" width="8" height="8" rx="2"
      fill="none"
      stroke={active ? C.active : C.inactive} strokeWidth="1.8" opacity={active ? 0.5 : 1} />
    <Rect x="13" y="13" width="8" height="8" rx="2"
      fill={active ? C.active : 'none'}
      stroke={active ? C.active : C.inactive} strokeWidth="1.8" opacity={active ? 0.7 : 1} />
  </Svg>
);

const IconChat = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
      fill={active ? C.active : 'none'}
      stroke={active ? C.active : C.inactive} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    {active && <>
      <Path d="M8 10h8M8 13h5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
    </>}
  </Svg>
);

const IconProfile = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4"
      fill={active ? C.active : 'none'}
      stroke={active ? C.active : C.inactive} strokeWidth="1.8" />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
      stroke={active ? C.active : C.inactive} strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </Svg>
);

// ─── Tab item renderer ────────────────────────────────────────────────────────
const TabIcon = ({
  label,
  icon,
  focused,
}: {
  label: string;
  icon: React.ReactNode;
  focused: boolean;
}) => (
  <View style={[ti.wrap, focused && ti.wrapActive]}>
    {focused && <View style={ti.glow} />}
    {icon}
    <Text style={[ti.label, focused && ti.labelActive]}>{label}</Text>
  </View>
);

const ti = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 3,
    position: 'relative',
  },
  wrapActive: {
    backgroundColor: 'rgba(99,102,241,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.20)',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: C.activeGlow,
    opacity: 0.5,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: C.textInactive,
    letterSpacing: 0.2,
    marginTop: 1,
  },
  labelActive: {
    color: C.active,
    fontWeight: '800',
  },
});

// ─── Navigator ────────────────────────────────────────────────────────────────
const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        lazy: true,
        tabBarStyle: {
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 12,
          height: 72,
          borderRadius: 24,
          backgroundColor: C.bg,
          borderTopWidth: 0,
          borderWidth: 1.5,
          borderColor: C.border,
          shadowColor: '#6366F1',
          shadowOpacity: 0.12,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 6 },
          elevation: 12,
        },
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Home" icon={<IconHome active={focused} />} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={LiveMapScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Map" icon={<IconMap active={focused} />} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Board"
        component={PostBoardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="RidePool" icon={<IconBoard active={focused} />} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatListScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Chats" icon={<IconChat active={focused} />} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Profile" icon={<IconProfile active={focused} />} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
