/**
 * LiveBadge — Pulsing "LIVE" indicator.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text as RNText, View } from 'react-native';

const GREEN = '#34D399';

export const LiveBadge = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);
  return (
    <View style={lv.wrap}>
      <Animated.View style={[lv.dot, { opacity: pulse }]} />
      <RNText style={lv.text}>LIVE</RNText>
    </View>
  );
};

const lv = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16,185,129,0.12)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  text: { color: GREEN, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
