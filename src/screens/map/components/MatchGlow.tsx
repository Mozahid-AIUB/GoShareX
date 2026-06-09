import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, ViewStyle } from 'react-native';

/**
 * MatchGlow — match-করা rider-এর bubble প্রথমবার map-এ এলে একটা
 * "পেয়েছি!" entrance: একটু bounce (scale) + glow (shadow) করে স্থির হয়।
 *
 * হালকা: একবারই চলে (loop না), RN Animated। mount-এ একবার।
 * children = আসল bubble; এই component শুধু wrap করে animate করে।
 */
export default function MatchGlow({
  children,
  glowColor = '#22C55E',
}: {
  children: React.ReactNode;
  glowColor?: string;
}) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const glow = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // pop in (bounce)
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 140,
        useNativeDriver: true,
      }),
      // glow fade — উজ্জ্বল থেকে স্বাভাবিক
      Animated.timing(glow, {
        toValue: 0,
        duration: 1200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false, // shadow animate — JS driver
      }),
    ]).start();
  }, [scale, glow]);

  const glowStyle: Animated.WithAnimatedObject<ViewStyle> = {
    transform: [{ scale }],
    shadowColor: glowColor,
    shadowOpacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.95] }),
    shadowRadius: glow.interpolate({ inputRange: [0, 1], outputRange: [8, 18] }),
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  };

  return <Animated.View style={[s.wrap, glowStyle]}>{children}</Animated.View>;
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center' },
});
