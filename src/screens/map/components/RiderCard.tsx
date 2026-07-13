/**
 * RiderCard — Horizontal scrollable card showing a nearby rider.
 */

import React from 'react';
import { Dimensions, StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

import VehicleIcon from '@/components/common/VehicleIcon';
import type { RiderMatch } from '@/services/firebase/matchingService';
import type { VehicleType } from '@/store/rideStore';

import { IconChat, IconStar } from './MapIcons';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW * 0.58;

const C = {
  bg: '#050816',
  surface: '#0A1022',
  card: 'rgba(12,18,38,0.92)',
  cardBorder: 'rgba(192,132,252,0.12)',
  primary: '#C084FC',
  primaryDeep: '#9333EA',
  text: '#EEF2FF',
  textSub: '#8892A4',
  textMuted: '#4A5568',
  amber: '#F59E0B',
  green: '#34D399',
  white: '#FFFFFF',
  matchGreen: '#34D399',
  matchGreenDeep: '#0FA574',
  nearbyOrange: '#FB923C',
};

const OFFER_GRADIENTS: Record<'idle' | 'pending' | 'confirmed', [string, string]> = {
  idle: [C.primaryDeep, C.primary],
  pending: [C.amber, C.amber],
  confirmed: [C.matchGreenDeep, C.matchGreen],
};

type Props = {
  rider: RiderMatch;
  requestState: 'idle' | 'pending' | 'confirmed';
  onOffer: (r: RiderMatch) => void;
  onChat: (r: RiderMatch) => void;
  onPress: (r: RiderMatch) => void;
};

export const RiderCard = ({ rider, requestState, onOffer, onChat, onPress }: Props) => {
  const isMatch = rider.isMatch;
  const accentColor = isMatch ? C.matchGreen : C.nearbyOrange;
  const vehicleType = (rider.vehicleType as VehicleType) ?? 'rickshaw';
  const vehicleIconType: 'motorcycle' | 'cng' | 'rickshaw' =
    vehicleType === 'bike' ? 'motorcycle' : vehicleType === 'cng' ? 'cng' : 'rickshaw';
  const vehicleIconTone: 'indigo' | 'teal' | 'amber' =
    vehicleType === 'bike' ? 'indigo' : vehicleType === 'cng' ? 'teal' : 'amber';

  const offerState: 'idle' | 'pending' | 'confirmed' =
    requestState === 'confirmed' ? 'confirmed' : requestState === 'pending' ? 'pending' : 'idle';

  return (
    <TouchableOpacity onPress={() => onPress(rider)} activeOpacity={0.85} style={rc.outer}>
      <View style={[rc.accentBar, { backgroundColor: accentColor }]} />

      <View style={rc.row}>
        <View style={[rc.avatarWrap, { borderColor: accentColor }]}>
          <RNText style={rc.avatarLetter}>{rider.name.charAt(0).toUpperCase()}</RNText>
        </View>

        <View style={rc.info}>
          <View style={rc.nameRow}>
            <RNText style={rc.name} numberOfLines={1}>
              {rider.name}
            </RNText>
            {isMatch && (
              <View style={rc.matchPill}>
                <RNText style={rc.matchPillText}>✓ MATCH</RNText>
              </View>
            )}
          </View>
          <View style={rc.destRow}>
            <Svg width={9} height={9} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                fill={C.textSub}
              />
              <SvgCircle cx="12" cy="9" r="2.5" fill={C.bg} />
            </Svg>
            <RNText style={rc.dest} numberOfLines={1}>
              {rider.destination}
            </RNText>
          </View>
          <View style={rc.metaRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Svg width={9} height={9} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M2 12h20M12 2l10 10-10 10"
                  stroke={C.textMuted}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <RNText style={rc.metaChip}>{rider.distance}m</RNText>
            </View>
            <View style={rc.starRow}>
              <IconStar size={9} />
              <RNText style={rc.rating}>{rider.rating.toFixed(1)}</RNText>
            </View>
            <View style={rc.vehicle}>
              <VehicleIcon type={vehicleIconType} size={18} tone={vehicleIconTone} />
            </View>
          </View>
        </View>
      </View>

      <View style={rc.actions}>
        <TouchableOpacity style={rc.offerBtnTouchable} onPress={() => onOffer(rider)} activeOpacity={0.85}>
          <LinearGradient colors={OFFER_GRADIENTS[offerState]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={rc.offerBtn}>
            <RNText style={rc.offerText}>
              {requestState === 'confirmed'
                ? 'Open Chat'
                : requestState === 'pending'
                  ? 'Pending'
                  : 'Send Offer'}
            </RNText>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={rc.chatBtn} onPress={() => onChat(rider)} activeOpacity={0.8}>
          <IconChat />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const rc = StyleSheet.create({
  outer: {
    width: CARD_W,
    backgroundColor: '#0E1430',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.20)',
    marginRight: 8,
    elevation: 5,
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  accentBar: { height: 2, width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingBottom: 4, gap: 7 },
  avatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(192,132,252,0.15)',
    borderWidth: 1.2,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 12, fontWeight: '900', color: C.text },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 1 },
  name: { fontSize: 12, fontWeight: '800', color: C.text, flex: 1, letterSpacing: -0.2 },
  matchPill: {
    backgroundColor: 'rgba(52,211,153,0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.8,
    borderColor: 'rgba(52,211,153,0.35)',
  },
  matchPillText: { fontSize: 6.5, color: C.matchGreen, fontWeight: '800', letterSpacing: 0.2 },
  destRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 },
  dest: { fontSize: 9, color: C.textSub, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaChip: { fontSize: 8.5, color: C.textMuted, fontWeight: '600' },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rating: { fontSize: 8.5, color: C.amber, fontWeight: '700' },
  vehicle: { width: 12, height: 12 },
  actions: { flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 8, gap: 5 },
  offerBtnTouchable: { flex: 1, borderRadius: 9, overflow: 'hidden', elevation: 3 },
  offerBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerText: { color: C.white, fontSize: 10, fontWeight: '800', letterSpacing: -0.15 },
  chatBtn: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: 'rgba(192,132,252,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
});
