/**
 * ChatBadges — Small visual components for ChatScreen.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

const C = {
  text: '#E2E8F0',
  green: '#10B981',
};

export const MiniAvatar = ({ label, gradient }: { label: string; gradient?: boolean }) => (
  <View style={[av.wrap, gradient && av.gradient]}>
    <Text style={av.text}>{label.charAt(0).toUpperCase()}</Text>
  </View>
);

const av = StyleSheet.create({
  wrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(99,102,241,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: { backgroundColor: 'rgba(20,184,166,0.25)' },
  text: { fontSize: 12, fontWeight: '800', color: C.text },
});

export const LiveDot = ({ color = C.green }: { color?: string }) => {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);
  return (
    <Animated.View
      style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color, opacity: anim }}
    />
  );
};
