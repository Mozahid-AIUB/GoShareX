/**
 * StatusChips — Small visual indicator components for HomeScreen.
 * Self-contained (no external StyleSheet dependency).
 */

import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { IconLiveDot } from './HomeIcons';

const COLORS = {
  green: '#0D9488',
  greenSoft: 'rgba(13,148,136,0.1)',
  primary: '#6366F1',
  primarySoft: 'rgba(99,102,241,0.08)',
  accent: '#F59E0B',
  border: '#EDE8F5',
  textMuted: '#B0AACC',
};

/** Animated pulsing live dot using SVG gradient */
export const LiveDot = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);
  return (
    <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: COLORS.green,
          opacity: 0.25,
          transform: [{ scale: pulse }],
        }}
      />
      <IconLiveDot size={10} />
    </View>
  );
};

/** Trust badge chip */
export const TrustChip = ({
  badge,
  confirmed,
}: {
  badge: string;
  confirmed?: boolean;
}) => {
  const cfg = confirmed
    ? { bg: COLORS.greenSoft, text: COLORS.green, icon: 'check-circle' }
    : badge === 'Instant'
      ? { bg: COLORS.primarySoft, text: COLORS.primary, icon: 'lightning-bolt' }
      : badge === 'Trusted'
        ? { bg: COLORS.greenSoft, text: COLORS.green, icon: 'shield-check' }
        : badge === 'Elite Rider'
          ? { bg: '#F3E8FF', text: '#7C3AED', icon: 'star-circle' }
          : { bg: COLORS.border, text: COLORS.textMuted, icon: 'account' };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: cfg.bg,
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <MaterialCommunityIcons name={cfg.icon} size={11} color={cfg.text} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: cfg.text, letterSpacing: 0.3 }}>
        {confirmed ? 'Confirmed' : badge}
      </Text>
    </View>
  );
};

/** Match score ring */
export const MatchRing = ({ score }: { score: number }) => {
  const color = score >= 90 ? COLORS.green : score >= 75 ? COLORS.primary : COLORS.accent;
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2.5,
        borderColor: color,
        backgroundColor: color + '18',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '800', color }}>{score}</Text>
      <Text
        style={{
          fontSize: 7,
          color,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginTop: -1,
        }}
      >
        MATCH
      </Text>
    </View>
  );
};
