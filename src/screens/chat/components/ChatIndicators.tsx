/**
 * ChatIndicators — Animated visual indicators for ChatListScreen.
 */

import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { premiumTheme } from '@/design/premium';

const GREEN = premiumTheme.green;
const AMBER = premiumTheme.amber;
const RED = premiumTheme.rose;

/** Pulsing dot indicator. */
export const PulseDot = ({ color = GREEN }: { color?: string }) => {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.25, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);
  return (
    <Animated.View
      style={{
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: color,
        opacity: anim,
      }}
    />
  );
};

/** Circular countdown ring (SVG arc). */
export const CountdownRing = ({
  remaining,
  total,
}: {
  remaining: number;
  total: number;
}) => {
  const R = 54;
  const CIRC = 2 * Math.PI * R;
  const progress = Math.max(0, remaining / total);
  const dash = CIRC * progress;
  const color = remaining > 10 ? '#7C6FF7' : remaining > 5 ? AMBER : RED;
  return (
    <Svg width={130} height={130} viewBox="0 0 130 130">
      <Circle cx="65" cy="65" r={R} stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
      <Circle
        cx="65"
        cy="65"
        r={R}
        stroke={color}
        strokeWidth="8"
        fill="none"
        strokeDasharray={`${dash} ${CIRC}`}
        strokeLinecap="round"
        transform="rotate(-90 65 65)"
      />
    </Svg>
  );
};
