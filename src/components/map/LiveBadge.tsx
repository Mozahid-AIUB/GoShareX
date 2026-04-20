import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import AppText from '../common/AppText';

const LiveBadge: React.FC = () => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.25,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.badge, { opacity }]}>
      <View style={styles.dot} />
      <AppText variant="overline" style={styles.label}>
        LIVE
      </AppText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E53935',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.5,
  },
});

export default LiveBadge;
