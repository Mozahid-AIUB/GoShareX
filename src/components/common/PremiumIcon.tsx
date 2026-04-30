import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type GradientPair = [string, string];

const GRADIENTS = {
  amber: ['#FBBF24', '#F97316'] as GradientPair,
  violet: ['#8B5CF6', '#6366F1'] as GradientPair,
  green: ['#34D399', '#059669'] as GradientPair,
  red: ['#FB7185', '#EF4444'] as GradientPair,
  blue: ['#38BDF8', '#2563EB'] as GradientPair,
  teal: ['#2DD4BF', '#0F766E'] as GradientPair,
  slate: ['#94A3B8', '#64748B'] as GradientPair,
} as const;

export type PremiumTone = keyof typeof GRADIENTS;

interface PremiumIconProps {
  name: string;
  size?: number;
  tone?: PremiumTone;
  iconColor?: string;
  containerStyle?: ViewStyle;
}

export default function PremiumIcon({
  name,
  size = 16,
  tone = 'violet',
  iconColor = '#FFFFFF',
  containerStyle,
}: PremiumIconProps) {
  const boxSize = size + 10;
  const radius = Math.max(10, boxSize / 2.2);
  const gradientId = `premium-${tone}-${size}`;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: boxSize,
          height: boxSize,
          borderRadius: radius,
        },
        containerStyle,
      ]}
    >
      <Svg width={boxSize} height={boxSize} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={GRADIENTS[tone][0]} />
            <Stop offset="1" stopColor={GRADIENTS[tone][1]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={boxSize} height={boxSize} rx={radius} ry={radius} fill={`url(#${gradientId})`} />
      </Svg>
      <View style={styles.innerGlow}>
        <MaterialCommunityIcons name={name} size={size} color={iconColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  innerGlow: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    padding: 1,
  },
});
