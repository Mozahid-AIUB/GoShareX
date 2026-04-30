import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Avatar } from 'react-native-paper';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle as SvgCircle, G } from 'react-native-svg';
import VehicleIcon from '@/components/common/VehicleIcon';

import { getDestinationById } from '@/constants/destinations';
import { getPickupPointById } from '@/constants/pickupPoints';
import directionsService from '@/services/google/directionsService';
import routesService from '@/services/google/routesService';
import { useAuthStore } from '@/store/authStore';
import { useLocationStore } from '@/store/locationStore';
import { useRideStore, VEHICLE_CONFIG, VehicleType } from '@/store/rideStore';
import locationService from '@/services/firebase/locationService';
import matchingService, { RiderMatch, getSearchRadius } from '@/services/firebase/matchingService';
import { calculateDistance } from '@/utils/haversine';
import { sanitizeSpeedKmh } from '@/utils/locationSpeed';

const { width: SW } = Dimensions.get('window');
const MY_LOCATION_PICKUP_ID = 'current_location';

// ─── Design tokens — matches HomeScreen premium theme ─────────────────────────
const C = {
  bg: '#050816',
  card: 'rgba(12,18,38,0.96)',
  cardSolid: '#0A1022',
  cardBorder: 'rgba(255,255,255,0.07)',
  primary: '#C084FC',
  primaryLight: 'rgba(192,132,252,0.16)',
  teal: '#34D399',
  amber: '#F59E0B',
  green: '#34D399',
  red: '#FB7185',
  text: '#EEF2FF',
  textSub: '#8892A4',
  textMuted: '#4A5568',
  white: '#FFFFFF',
  routeBlue: '#818CF8',
  matchGreen: '#34D399',
  nearbyOrange: '#FB923C',
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IconBack = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={C.text} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCenter = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <SvgCircle cx="12" cy="12" r="3" stroke={C.primary} strokeWidth="2" />
    <Path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke={C.primary} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconStar = ({ size = 12 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={C.amber}>
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
);

const IconChat = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);


const IconClose = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={C.textSub} strokeWidth="2.2" strokeLinecap="round" />
  </Svg>
);

// ─── Utilities ────────────────────────────────────────────────────────────────
const decodePolyline = (encoded: string): Array<{ latitude: number; longitude: number }> => {
  const pts: Array<{ latitude: number; longitude: number }> = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    let r = 0, s = 0, b: number;
    do { b = encoded.charCodeAt(i++) - 63; r |= (b & 0x1f) << s; s += 5; } while (b >= 0x20);
    lat += (r & 1) ? ~(r >> 1) : r >> 1;
    r = 0; s = 0;
    do { b = encoded.charCodeAt(i++) - 63; r |= (b & 0x1f) << s; s += 5; } while (b >= 0x20);
    lng += (r & 1) ? ~(r >> 1) : r >> 1;
    pts.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return pts;
};

const safeDecodePolyline = (encoded?: string) => {
  if (!encoded) return [];
  try { return decodePolyline(encoded); } catch { return []; }
};

const matchesPickup = (rp: string | undefined, id: string | null, name: string | undefined) => {
  if (!id) return true;
  if (!rp) return false;
  return rp === id || rp === name || rp.toLowerCase() === id.toLowerCase() || rp.toLowerCase() === (name ?? '').toLowerCase();
};

const distanceToRoute = (pt: { latitude: number; longitude: number }, coords: Array<{ latitude: number; longitude: number }>) => {
  if (!coords.length) return Infinity;
  return coords.reduce((min, c) => Math.min(min, calculateDistance(pt.latitude, pt.longitude, c.latitude, c.longitude)), Infinity);
};

// ─── Speedometer widget ───────────────────────────────────────────────────────
const MAX_SPEED = 80;
const SPEEDO_R = 24;
const SPEEDO_STROKE = 4;
const SPEEDO_CX = 32;
const SPEEDO_CY = 32;
const SPEEDO_SIZE = 64;

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

const Speedometer = ({ speedKmh }: { speedKmh: number | null }) => {
  const speed = Math.max(0, Math.min(speedKmh ?? 0, MAX_SPEED));
  const START_DEG = 135;
  const END_DEG = 405;
  const fillDeg = START_DEG + ((END_DEG - START_DEG) * speed) / MAX_SPEED;

  const isMoving = speed > 2;
  const arcColor = speed > 60 ? '#FB7185' : speed > 30 ? '#F59E0B' : '#34D399';

  const trackPath = arcPath(SPEEDO_CX, SPEEDO_CY, SPEEDO_R, START_DEG, END_DEG);
  const fillPath  = speed > 0.5 ? arcPath(SPEEDO_CX, SPEEDO_CY, SPEEDO_R, START_DEG, fillDeg) : null;

  return (
    <View style={sp.wrap}>
      <Svg width={SPEEDO_SIZE} height={SPEEDO_SIZE} viewBox={`0 0 ${SPEEDO_SIZE} ${SPEEDO_SIZE}`}>
        {/* Track */}
        <Path d={trackPath} stroke="rgba(255,255,255,0.1)" strokeWidth={SPEEDO_STROKE} fill="none" strokeLinecap="round" />
        {/* Fill arc */}
        {fillPath && (
          <Path d={fillPath} stroke={arcColor} strokeWidth={SPEEDO_STROKE} fill="none" strokeLinecap="round" />
        )}
        {/* Centre dot */}
        <SvgCircle cx={SPEEDO_CX} cy={SPEEDO_CY} r={3} fill={isMoving ? arcColor : 'rgba(255,255,255,0.25)'} />
      </Svg>
      {/* Speed value overlay */}
      <View style={sp.label}>
        <RNText style={[sp.value, isMoving && { color: arcColor }]}>
          {speedKmh == null ? '--' : Math.round(speed)}
        </RNText>
        <RNText style={sp.unit}>km/h</RNText>
      </View>
    </View>
  );
};
const sp = StyleSheet.create({
  wrap:  { width: SPEEDO_SIZE, height: SPEEDO_SIZE, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,10,25,0.92)', borderRadius: SPEEDO_SIZE / 2, borderWidth: 1.5, borderColor: 'rgba(52,211,153,0.3)', elevation: 14, shadowColor: '#34D399', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  label: { position: 'absolute', alignItems: 'center' },
  value: { fontSize: 14, fontWeight: '900', color: '#ECFDF5', lineHeight: 16, letterSpacing: -0.5 },
  unit:  { fontSize: 6, fontWeight: '800', color: '#6EE7B7', letterSpacing: 0.8, marginTop: 1 },
});

