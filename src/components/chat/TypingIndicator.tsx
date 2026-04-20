import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import AppText from '../common/AppText';

interface TypingIndicatorProps {
  partnerName?: string;
}

const DOT_COUNT = 3;
const BOUNCE_HEIGHT = 6;
const ANIMATION_DURATION = 300;
const STAGGER_DELAY = 120;

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ partnerName }) => {
  const dots = useRef(
    Array.from({ length: DOT_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const animations = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * STAGGER_DELAY),
          Animated.timing(dot, {
            toValue: 1,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
          }),
          Animated.delay((DOT_COUNT - index) * STAGGER_DELAY),
        ]),
      ),
    );

    animations.forEach((anim) => anim.start());
    return () => animations.forEach((anim) => anim.stop());
  }, [dots]);

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        {dots.map((dot, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                transform: [
                  {
                    translateY: dot.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -BOUNCE_HEIGHT],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
      {partnerName ? (
        <AppText variant="caption" style={styles.label}>
          {partnerName.split(' ')[0]} typing...
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'flex-start',
    gap: 4,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#9CA3AF',
  },
  label: {
    color: '#9CA3AF',
    marginLeft: 4,
    fontSize: 11,
  },
});

export default TypingIndicator;
