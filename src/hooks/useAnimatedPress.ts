import { useRef } from 'react';
import { Animated } from 'react-native';

export function useAnimatedPress() {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 120 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80 }).start();
  return { scale, onPressIn, onPressOut };
}
