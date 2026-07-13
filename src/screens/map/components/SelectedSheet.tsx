/**
 * SelectedSheet — Bottom sheet for the selected rider on LiveMapScreen.
 */

import React from 'react';
import { StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

import type { RiderMatch } from '@/services/firebase/matchingService';

import { IconChat, IconClose, IconStar } from './MapIcons';

const C = {
  surface: '#FFFFFF',
  cardBorder: '#EDE8F5',
  primary: '#C084FC',
  primaryDeep: '#9333EA',
  text: '#1A1A2E',
  textSub: '#6B6980',
  textMuted: '#9896A8',
  teal: '#0D9488',
  white: '#FFFFFF',
  matchGreen: '#0D9488',
  matchGreenDeep: '#0B7A70',
  nearbyOrange: '#FB923C',
  nearbyOrangeDeep: '#EA7C1C',
};

const BTN_GRADIENTS: Record<'idle' | 'pending' | 'confirmed', [string, string]> = {
  idle: [C.primaryDeep, C.primary],
  pending: [C.nearbyOrangeDeep, C.nearbyOrange],
  confirmed: [C.matchGreenDeep, C.matchGreen],
};

type Props = {
  rider: RiderMatch;
  meetupRoute: { distanceText: string; durationText: string; summary: string } | null;
  requestState: 'idle' | 'pending' | 'confirmed';
  onOffer: (r: RiderMatch) => void;
  onClose: () => void;
};

export const SelectedSheet = ({ rider, meetupRoute, requestState, onOffer, onClose }: Props) => {
  const isMatch = rider.isMatch;
  const accentColor = isMatch ? C.matchGreen : C.nearbyOrange;
  const confirmed = requestState === 'confirmed';
  const pending = requestState === 'pending';
  const btnLabel = confirmed ? 'Open Chat' : pending ? 'Request Sent · Waiting' : 'Send Request';
  const btnState: 'idle' | 'pending' | 'confirmed' = confirmed ? 'confirmed' : pending ? 'pending' : 'idle';
  return (
    <View style={ss.wrap}>
      <View style={ss.handle} />

      {/* ── Header row: avatar + identity + close ── */}
      <View style={ss.row}>
        <View style={[ss.avatar, { borderColor: accentColor }]}>
          <RNText style={ss.avatarText}>{rider.name.charAt(0).toUpperCase()}</RNText>
          <View style={[ss.statusDot, { backgroundColor: accentColor }]} />
        </View>

        <View style={ss.info}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <RNText style={ss.name} numberOfLines={1}>
              {rider.name}
            </RNText>
            {isMatch && (
              <View style={ss.matchBadge}>
                <RNText style={ss.matchText}>MATCH</RNText>
              </View>
            )}
          </View>

          {/* meta chips inline — dest · distance · rating */}
          <View style={ss.metaLine}>
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                fill={C.textSub}
              />
              <SvgCircle cx="12" cy="9" r="2.5" fill={C.surface} />
            </Svg>
            <RNText style={ss.dest} numberOfLines={1}>
              {rider.destination}
            </RNText>
            <View style={ss.dotSep} />
            <RNText style={ss.meta}>{rider.distance}m</RNText>
            <View style={ss.dotSep} />
            <IconStar size={11} />
            <RNText style={ss.meta}>{rider.rating.toFixed(1)}</RNText>
          </View>
        </View>

        <TouchableOpacity onPress={onClose} style={ss.close} hitSlop={8}>
          <IconClose />
        </TouchableOpacity>
      </View>

      {/* ── Action row: walk pill (left) + request button (right, gradient) ── */}
      <View style={ss.actions}>
        {meetupRoute ? (
          <View style={ss.walkPill}>
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
              <Path
                d="M13 4a1 1 0 10-2 0 1 1 0 002 0zM7 20l3-8 2 3 3-5 2 10"
                stroke={C.teal}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <RNText style={ss.walk} numberOfLines={1}>
              {meetupRoute.distanceText} · ~{meetupRoute.durationText}
            </RNText>
          </View>
        ) : null}
        <TouchableOpacity
          style={ss.chatBtnTouchable}
          onPress={() => onOffer(rider)}
          activeOpacity={0.85}
          disabled={pending}
        >
          <LinearGradient
            colors={BTN_GRADIENTS[btnState]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={ss.chatBtn}
          >
            {confirmed && <IconChat />}
            <RNText style={ss.chatText}>{btnLabel}</RNText>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ss = StyleSheet.create({
  wrap: {
    marginHorizontal: 10,
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    overflow: 'hidden',
    elevation: 14,
    shadowColor: '#3A2E5C',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: {
    width: 30,
    height: 3,
    backgroundColor: '#E4E0F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3E8FF',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '900', color: C.primaryDeep },
  statusDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
    borderColor: C.surface,
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: -0.3, flexShrink: 1 },
  matchBadge: {
    backgroundColor: 'rgba(13,148,136,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: 'rgba(13,148,136,0.3)',
  },
  matchText: { fontSize: 8, color: C.matchGreen, fontWeight: '800', letterSpacing: 0.3 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  dest: { fontSize: 12, color: C.textSub, fontWeight: '600', flexShrink: 1 },
  meta: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  dotSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.textMuted,
    marginHorizontal: 2,
  },
  walkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(13,148,136,0.08)',
    borderWidth: 0.8,
    borderColor: 'rgba(13,148,136,0.22)',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
  },
  walk: { fontSize: 10, color: C.teal, fontWeight: '700' },
  close: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FA',
    borderRadius: 14,
  },
  actions: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginTop: 8 },
  chatBtnTouchable: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: C.primaryDeep,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 9,
  },
  chatText: { color: C.white, fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 },
});
