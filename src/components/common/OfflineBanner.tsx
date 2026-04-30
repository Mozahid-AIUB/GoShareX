import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import NetInfo, { useNetInfo } from '@react-native-community/netinfo';

export default function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetInfo();
  const slideY = useRef(new Animated.Value(-48)).current;
  const offline = isConnected === false || isInternetReachable === false;

  useEffect(() => {
    Animated.spring(slideY, {
      toValue: offline ? 0 : -48,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [offline]);

  return (
    <Animated.View style={[s.bar, { transform: [{ translateY: slideY }] }]}>
      <View style={s.dot} />
      <Text style={s.text}>No internet connection</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 9999,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
