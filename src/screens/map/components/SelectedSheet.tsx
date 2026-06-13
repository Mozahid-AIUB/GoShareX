/**
 * SelectedSheet — Bottom sheet for the selected rider on LiveMapScreen.
 */

import React from 'react';
import { StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

import type { RiderMatch } from '@/services/firebase/matchingService';

import { IconChat, IconClose, IconStar } from './MapIcons';

const C = {
  surface: '#0A1022',
  cardBorder: 'rgba(192,132,252,0.12)',
  primary: '#C084FC',
  text: '#EEF2FF',
  textSub: '#8892A4',
  textMuted: '#4A5568',
  teal: '#34D399',
  white: '#FFFFFF',
  matchGreen: '#34D399',
  nearbyOrange: '#FB923C',
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

      {/* ── Walk pill (only if route known) ── */}
      {meetupRoute ? (
        <View style={ss.walkPill}>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <Path
              d="M13 4a1 1 0 10-2 0 1 1 0 002 0zM7 20l3-8 2 3 3-5 2 10"
              stroke={C.teal}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <RNText style={ss.walk}>
            {meetupRoute.distanceText} walk · ~{meetupRoute.durationText}
          </RNText>
        </View>
      ) : null}

      {/* ── Action: request flow → pending → chat (same logic as Home) ── */}
      <View style={ss.actions}>
        <TouchableOpacity
          style={[ss.chatBtn, confirmed ? ss.btnConfirmed : pending ? ss.btnPending : null]}
          onPress={() => onOffer(rider)}
          activeOpacity={0.85}
          disabled={pending}
        >
          {confirmed && <IconChat />}
          <RNText style={ss.chatText}>{btnLabel}</RNText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ss = StyleSheet.create({
  wrap: {
    marginHorizontal: 10,
    backgroundColor: '#0E1430',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.22)',
    paddingHorizontal: 13,
    paddingTop: 8,
    paddingBottom: 11,
    overflow: 'hidden',
    elevation: 18,
    shadowColor: C.primary,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: {
    width: 32,
    height: 3.5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 9,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(192,132,252,0.15)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '900', color: C.text },
  statusDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
    borderColor: '#0E1430',
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: -0.3, flexShrink: 1 },
  matchBadge: {
    backgroundColor: 'rgba(52,211,153,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: 'rgba(52,211,153,0.35)',
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
    alignSelf: 'center',
    gap: 5,
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderWidth: 0.8,
    borderColor: 'rgba(52,211,153,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  walk: { fontSize: 10.5, color: C.teal, fontWeight: '700' },
  close: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 13,
    paddingVertical: 11,
    elevation: 6,
    shadowColor: C.primary,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  btnPending: { backgroundColor: C.nearbyOrange, shadowColor: C.nearbyOrange },
  btnConfirmed: { backgroundColor: C.matchGreen, shadowColor: C.matchGreen },
  chatText: { color: C.white, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
});
