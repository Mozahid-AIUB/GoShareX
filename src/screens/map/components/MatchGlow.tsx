import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

/**
 * MatchGlow — match-করা rider-এর bubble প্রথমবার map-এ এলে একটা
 * "পেয়েছি!" entrance bounce (spring scale) দিয়ে আসে।
 *
 * শুধু scale (native driver) — shadow animation বাদ দেওয়া হয়েছে কারণ
 * একই node-এ native (transform) + JS (shadow) driver মেশালে RN error দেয়
 * ("animated node moved to native earlier")। glow-এর কাজ PulseRing করে।
 *
 * glowColor prop রাখা হয়েছে API একই রাখতে (এখন ব্যবহার হয় না)।
 */
export default function MatchGlow({
  children,
}: {
  children: React.ReactNode;
  glowColor?: string;
}) {
  const scale = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <Animated.View style={[s.wrap, { transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center' },
});
