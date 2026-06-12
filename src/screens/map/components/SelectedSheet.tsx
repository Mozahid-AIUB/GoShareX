/**
 * SelectedSheet — Bottom sheet for the selected rider on LiveMapScreen.
 */

import React from 'react';
import { StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

import type { RiderMatch } from '@/services/firebase/matchingService';

import { IconChat, IconClose, IconStar } from './MapIcons';

const C = {
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
  onChat: (r: RiderMatch) => void;
  onClose: () => void;
};

export const SelectedSheet = ({ rider, meetupRoute, onChat, onClose }: Props) => {
  const isMatch = rider.isMatch;
  const accentColor = isMatch ? C.matchGreen : C.nearbyOrange;
  return (
    <View style={ss.wrap}>
      <View style={ss.handle} />
      <View style={ss.row}>
        <View style={[ss.avatar, { borderColor: accentColor }]}>
          <RNText style={ss.avatarText}>{rider.name.charAt(0).toUpperCase()}</RNText>
        </View>
        <View style={ss.info}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <RNText style={ss.name}>{rider.name}</RNText>
            {isMatch && (
              <View style={ss.matchBadge}>
                <RNText style={ss.matchText}>MATCH</RNText>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                fill={C.textSub}
              />
              <SvgCircle cx="12" cy="9" r="2.5" fill="#0A1022" />
            </Svg>
            <RNText style={ss.dest}>{rider.destination}</RNText>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M2 12h20M12 2l10 10-10 10"
                  stroke={C.textMuted}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <RNText style={ss.meta}>{rider.distance}m away</RNText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <IconStar size={12} />
              <RNText style={ss.meta}>{rider.rating.toFixed(1)}</RNText>
            </View>
          </View>
          {meetupRoute ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M13 4a1 1 0 10-2 0 1 1 0 002 0zM7 20l3-8 2 3 3-5 2 10"
                  stroke={C.teal}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <RNText style={ss.walk}>
                Walk {meetupRoute.distanceText} · ~{meetupRoute.durationText}
              </RNText>
            </View>
          ) : null}
        </View>
        <TouchableOpacity onPress={onClose} style={ss.close}>
          <IconClose />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={ss.chatBtn} onPress={() => onChat(rider)} activeOpacity={0.85}>
        <IconChat />
        <RNText style={ss.chatText}>Open Chat</RNText>
      </TouchableOpacity>
    </View>
  );
};

const ss = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    backgroundColor: '#0A1022',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.16)',
    padding: 16,
    elevation: 14,
    shadowColor: '#C084FC',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: {
    width: 32,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(192,132,252,0.12)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 21, fontWeight: '900', color: C.text },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  matchBadge: {
    backgroundColor: 'rgba(52,211,153,0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
  },
  matchText: { fontSize: 8, color: C.matchGreen, fontWeight: '800' },
  dest: { fontSize: 12, color: C.textSub, marginTop: 4 },
  meta: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  walk: { fontSize: 11, color: C.teal, marginTop: 6, fontWeight: '700' },
  close: { padding: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C084FC',
    borderRadius: 16,
    paddingVertical: 13,
    marginTop: 14,
    elevation: 4,
  },
  chatText: { color: C.white, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
});
