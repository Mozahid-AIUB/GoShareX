/**
 * RiderCard — Horizontal scrollable card showing a nearby rider.
 */

import React from 'react';
import { Dimensions, StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

import VehicleIcon from '@/components/common/VehicleIcon';
import type { RiderMatch } from '@/services/firebase/matchingService';
import type { VehicleType } from '@/store/rideStore';

import { IconChat, IconStar } from './MapIcons';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW * 0.72;

const C = {
  bg: '#050816',
  text: '#EEF2FF',
  textSub: '#8892A4',
  textMuted: '#4A5568',
  amber: '#F59E0B',
  green: '#34D399',
  white: '#FFFFFF',
  matchGreen: '#34D399',
  nearbyOrange: '#FB923C',
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 7 }}>
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
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
              <RNText style={rc.metaChip}>{rider.distance}m</RNText>
            </View>
            <View style={rc.starRow}>
              <IconStar size={11} />
              <RNText style={rc.rating}>{rider.rating.toFixed(1)}</RNText>
            </View>
            <View style={rc.vehicle}>
              <VehicleIcon type={vehicleIconType} size={28} tone={vehicleIconTone} />
            </View>
          </View>
        </View>
      </View>

      <View style={rc.actions}>
        <TouchableOpacity
          style={[
            rc.offerBtn,
            requestState === 'confirmed'
              ? rc.offerConfirmed
              : requestState === 'pending'
                ? rc.offerPending
                : null,
          ]}
          onPress={() => onOffer(rider)}
          activeOpacity={0.8}
        >
          <RNText style={rc.offerText}>
            {requestState === 'confirmed'
              ? 'Open Chat'
              : requestState === 'pending'
                ? 'Pending'
                : 'Send Offer'}
          </RNText>
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
    backgroundColor: '#0A1022',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.14)',
    marginRight: 12,
    elevation: 6,
    shadowColor: '#C084FC',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  accentBar: { height: 2.5, width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 8, gap: 12 },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(192,132,252,0.12)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 20, fontWeight: '900', color: C.text },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '800', color: C.text, flex: 1, letterSpacing: -0.3 },
  matchPill: {
    backgroundColor: 'rgba(52,211,153,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
  },
  matchPillText: { fontSize: 8, color: C.matchGreen, fontWeight: '800', letterSpacing: 0.5 },
  dest: { fontSize: 12, color: C.textSub, marginBottom: 7 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaChip: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontSize: 11, color: C.amber, fontWeight: '700' },
  vehicle: { width: 18, height: 18 },
  actions: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  offerBtn: {
    flex: 1,
    backgroundColor: '#C084FC',
    paddingVertical: 10,
    borderRadius: 13,
    alignItems: 'center',
    elevation: 3,
  },
  offerPending: { backgroundColor: C.amber },
  offerConfirmed: { backgroundColor: C.green },
  offerText: { color: C.white, fontSize: 12, fontWeight: '800', letterSpacing: -0.2 },
  chatBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(192,132,252,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.25)',
  },
});