// ─── Live pulse badge ─────────────────────────────────────────────────────────
const LiveBadge = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={lv.wrap}>
      <Animated.View style={[lv.dot, { opacity: pulse }]} />
      <RNText style={lv.text}>LIVE</RNText>
    </View>
  );
};
const lv = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  text: { color: C.green, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});

// ─── Rider card (horizontal scroll) ──────────────────────────────────────────
const RiderCard = ({ rider, requestState, onOffer, onChat, onPress }: {
  rider: RiderMatch;
  requestState: 'idle' | 'pending' | 'confirmed';
  onOffer: (r: RiderMatch) => void;
  onChat: (r: RiderMatch) => void;
  onPress: (r: RiderMatch) => void;
}) => {
  const isMatch = rider.isMatch;
  const accentColor = isMatch ? C.matchGreen : C.nearbyOrange;
  const vehicleType = (rider.vehicleType as VehicleType) ?? 'rickshaw';
  const vehicleIconType: 'motorcycle' | 'cng' | 'rickshaw' =
    vehicleType === 'bike' ? 'motorcycle' : vehicleType === 'cng' ? 'cng' : 'rickshaw';
  const vehicleIconTone: 'indigo' | 'teal' | 'amber' =
    vehicleType === 'bike' ? 'indigo' : vehicleType === 'cng' ? 'teal' : 'amber';

  return (
    <TouchableOpacity onPress={() => onPress(rider)} activeOpacity={0.85} style={rc.outer}>
      {/* Accent top border */}
      <View style={[rc.accentBar, { backgroundColor: accentColor }]} />

      <View style={rc.row}>
        {/* Avatar */}
        <View style={[rc.avatarWrap, { borderColor: accentColor }]}>
          <RNText style={rc.avatarLetter}>{rider.name.charAt(0).toUpperCase()}</RNText>
        </View>

        {/* Info */}
        <View style={rc.info}>
          <View style={rc.nameRow}>
            <RNText style={rc.name} numberOfLines={1}>{rider.name}</RNText>
            {isMatch && <View style={rc.matchPill}><RNText style={rc.matchPillText}>✓ MATCH</RNText></View>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 7 }}>
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none"><Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={C.textSub}/><SvgCircle cx="12" cy="9" r="2.5" fill={C.bg}/></Svg>
            <RNText style={rc.dest} numberOfLines={1}>{rider.destination}</RNText>
          </View>
          <View style={rc.metaRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Svg width={11} height={11} viewBox="0 0 24 24" fill="none"><Path d="M2 12h20M12 2l10 10-10 10" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></Svg>
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

      {/* Actions */}
      <View style={rc.actions}>
        <TouchableOpacity
          style={[rc.offerBtn, requestState === 'confirmed' ? rc.offerConfirmed : requestState === 'pending' ? rc.offerPending : null]}
          onPress={() => onOffer(rider)}
          activeOpacity={0.8}
        >
          <RNText style={rc.offerText}>
            {requestState === 'confirmed' ? 'Open Chat' : requestState === 'pending' ? 'Pending' : 'Send Offer'}
          </RNText>
        </TouchableOpacity>
        <TouchableOpacity style={rc.chatBtn} onPress={() => onChat(rider)} activeOpacity={0.8}>
          <IconChat />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const CARD_W = SW * 0.72;
const rc = StyleSheet.create({
  outer: { width: CARD_W, backgroundColor: '#0A1022', borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(192,132,252,0.14)', marginRight: 12, elevation: 6, shadowColor: '#C084FC', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  accentBar: { height: 2.5, width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 8, gap: 12 },
  avatarWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(192,132,252,0.12)', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 20, fontWeight: '900', color: C.text },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '800', color: C.text, flex: 1, letterSpacing: -0.3 },
  matchPill: { backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)' },
  matchPillText: { fontSize: 8, color: C.matchGreen, fontWeight: '800', letterSpacing: 0.5 },
  dest: { fontSize: 12, color: C.textSub, marginBottom: 7 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaChip: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontSize: 11, color: C.amber, fontWeight: '700' },
  vehicle: { width: 18, height: 18 },
  actions: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  offerBtn: { flex: 1, backgroundColor: '#C084FC', paddingVertical: 10, borderRadius: 13, alignItems: 'center', elevation: 3 },
  offerPending: { backgroundColor: C.amber },
  offerConfirmed: { backgroundColor: C.green },
  offerText: { color: C.white, fontSize: 12, fontWeight: '800', letterSpacing: -0.2 },
  chatBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(192,132,252,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(192,132,252,0.25)' },
});

// ─── Selected rider bottom sheet ──────────────────────────────────────────────
const SelectedSheet = ({ rider, meetupRoute, onChat, onClose }: {
  rider: RiderMatch;
  meetupRoute: { distanceText: string; durationText: string; summary: string } | null;
  onChat: (r: RiderMatch) => void;
  onClose: () => void;
}) => {
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
            {isMatch && <View style={ss.matchBadge}><RNText style={ss.matchText}>MATCH</RNText></View>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none"><Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={C.textSub}/><SvgCircle cx="12" cy="9" r="2.5" fill="#0A1022"/></Svg>
            <RNText style={ss.dest}>{rider.destination}</RNText>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Svg width={11} height={11} viewBox="0 0 24 24" fill="none"><Path d="M2 12h20M12 2l10 10-10 10" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></Svg>
              <RNText style={ss.meta}>{rider.distance}m away</RNText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <IconStar size={12} />
              <RNText style={ss.meta}>{rider.rating.toFixed(1)}</RNText>
            </View>
          </View>
          {meetupRoute ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Svg width={11} height={11} viewBox="0 0 24 24" fill="none"><Path d="M13 4a1 1 0 10-2 0 1 1 0 002 0zM7 20l3-8 2 3 3-5 2 10" stroke={C.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></Svg>
              <RNText style={ss.walk}>Walk {meetupRoute.distanceText} · ~{meetupRoute.durationText}</RNText>
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
  wrap: { marginHorizontal: 12, backgroundColor: '#0A1022', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(192,132,252,0.16)', padding: 16, elevation: 14, shadowColor: '#C084FC', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } },
  handle: { width: 32, height: 3, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(192,132,252,0.12)', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 21, fontWeight: '900', color: C.text },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  matchBadge: { backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)' },
  matchText: { fontSize: 8, color: C.matchGreen, fontWeight: '800' },
  dest: { fontSize: 12, color: C.textSub, marginTop: 4 },
  meta: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  walk: { fontSize: 11, color: C.teal, marginTop: 6, fontWeight: '700' },
  close: { padding: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#C084FC', borderRadius: 16, paddingVertical: 13, marginTop: 14, elevation: 4 },
  chatText: { color: C.white, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
});

// ─── Zone expansion levels ─────────────────────────────────────────────────────
const ZONE_LEVELS = [150, 250, 350] as const;

// ─── No Riders Smart Sheet ─────────────────────────────────────────────────────
const NoRidersSheet = ({
  scanSecs, zoneIdx, onExpandZone, onPostForLater, onKeepWaiting, destination,
}: {
  scanSecs: number; zoneIdx: number; onExpandZone: () => void;
  onPostForLater: () => void; onKeepWaiting: () => void; destination: string;
}) => {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0.6)).current;
  const ring2 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 12, useNativeDriver: false }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();
    // Sonar pulse
    const pulse = () => {
      ring1.setValue(0.6);
      ring2.setValue(0.3);
      Animated.parallel([
        Animated.timing(ring1, { toValue: 0, duration: 1800, useNativeDriver: false }),
        Animated.timing(ring2, { toValue: 0, duration: 1800, delay: 400, useNativeDriver: false }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  const timeStr = scanSecs < 60 ? `${scanSecs}s` : `${Math.floor(scanSecs / 60)}m ${scanSecs % 60}s`;
  const canExpand = zoneIdx < ZONE_LEVELS.length - 1;
  const currentZone = ZONE_LEVELS[zoneIdx];
  const nextZone = canExpand ? ZONE_LEVELS[zoneIdx + 1] : null;

  return (
    <Animated.View style={[nrs.sheet, { transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}>
      <View style={nrs.handle} />

      {/* ── Row 1: sonar + title + dest + timer ── */}
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
            <RNText style={nrs.destName} numberOfLines={1}>{destination}</RNText>
            <RNText style={nrs.zoneLbl}>{currentZone}m</RNText>
          </View>
        </View>
      </View>

      {/* ── Row 2: Post CTA + chips side by side ── */}
      <View style={nrs.actionsRow}>
        <TouchableOpacity style={nrs.cta} onPress={onPostForLater} activeOpacity={0.9}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
            <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
            <SvgCircle cx="9" cy="7" r="4" stroke="#fff" strokeWidth="2.2"/>
          </Svg>
          <RNText style={nrs.ctaText}>Post request</RNText>
        </TouchableOpacity>

        <TouchableOpacity style={nrs.chip} onPress={onExpandZone} activeOpacity={0.8}>
          {canExpand ? (
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <Path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
          ) : (
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <Path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
          )}
          <RNText style={nrs.chipText}>{canExpand ? `${nextZone}m` : 'Retry'}</RNText>
        </TouchableOpacity>

        <TouchableOpacity style={[nrs.chip, nrs.chipMuted]} onPress={onKeepWaiting} activeOpacity={0.8}>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <SvgCircle cx="12" cy="12" r="10" stroke="#94A3B8" strokeWidth="2"/>
            <Path d="M12 6v6l4 2" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
          </Svg>
          <RNText style={[nrs.chipText, { color: '#94A3B8' }]}>Wait</RNText>
        </TouchableOpacity>
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
  handle: { width: 32, height: 3, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },

  // Top row
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sonarWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  sonarRing: { position: 'absolute', borderRadius: 40, borderWidth: 1.5 },
  sonarRing1: { width: 36, height: 36, borderColor: '#7C3AED' },
  sonarRing2: { width: 24, height: 24, borderColor: '#A78BFA' },
  sonarCore: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(124,58,237,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#7C3AED' },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  statusTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  timerBox: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  timerNum: { fontSize: 11, fontWeight: '700', color: '#64748B' },

  destRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  destPin: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7C3AED' },
  destName: { fontSize: 12, fontWeight: '500', color: '#475569', flex: 1 },
  zoneLbl: { fontSize: 11, fontWeight: '700', color: '#A78BFA' },

  // Actions row — CTA + chips side by side
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cta: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#7C3AED',
    borderRadius: 12, paddingVertical: 11,
    elevation: 2,
    shadowColor: '#7C3AED', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  ctaText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },

  chip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, backgroundColor: '#F5F0FF', borderWidth: 1, borderColor: '#DDD6FE' },
  chipMuted: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },

});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LiveMapScreen() {
  const route = useRoute<any>();
  const routeParams = route?.params as { destination?: string; pickup?: string } | undefined;
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuthStore();
  const latitude = useLocationStore((s) => s.latitude);
  const longitude = useLocationStore((s) => s.longitude);
  const accuracy = useLocationStore((s) => s.accuracy);
  const speedKmh = useLocationStore((s) => s.speedKmh);
  const setLocation = useLocationStore((s) => s.setLocation);
  const setTracking = useLocationStore((s) => s.setTracking);
  const { destination: storeDestination, customDestination, pickupPoint: storePickupPoint, routeSearchNonce, requestStates, setPartner, setStatus, setRequestState } = useRideStore();

  const destination = routeParams?.destination ?? storeDestination;
  const pickupPoint = routeParams?.pickup ?? storePickupPoint;

  const [nearbyRiders, setNearbyRiders] = useState<RiderMatch[]>([]);
  const [selectedRider, setSelectedRider] = useState<RiderMatch | null>(null);
  const lastOfferTimeRef = useRef<Record<string, number>>({});

  // ── Smart "no riders" state
  const isFocused = useIsFocused();
  const [scanSecs, setScanSecs] = useState(0);
  const [zoneIdx, setZoneIdx] = useState(0);
  const [showNoRidersSheet, setShowNoRidersSheet] = useState(false);
  const [manualZoneRadius, setManualZoneRadius] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [selectedRiderRouteCoordinates, setSelectedRiderRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [routeSummary, setRouteSummary] = useState<{ distanceText: string; durationText: string } | null>(null);
  const [meetupRoute, setMeetupRoute] = useState<{ distanceText: string; durationText: string; summary: string } | null>(null);
  const mapRef = useRef<MapView>(null);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const initialRegion = useRef({
    latitude: latitude ?? 23.7749, longitude: longitude ?? 90.3990,
    latitudeDelta: 0.003, longitudeDelta: 0.003,
  }).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── Scan timer — pauses when unfocused, resumes without resetting
  useEffect(() => {
    if (!destination || dismissed || !isFocused) return;
    const interval = setInterval(() => setScanSecs(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [destination, dismissed, isFocused]);

  // Reset zone ONLY when destination value actually changes (not on remount)
  const prevDestRef = useRef<string | null>(null);
  useEffect(() => {
    if (!destination) return;
    if (destination === prevDestRef.current) return; // same dest — tab switch, do nothing
    prevDestRef.current = destination;
    setScanSecs(0);
    setZoneIdx(0);
    setManualZoneRadius(ZONE_LEVELS[0]);
    setShowNoRidersSheet(false);
    setDismissed(false);
  }, [destination]);

  useEffect(() => {
    if (dismissed || nearbyRiders.length > 0 || !destination || scanSecs === 0) return;
    // Auto-expand zone every 3s — only while not at max
    if (scanSecs % 3 === 0) {
      setZoneIdx(prev => {
        if (prev >= ZONE_LEVELS.length - 1) return prev;
        const next = prev + 1;
        setManualZoneRadius(ZONE_LEVELS[next]);
        return next;
      });
    }
    // Show sheet after 15s
    if (scanSecs >= 15) setShowNoRidersSheet(true);
  }, [scanSecs, nearbyRiders.length, destination, dismissed]);

  useEffect(() => {
    if (nearbyRiders.length > 0) setShowNoRidersSheet(false);
  }, [nearbyRiders.length]);

  const hasLoc = latitude != null && longitude != null;
  const pickupDetails = pickupPoint ? getPickupPointById(pickupPoint) : null;
  const destinationDetails = useMemo(() => {
    if (customDestination) return { id: customDestination.id, name: customDestination.name, lat: customDestination.lat, lng: customDestination.lng };
    return destination ? getDestinationById(destination) : null;
  }, [customDestination, destination]);

  const routeOrigin = useMemo(() => {
    if (pickupPoint === MY_LOCATION_PICKUP_ID && hasLoc) return { lat: latitude!, lng: longitude!, label: 'My location' };
    if (pickupDetails) return { lat: pickupDetails.lat, lng: pickupDetails.lng, label: pickupDetails.name };
    if (hasLoc) return { lat: latitude!, lng: longitude!, label: 'My location' };
    return null;
  }, [hasLoc, latitude, longitude, pickupDetails, pickupPoint]);

  const mapCenter = useMemo(() => ({
    latitude: latitude ?? routeOrigin?.lat ?? 23.7749,
    longitude: longitude ?? routeOrigin?.lng ?? 90.3990,
  }), [latitude, longitude, routeOrigin?.lat, routeOrigin?.lng]);
  const gpsTier = useMemo(() => getSearchRadius(accuracy), [accuracy]);
  const userAccuracyRadius = manualZoneRadius ?? gpsTier.searchRadius;
  const routeDestinationKey = customDestination?.name ?? destination ?? '';

  const routeRiders = useMemo(() => nearbyRiders.filter((r) => {
    const sp = matchesPickup(r.pickupPoint, pickupPoint, routeOrigin?.label);
    const nr = routeCoordinates.length > 1 && distanceToRoute({ latitude: r.lat, longitude: r.lng }, routeCoordinates) <= 120;
    const sd = !destination || r.destination === destination || r.destination === destinationDetails?.name;
    return sp && (nr || sd);
  }), [destination, destinationDetails?.name, nearbyRiders, pickupPoint, routeCoordinates, routeOrigin?.label]);

  const sortedRiders = useMemo(() => [...nearbyRiders].sort((a, b) => {
    if (a.isMatch !== b.isMatch) return a.isMatch ? -1 : 1;
    return a.distance - b.distance;
  }), [nearbyRiders]);

  const matchCount = useMemo(() => routeRiders.filter((r) => r.isMatch).length, [routeRiders]);

  const prioritizedRiders = useMemo(() => {
    const ids = new Set(routeRiders.map((r) => r.userId));
    return [...routeRiders, ...sortedRiders.filter((r) => !ids.has(r.userId))];
  }, [routeRiders, sortedRiders]);

  // Location + RTDB watching
  useEffect(() => {
    if (!user?.uid || !destination) return;
    let stopWatching: (() => void) | null = null;
    let mounted = true;

    (async () => {
      try {
        const ok = await locationService.requestPermissions();
        if (!ok) throw new Error('Permission denied');
        const cur = await locationService.getCurrentLocation();
        if (cur) {
          setLocation(
            cur.latitude,
            cur.longitude,
            cur.accuracy,
            sanitizeSpeedKmh(cur.speedMps, cur.accuracy)
          );
        }
        await locationService.startWatching(user.uid, routeDestinationKey, pickupPoint ?? 'Main Gate', (loc) => {
          if (mounted) {
            setLocation(
              loc.latitude,
              loc.longitude,
              loc.accuracy,
              sanitizeSpeedKmh(loc.speedMps, loc.accuracy)
            );
          }
        });
        if (!mounted) return;
        setTracking(true);
        stopWatching = locationService.watchNearbyRiders((all) => {
          if (!mounted) return;
          const filtered = all.filter((r: any) => r.id !== user.uid);
          const s = useLocationStore.getState();
          setNearbyRiders(matchingService.findNearbyRiders(s.latitude ?? routeOrigin?.lat ?? 23.7749, s.longitude ?? routeOrigin?.lng ?? 90.3990, routeDestinationKey, filtered, s.accuracy ?? undefined));
        });
      } catch {
        if (!mounted) return;
        setTracking(false);
        Alert.alert('Location error', 'Could not start live location. Check permissions and try again.');
      }
    })();

    return () => {
      mounted = false;
      locationService.stopWatching();
      setTracking(false);
      stopWatching?.();
      if (waitTimerRef.current) { clearTimeout(waitTimerRef.current); waitTimerRef.current = null; }
    };
  }, [destination, pickupPoint, routeDestinationKey, routeOrigin?.lat, routeOrigin?.lng, routeSearchNonce, setLocation, setTracking, user?.uid]);

  // Meetup route for selected rider
  useEffect(() => {
    if (!selectedRider) { setMeetupRoute(null); setSelectedRiderRouteCoordinates([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await directionsService.getRoute({ origin: { latitude: latitude ?? routeOrigin?.lat ?? 23.7749, longitude: longitude ?? routeOrigin?.lng ?? 90.3990 }, destination: { latitude: selectedRider.lat, longitude: selectedRider.lng }, mode: 'walking' });
        if (!cancelled) { setSelectedRiderRouteCoordinates(safeDecodePolyline(r.polyline)); setMeetupRoute({ distanceText: r.distanceText, durationText: r.durationText, summary: r.summary }); }
      } catch { if (!cancelled) { setSelectedRiderRouteCoordinates([]); setMeetupRoute(null); } }
    })();
    return () => { cancelled = true; };
  }, [selectedRider, latitude, longitude, routeOrigin?.lat, routeOrigin?.lng]);

  // Auto-select first rider
  useEffect(() => {
    if (!prioritizedRiders.length) { setSelectedRider(null); return; }
    setSelectedRider((cur) => cur && prioritizedRiders.some((r) => r.userId === cur.userId) ? cur : prioritizedRiders[0]);
  }, [prioritizedRiders]);

  // Fit map to selected rider
  useEffect(() => {
    if (!selectedRider) return;
    const pts = [{ latitude: selectedRider.lat, longitude: selectedRider.lng }];
    if (routeOrigin) pts.unshift({ latitude: routeOrigin.lat, longitude: routeOrigin.lng });
    if (destinationDetails) pts.push({ latitude: destinationDetails.lat, longitude: destinationDetails.lng });
    if (pts.length > 1) { mapRef.current?.fitToCoordinates(pts, { edgePadding: { top: 160, right: 60, bottom: 320, left: 60 }, animated: true }); return; }
    mapRef.current?.animateToRegion({ latitude: selectedRider.lat, longitude: selectedRider.lng, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 450);
  }, [destinationDetails, routeOrigin, selectedRider]);

  // Center on first GPS fix
  useEffect(() => {
    if (!hasLoc) return;
    mapRef.current?.animateToRegion({ latitude: latitude!, longitude: longitude!, latitudeDelta: 0.002, longitudeDelta: 0.002 }, 600);
  }, [hasLoc, latitude, longitude]);

  // Route polyline
  useEffect(() => {
    if (!routeOrigin || !destinationDetails) { setRouteCoordinates([]); setRouteSummary(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await routesService.computeRoute({ origin: { location: { latLng: { latitude: routeOrigin.lat, longitude: routeOrigin.lng } } }, destination: { location: { latLng: { latitude: destinationDetails.lat, longitude: destinationDetails.lng } } }, travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE', computeAlternativeRoutes: false });
        if (cancelled) return;
        const pts = safeDecodePolyline(r?.polyline?.encodedPolyline);
        setRouteCoordinates(pts);
        setRouteSummary({ distanceText: r?.distanceMeters ? `${(r.distanceMeters / 1000).toFixed(1)} km` : '', durationText: r?.duration ? `${Math.max(1, Math.round(r.duration / 60))} min` : '' });
        mapRef.current?.fitToCoordinates(pts.length > 1 ? pts : [{ latitude: routeOrigin.lat, longitude: routeOrigin.lng }, { latitude: destinationDetails.lat, longitude: destinationDetails.lng }], { edgePadding: { top: 150, right: 40, bottom: 320, left: 40 }, animated: true });
      } catch {
        try {
          const fb = await directionsService.getRoute({ origin: { latitude: routeOrigin.lat, longitude: routeOrigin.lng }, destination: { latitude: destinationDetails.lat, longitude: destinationDetails.lng }, mode: 'driving' });
          if (cancelled) return;
          const pts = safeDecodePolyline(fb.polyline);
          setRouteCoordinates(pts);
          setRouteSummary({ distanceText: fb.distanceText, durationText: fb.durationText });
        } catch { if (!cancelled) { setRouteCoordinates([]); setRouteSummary(null); } }
      }
    })();
    return () => { cancelled = true; };
  }, [destinationDetails, routeOrigin, routeSearchNonce]);

  const centerMap = useCallback(() => {
    mapRef.current?.animateToRegion({ latitude: mapCenter.latitude, longitude: mapCenter.longitude, latitudeDelta: 0.002, longitudeDelta: 0.002 }, 500);
  }, [mapCenter.latitude, mapCenter.longitude]);


  const openChat = useCallback((rider: RiderMatch) => {
    navigation.navigate('Chat', { rider, partnerName: rider.name });
  }, [navigation]);

  const handleExpandZone = useCallback(() => {
    // At max zone — cycle back to 150m and restart scan
    if (zoneIdx >= ZONE_LEVELS.length - 1) {
      setZoneIdx(0);
      setManualZoneRadius(ZONE_LEVELS[0]);
      setScanSecs(0);
      setShowNoRidersSheet(false);
      setDismissed(false);
      return;
    }
    const nextIdx = zoneIdx + 1;
    setZoneIdx(nextIdx);
    setManualZoneRadius(ZONE_LEVELS[nextIdx]);
    setShowNoRidersSheet(false);
  }, [zoneIdx]);

  const handlePostForLater = useCallback(() => {
    setShowNoRidersSheet(false);
    setDismissed(true);
    navigation.navigate('CreatePost', { destination: destinationDetails?.name ?? destination ?? '' });
  }, [navigation, destinationDetails?.name, destination]);

  const handleKeepWaiting = useCallback(() => {
    setShowNoRidersSheet(false);
    setDismissed(true);
    setScanSecs(0); // reset so sheet doesn't instantly re-appear after 30s
    if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    waitTimerRef.current = setTimeout(() => {
      setDismissed(false);
      waitTimerRef.current = null;
    }, 30000);
  }, []);

  const handleOffer = useCallback((rider: RiderMatch) => {
    if (requestStates[rider.userId] === 'confirmed') { openChat(rider); return; }
    const now = Date.now();
    const last = lastOfferTimeRef.current[rider.userId] ?? 0;
    if (now - last < 30000) {
      Alert.alert('Please wait', 'You already sent a request to this rider. Wait 30 seconds before trying again.');
      return;
    }
    lastOfferTimeRef.current[rider.userId] = now;
    const nearbyRider = { ...rider, uid: rider.userId };
    setPartner(nearbyRider); setStatus('waiting'); setRequestState(rider.userId, 'pending');
  }, [openChat, requestStates, setPartner, setRequestState, setStatus]);

  return (
    <View style={s.root}>
      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}

        showsUserLocation={false}
        showsMyLocationButton={false}
        mapPadding={{ top: 0, right: 0, bottom: tabBarHeight + 20, left: 0 }}
      >
        {routeOrigin && (
          <Marker coordinate={{ latitude: routeOrigin.lat, longitude: routeOrigin.lng }} pinColor={C.primary} title={routeOrigin.label} description="Pickup" />
        )}
        {destinationDetails && (
          <Marker coordinate={{ latitude: destinationDetails.lat, longitude: destinationDetails.lng }} pinColor="#A855F7" title={destinationDetails.name} description="Destination" />
        )}
        {routeCoordinates.length > 1 && (
          <Polyline coordinates={routeCoordinates} strokeColor="#818CF8" strokeWidth={5} lineCap="round" lineJoin="round" />
        )}
        {selectedRiderRouteCoordinates.length > 1 && (
          <Polyline coordinates={selectedRiderRouteCoordinates} strokeColor={C.amber} strokeWidth={3} lineDashPattern={[8, 5]} lineCap="round" />
        )}
        {hasLoc && (
          <>
            <Circle
              center={{ latitude: latitude!, longitude: longitude! }}
              radius={userAccuracyRadius}
              strokeColor="rgba(192,132,252,0.45)"
              strokeWidth={1.5}
              fillColor="rgba(192,132,252,0.07)"
            />
            <Marker
              coordinate={{ latitude: latitude!, longitude: longitude! }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={userDot.wrap}>
                <View style={userDot.ring} />
                <View style={userDot.core} />
              </View>
            </Marker>
          </>
        )}
        {prioritizedRiders.map((rider) => {
          const isMatch = rider.isMatch;
          const isInsideZone = rider.distance <= userAccuracyRadius;
          const bg = isInsideZone ? C.matchGreen : C.nearbyOrange;
          const distLabel = rider.distance < 1000
            ? `${rider.distance}m`
            : `${(rider.distance / 1000).toFixed(1)}km`;
          return (
            <Marker key={rider.userId} coordinate={{ latitude: rider.lat, longitude: rider.lng }} onPress={() => setSelectedRider(rider)}>
              <View style={m.wrap}>
                <View style={[m.bubble, { backgroundColor: bg }]}>
                  <VehicleIcon
                    type={((rider.vehicleType as VehicleType) ?? 'rickshaw') === 'bike' ? 'motorcycle' : ((rider.vehicleType as VehicleType) ?? 'rickshaw') === 'cng' ? 'cng' : 'rickshaw'}
                    tone={((rider.vehicleType as VehicleType) ?? 'rickshaw') === 'bike' ? 'indigo' : ((rider.vehicleType as VehicleType) ?? 'rickshaw') === 'cng' ? 'teal' : 'amber'}
                    size={24}
                  />
                  <RNText style={m.name} numberOfLines={1}>{rider.name}</RNText>
                  <RNText style={m.dist}>{distLabel}</RNText>
                </View>
                <View style={[m.tail, { borderTopColor: bg }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* ── Top bar — single row: back | destination+meta | live | center ── */}
      <View style={[s.topBar, { top: insets.top + 8 }]}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <IconBack />
        </TouchableOpacity>

        <View style={s.routeBar}>
          <View style={s.routeInfo}>
            {destinationDetails ? (
              <View style={s.routeBlock}>
                <RNText style={s.routeToVal} numberOfLines={1} ellipsizeMode="tail">{destinationDetails.name}</RNText>
                {routeSummary && (
                  <View style={s.routeMetaRow}>
                    <View style={[s.routeDot, { backgroundColor: '#34D399' }]} />
                    <RNText style={s.routeMetaText}>{routeSummary.durationText}</RNText>
                    <RNText style={s.routeMetaDivider}>·</RNText>
                    <RNText style={s.routeMetaText}>{routeSummary.distanceText}</RNText>
                  </View>
                )}
              </View>
            ) : (
              <RNText style={s.routePlaceholder}>Where are you going?</RNText>
            )}
          </View>
          <LiveBadge />
        </View>

        <TouchableOpacity style={s.iconBtn} onPress={centerMap} activeOpacity={0.8}>
          <IconCenter />
        </TouchableOpacity>
      </View>

      {/* ── Stats row — single compact bar below top bar ── */}
      <View style={[s.statsRow, { top: insets.top + 54 }]}>
        <View style={s.statPill}>
          <RNText style={s.statPillNum}>{prioritizedRiders.length}</RNText>
          <RNText style={s.statPillLbl}> Nearby</RNText>
        </View>
        <View style={[s.statPill, matchCount > 0 && s.statPillGreen]}>
          <RNText style={[s.statPillNum, matchCount > 0 && { color: C.matchGreen }]}>{matchCount}</RNText>
          <RNText style={s.statPillLbl}> Match</RNText>
        </View>
        <View style={s.statPill}>
          <RNText style={s.statPillNum}>{routeRiders.length}</RNText>
          <RNText style={s.statPillLbl}> On Route</RNText>
        </View>
        <TouchableOpacity style={[s.statPill, s.statPillGps]} onPress={handleExpandZone} activeOpacity={0.75}>
          <RNText style={[s.statPillNum, { fontSize: 11, color: C.amber }]}>
            {hasLoc ? `${userAccuracyRadius}m` : '…'}
          </RNText>
          <RNText style={s.statPillLbl}>{zoneIdx >= ZONE_LEVELS.length - 1 ? ' ↺' : ' ↑'}</RNText>
        </TouchableOpacity>
        {/* Legend inline — 3 tiny dots */}
        <View style={s.legendInline}>
          {[{ color: C.routeBlue, label: 'R' }, { color: C.matchGreen, label: 'M' }, { color: C.nearbyOrange, label: 'N' }].map(item => (
            <View key={item.color} style={s.legendDotWrap}>
              <View style={[s.legendDot, { backgroundColor: item.color }]} />
            </View>
          ))}
        </View>
      </View>

      {!showNoRidersSheet ? (
        <View style={[s.scanChip, { bottom: tabBarHeight + (selectedRider ? 210 : 24) }]}>
          <Animated.View style={[s.scanDot, {
            opacity: scanAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.2, 1] }),
            transform: [{ scale: scanAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.6, 1] }) }],
          }]} />
          <RNText style={s.scanText}>
            {hasLoc
              ? matchCount > 0
                ? `${matchCount} rider match found nearby`
                : `Searching within ${userAccuracyRadius}m…`
              : 'Getting your location…'}
          </RNText>
        </View>
      ) : null}

      <View style={{ position: 'absolute', bottom: tabBarHeight + (selectedRider ? 210 : 24), right: 12, zIndex: 10 }}>
        <Speedometer speedKmh={hasLoc ? (speedKmh ?? 0) : null} />
      </View>

      {selectedRider ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarHeight + 20 }}>
          <SelectedSheet rider={selectedRider} meetupRoute={meetupRoute} onChat={openChat} onClose={() => setSelectedRider(null)} />
        </View>
      ) : null}

      {showNoRidersSheet && !selectedRider ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarHeight + 12, zIndex: 50, elevation: 50 }}>
          <NoRidersSheet
            scanSecs={scanSecs}
            zoneIdx={zoneIdx}
            onExpandZone={handleExpandZone}
            onPostForLater={handlePostForLater}
            onKeepWaiting={handleKeepWaiting}
            destination={destinationDetails?.name ?? (destination?.startsWith('custom_') ? 'Selected location' : destination) ?? 'your destination'}
          />
        </View>
      ) : null}

    </View>
  );
}

// ─── Marker styles ─────────────────────────────────────────────────────────────
const userDot = StyleSheet.create({
  wrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute', width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#C084FC',
    backgroundColor: 'rgba(192,132,252,0.18)',
  },
  core: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#C084FC',
    borderWidth: 2, borderColor: '#FFFFFF',
    shadowColor: '#C084FC', shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});

const m = StyleSheet.create({
  wrap: { alignItems: 'center' },
  bubble: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, alignItems: 'center', minWidth: 68, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  emoji: { marginBottom: 2 },
  name: { color: '#FFF', fontSize: 10, fontWeight: '800', maxWidth: 80, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  dist: { color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: '600', marginTop: 1 },
  tail: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },
});

// ─── Screen styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // ── Top bar
  topBar: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#111827',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  routeBar: {
    flex: 1, backgroundColor: '#111827',
    borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    minWidth: 0,
  },
  routeInfo: { flex: 1, minWidth: 0 },
  routeBlock: { gap: 3 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeDot: { width: 6, height: 6, borderRadius: 3 },
  routeToVal: { fontSize: 11, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  routeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  routeMetaText: { fontSize: 11, color: C.textSub, fontWeight: '500' },
  routeMetaDivider: { fontSize: 11, color: C.textMuted },
  routePlaceholder: { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },
  etaChip: { backgroundColor: 'rgba(192,132,252,0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(192,132,252,0.25)' },
  etaText: { fontSize: 9, color: '#C084FC', fontWeight: '700', letterSpacing: 0.2 },

  // ── Stats — compact pill row, solid readable dark cards
  statsRow: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', gap: 5, zIndex: 9 },
  statPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#111827', borderRadius: 8,
    paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  statPillGreen: { borderColor: 'rgba(52,211,153,0.4)', backgroundColor: '#0d1f18' },
  statPillGps: { borderColor: 'rgba(245,158,11,0.35)', backgroundColor: '#1a1500' },
  statPillNum: { fontSize: 12, fontWeight: '900', color: '#F1F5F9' },
  statPillLbl: { fontSize: 10, fontWeight: '600', color: '#94A3B8' },

  // ── Legend inline (inside stats row)
  legendInline: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6 },
  legendDotWrap: { alignItems: 'center', justifyContent: 'center' },
  legendDot: { width: 7, height: 7, borderRadius: 4 },

  // ── Scanning chip
  scanChip: {
    position: 'absolute', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(10,16,34,0.88)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9,
    borderWidth: 1, borderColor: 'rgba(192,132,252,0.35)',
    elevation: 8,
    shadowColor: '#C084FC', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  scanDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#C084FC',
  },
  scanText: {
    fontSize: 12, fontWeight: '700', color: '#E2D9FF', letterSpacing: 0.1,
  },

});
