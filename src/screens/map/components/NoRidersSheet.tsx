/**
 * NoRidersSheet — Empty-state sheet shown when no riders found,
 * with sonar pulse animation, zone expansion, and post-for-later CTA.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { ZONE_LEVELS } from '../utils/mapHelpers';

const tap = (cb: () => void) => () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  cb();
};

// Press-feel button: scales down on tap, then springs back.
// Accepts flex via wrapperStyle so it can be used in a row layout where
// some buttons grow (CTA: flex:1) and others stay compact (chips).
const PressyChip = ({
  style,
  wrapperStyle,
  onPress,
  children,
}: {
  style: any;
  wrapperStyle?: any;
  onPress: () => void;
  children: React.ReactNode;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, tension: 200, friction: 8 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }).start()}
      onPress={onPress}
      style={wrapperStyle}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

type Props = {
  scanSecs: number;
  zoneIdx: number;
  onExpandZone: () => void;
  onPostForLater: () => void;
  onKeepWaiting: () => void;
  destination: string;
};

export const NoRidersSheet = ({
  scanSecs,
  zoneIdx,
  onExpandZone,
  onPostForLater,
  onKeepWaiting,
  destination,
}: Props) => {
  const slideAnim = useRef(new Animated.Value(180)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const ring1 = useRef(new Animated.Value(0.6)).current;
  const ring2 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Punchy spring entrance: slide up + scale pop + fade
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 90, friction: 7, useNativeDriver: false }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 240, useNativeDriver: false }),
    ]).start();

    const pulse = () => {
      ring1.setValue(0.6);
      ring2.setValue(0.3);
      Animated.parallel([
        Animated.timing(ring1, { toValue: 0, duration: 1800, useNativeDriver: false }),
        Animated.timing(ring2, { toValue: 0, duration: 1800, delay: 400, useNativeDriver: false }),
      ]).start(() => pulse());
    };
    pulse();
  }, [slideAnim, opacityAnim, ring1, ring2]);

  const timeStr = scanSecs < 60 ? `${scanSecs}s` : `${Math.floor(scanSecs / 60)}m ${scanSecs % 60}s`;
  const canExpand = zoneIdx < ZONE_LEVELS.length - 1;
  const currentZone = ZONE_LEVELS[zoneIdx];
  const nextZone = canExpand ? ZONE_LEVELS[zoneIdx + 1] : null;

  return (
    <Animated.View
      style={[
        nrs.sheet,
        { transform: [{ translateY: slideAnim }, { scale: scaleAnim }], opacity: opacityAnim },
      ]}
    >
      <View style={nrs.handle} />

      <View style={nrs.topRow}>
        <View style={nrs.sonarWrap}>
          <Animated.View style={[nrs.sonarRing, nrs.sonarRing1, { opacity: ring1 }]} />
          <Animated.View style={[nrs.sonarRing, nrs.sonarRing2, { opacity: ring2 }]} />
          <View style={nrs.sonarCore}>
            <Svg width={12} height={12} viewBox="0 0 12 12">
              <SvgCircle cx="6" cy="6" r="3" fill="#7C3AED" />
            </Svg>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <View style={nrs.titleRow}>
            <RNText style={nrs.statusTitle}>No riders found</RNText>
            <View style={nrs.timerBox}>
              <RNText style={nrs.timerNum}>{timeStr}</RNText>
            </View>
          </View>
          <View style={nrs.destRow}>
            <View style={nrs.destPin} />
            <RNText style={nrs.destName} numberOfLines={1}>
              {destination}
            </RNText>
            <RNText style={nrs.zoneLbl}>{currentZone}m</RNText>
          </View>
        </View>
      </View>

      <View style={nrs.actionsRow}>
        <PressyChip style={nrs.cta} wrapperStyle={{ flex: 1 }} onPress={tap(onPostForLater)}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
            <Path
              d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <SvgCircle cx="9" cy="7" r="4" stroke="#fff" strokeWidth="2.2" />
          </Svg>
          <RNText style={nrs.ctaText}>Post request</RNText>
        </PressyChip>

        <PressyChip style={nrs.chip} onPress={tap(onExpandZone)}>
          {canExpand ? (
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
                stroke="#7C3AED"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : (
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <Path
                d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"
                stroke="#7C3AED"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
          <RNText style={nrs.chipText}>{canExpand ? `${nextZone}m` : 'Retry'}</RNText>
        </PressyChip>

        <PressyChip style={[nrs.chip, nrs.chipMuted]} onPress={tap(onKeepWaiting)}>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <SvgCircle cx="12" cy="12" r="10" stroke="#94A3B8" strokeWidth="2" />
            <Path d="M12 6v6l4 2" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          </Svg>
          <RNText style={[nrs.chipText, { color: '#94A3B8' }]}>Wait</RNText>
        </PressyChip>
      </View>
    </Animated.View>
  );
};

const nrs = StyleSheet.create({
  sheet: {
    marginHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: {
    width: 32,
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sonarWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  sonarRing: { position: 'absolute', borderRadius: 40, borderWidth: 1.5 },
  sonarRing1: { width: 36, height: 36, borderColor: '#7C3AED' },
  sonarRing2: { width: 24, height: 24, borderColor: '#A78BFA' },
  sonarCore: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(124,58,237,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#7C3AED',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  timerBox: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  timerNum: { fontSize: 11, fontWeight: '700', color: '#64748B' },

  destRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  destPin: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7C3AED' },
  destName: { fontSize: 12, fontWeight: '500', color: '#475569', flex: 1 },
  zoneLbl: { fontSize: 11, fontWeight: '700', color: '#A78BFA' },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 11,
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  ctaText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F5F0FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  chipMuted: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
});
