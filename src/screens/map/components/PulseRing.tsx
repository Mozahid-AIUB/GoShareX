import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

/**
 * PulseRing — marker-এর পিছনে একটা আস্তে "breathing"/pulse ring।
 * match-করা rider-কে জীবন্ত (live) দেখায় — Uber-এর গাড়ির মতো।
 *
 * হালকা রাখা: RN built-in Animated (native driver), একটাই loop,
 * tracksViewChanges ছাড়া marker-এর ভেতরে — তাই map lag করবে না।
 */
export default function PulseRing({
  color = '#22C55E',
  size = 54,
}: {
  color?: string;
  size?: number;
}) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);

  return (
    <View pointerEvents="none" style={[s.center, { width: size, height: size }]}>
      <Animated.View
        style={[
          s.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            opacity,
            transform: [{ scale: scale.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
          },
        ]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 2.5 },
});
