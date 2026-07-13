import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { createBottomTabNavigator, TransitionPresets } from '@react-navigation/bottom-tabs';
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

// ─── Custom tab transition ────────────────────────────────────────────────────
// BUG: animation: 'shift' Android-এ একটা confirmed react-navigation library
// বাগ trigger করে — tab বদলানোর মাঝপথে ছোট্ট একটা কালো ফ্রেম flash করে
// (GitHub issue react-navigation/react-navigation#12862, Expo SDK 54-এ
// রিপোর্ট করা)। root cause library-র নিজের native Android rendering-এ,
// কোনো background/color-এর সমস্যা না — তাই root-level color fix (যেগুলো
// আগে try করা হয়েছিল) কাজ করেনি। library-র নিজস্ব workaround হলো animation
// mode বদলানো। 'fade' ব্যবহার করছি — এই বাগ নেই, তবু smooth crossfade
// (premium feel) বজায় থাকে, শুধু 'shift'-এর sideways slide-টা নেই।
const tabTransitionSpec = {
  ...TransitionPresets.FadeTransition.transitionSpec,
  config: {
    ...TransitionPresets.FadeTransition.transitionSpec?.config,
    duration: 340,
    easing: Easing.inOut(Easing.cubic),
  },
} as typeof TransitionPresets.FadeTransition.transitionSpec;

// signature motion — শুধু fade না, screen content ৮px নিচ থেকে উঠে এসে
// জায়গায় "settle" করে (GPS lock/pin drop-এর মতো একটা lift feel), সাথে
// সামান্য scale (0.98 → 1) যোগ করে depth-এর illusion দেয়। plain library
// fade থেকে আলাদা করতেই এই custom interpolator — 'fade' preset-এর bug-free
// base animation-এর উপর বসানো, নিজস্ব sceneStyle override করে।
const sceneStyleInterpolator = ({
  current: { progress },
}: {
  current: { progress: Animated.Value };
}) => {
  const translateY = progress.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [8, 0, 8],
  });
  const scale = progress.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0.98, 1, 0.98],
  });
  // opacity translateY/scale-এর চেয়ে অনেক দ্রুত 0→1 পৌঁছায় (progress 0.35
  // এই পুরো fade শেষ, বাকি ৬৫% শুধু rise/scale settle করে) — আগে opacity
  // পুরো ৩৪০ms জুড়ে সমান গতিতে বদলাত, তাই content প্রায় পুরো transition
  // duration জুড়ে অদৃশ্য/আবছা থাকত এবং tab tap করার পর "কিছুক্ষণ পর render
  // হলো" মনে হতো। এখন content দ্রুত visible হয়ে যায়, rise/scale-এর
  // premium settle feel টা বজায় থেকেই চলতে থাকে।
  const opacity = progress.interpolate({
    inputRange: [-1, -0.65, 0, 0.65, 1],
    outputRange: [0, 1, 1, 1, 0],
  });
  return {
    sceneStyle: {
      opacity,
      transform: [{ translateY }, { scale }],
    },
  } as { sceneStyle: import('react-native').ViewStyle };
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

// active হওয়ার মুহূর্তে ছোট্ট একটা tight spring "pop" (bounce না, ১ ধাপেই
// settle) — tab tap করলে যেন সেই icon "lock" হলো, এই signature feel দেয়।
// inactive হলে সাথে সাথেই normal size-এ ফিরে আসে (spring না, শুধু active→
// pop-টাই attention পাওয়ার যোগ্য, inactive-এ animation distract করবে)।
const AnimatedTabIcon = ({ focused, children }: { focused: boolean; children: React.ReactNode }) => {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (focused) {
      scale.setValue(0.82);
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 22,
        bounciness: 9,
      }).start();
    } else {
      scale.setValue(1);
    }
  }, [focused, scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
};

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
        // tab বদলালে নিজস্ব "rise + settle" signature transition — plain
        // fade না, content হালকা নিচ থেকে উঠে scale-in হয় (sceneStyleInterpolator,
        // উপরে সংজ্ঞায়িত)। base animation 'fade' রাখা হয়েছে কারণ 'shift'
        // Android-এ black-flash bug trigger করে (react-navigation#12862) —
        // 'fade' bug-free, আমরা শুধু তার উপর নিজস্ব motion বসিয়েছি।
        animation: 'fade',
        transitionSpec: tabTransitionSpec,
        sceneStyleInterpolator,
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
          // sceneStyle-এ প্রতিটা screen-এর নিজস্ব আসল background রঙ — bottom-tabs
          // v7 কোনো default background দেয় না scene container-এ (শুধু flex:1),
          // তাই fade transition-এর সময় দুটো screen যখন একসাথে আংশিক দৃশ্যমান
          // থাকে, দুই screen-এর মাঝের ফাঁকা জায়গা দিয়ে নিচের native root view
          // (কালো) দেখা যেত — এটাই "Home black hয়ে আসছে" bug। sceneStyle এখানে
          // custom sceneStyleInterpolator-এর opacity/scale animation শুরুর
          // আগেই বসে, তাই কালো ফাঁক আর দেখা যাবে না।
          sceneStyle: { backgroundColor: '#FAF8FF' },
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon focused={focused}>
              <IconHome active={focused} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={LiveMapScreen}
        options={{
          tabBarLabel: 'Map',
          sceneStyle: { backgroundColor: '#050816' },
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon focused={focused}>
              <IconMap active={focused} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Board"
        component={PostBoardScreen}
        options={{
          tabBarLabel: 'RidePool',
          sceneStyle: { backgroundColor: '#F5F5FA' },
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon focused={focused}>
              <IconBoard active={focused} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatListScreen}
        options={{
          tabBarLabel: 'Chats',
          sceneStyle: { backgroundColor: '#050816' },
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon focused={focused}>
              <IconChat active={focused} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          sceneStyle: { backgroundColor: '#FAF8FF' },
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon focused={focused}>
              <IconProfile active={focused} />
            </AnimatedTabIcon>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
