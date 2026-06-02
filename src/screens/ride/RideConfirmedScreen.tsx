import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/config/firebase.config';

import { useAuthStore } from '@/store/authStore';
import { useRideStore } from '@/store/rideStore';
import rideService from '@/services/firebase/rideService';
import { sendRideConfirmed } from '@/services/notifications/fcmService';
import { buildRideRoutePreview } from '@/services/ride/routePreviewService';
import type { RideRoutePreview } from '@/types/ride.types';
import { logger } from '@/utils/logger';
import { startMovementDetection } from '@/services/location/movementDetector';

const C = {
  bg: '#07090F',
  surface: 'rgba(255,255,255,0.055)',
  border: 'rgba(255,255,255,0.09)',
  primary: '#7C6FF7',
  teal: '#14B8A6',
  amber: '#F59E0B',
  red: '#F43F5E',
  green: '#10B981',
  text: '#EEF2FF',
  textSub: '#7B8DB0',
  textMuted: '#343D55',
  white: '#FFFFFF',
};

const IconCheck = () => (
  <Svg width={44} height={44} viewBox="0 0 48 48" fill="none">
    <Defs>
      <LinearGradient id="chk" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#10B981" />
        <Stop offset="1" stopColor="#14B8A6" />
      </LinearGradient>
    </Defs>
    <Circle cx="24" cy="24" r="22" fill="url(#chk)" opacity="0.15" />
    <Circle cx="24" cy="24" r="18" stroke="url(#chk)" strokeWidth="1.5" fill="none" />
    <Path d="M14 24L20 30L34 16" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconStart = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M5 3l14 9-14 9V3z" fill="#fff" />
  </Svg>
);

const IconCancel = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={C.red} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconPin = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill={C.primary} />
  </Svg>
);

const IconRoute = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M3 17h18M3 12h18M3 7h18" stroke={C.teal} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconClock = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={C.amber} strokeWidth="1.8" />
    <Path d="M12 7v5l3 3" stroke={C.amber} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconMoney = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={C.green} strokeWidth="1.8" />
    <Path d="M12 7v10M9 9.5c0-1.1.9-2 2-2h2a2 2 0 010 4h-2a2 2 0 000 4h2a2 2 0 002-2" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

const IconPerson = ({ color }: { color: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" fill={color} opacity={0.9} />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill={color} opacity={0.9} />
  </Svg>
);

export default function RideConfirmedScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { setCurrentRide, setStatus, destination, pickupPoint } = useRideStore();
  const { rider, fare, splitFare, routePreview: incomingRoutePreview } = route.params ?? {};

  const [rideId, setRideId] = useState<string | null>(null);
  const [routePreview, setRoutePreview] = useState<RideRoutePreview | null>(incomingRoutePreview ?? null);
  const [creatingRide, setCreatingRide] = useState(false);
  const [iAmReady, setIAmReady] = useState(false);
  const [partnerReady, setPartnerReady] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const autoStarted = useRef(false);
  const navigatedToActive = useRef(false);

  const riderUid: string = rider?.uid ?? rider?.userId ?? '';
  const resolvedDestination = destination ?? rider?.destination ?? null;
  const resolvedPickup = pickupPoint ?? rider?.pickupPoint ?? 'main_gate';
  const totalFare = routePreview?.soloFare ?? fare ?? 0;
  const totalSplit = routePreview?.splitFare ?? splitFare ?? Math.ceil(totalFare / 2);

  const checkScale = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(30)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.7)).current;
  const ringOpacity = useRef(new Animated.Value(0.8)).current;
  const readyPulse = useRef(new Animated.Value(1)).current;

  // Pulse animation for "both ready" state
  useEffect(() => {
    if (iAmReady && partnerReady) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(readyPulse, { toValue: 1.06, duration: 500, useNativeDriver: true }),
          Animated.timing(readyPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [iAmReady, partnerReady]);

  // Entry animations + ride creation
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, tension: 70, friction: 6, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1.6, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(cardY, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();

    const bootstrap = async () => {
      if (!user || !riderUid || creatingRide || rideId) return;
      setCreatingRide(true);
      try {
        const preview = incomingRoutePreview ?? await buildRideRoutePreview({
          pickup: resolvedPickup,
          destination: resolvedDestination,
          fallbackFare: fare,
        });
        if (preview) setRoutePreview(preview);

        const id = await rideService.createRide(
          user.uid, user.name,
          riderUid, rider.name,
          resolvedDestination ?? rider.destination,
          resolvedPickup,
          preview?.soloFare ?? fare ?? 0,
          preview ?? undefined,
        );
        setRideId(id);
        setCurrentRide({ rideId: id, rider1: user.uid, rider2: riderUid, routePreview: preview ?? null });
        setStatus('matched');
      } catch {
        Alert.alert('Error', 'Unable to create ride. Please try again.');
        navigation.goBack();
      } finally {
        setCreatingRide(false);
      }
    };
    void bootstrap();
  }, []);

  // Listen for ready states + active/completed status from partner
  useEffect(() => {
    if (!rideId) return;

    const unsub = onSnapshot(
      doc(db, 'rides', rideId),
      (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      // Determine which field belongs to whom
      const iAmRider1 = data.rider1 === user?.uid;
      const myReadyField = iAmRider1 ? 'rider1Ready' : 'rider2Ready';
      const partnerReadyField = iAmRider1 ? 'rider2Ready' : 'rider1Ready';

      setIAmReady(!!data[myReadyField]);
      setPartnerReady(!!data[partnerReadyField]);

      // Auto-start: both ready, let rider1 be the one to call startRide (prevents double-start)
      if (data[myReadyField] && data[partnerReadyField] && !autoStarted.current) {
        autoStarted.current = true;
        if (iAmRider1) {
          // Only rider1 triggers the actual startRide to avoid race
          void doStartRide(rideId);
        }
      }

      // Partner (or self) already started — navigate everyone to RideActive
      if (data.status === 'active' && !navigatedToActive.current) {
        navigatedToActive.current = true;
        setStatus('active');
        navigation.navigate('RideActive', {
          rideId,
          rider,
          fare: totalFare,
          splitFare: totalSplit,
          routePreview,
        });
      }
      },
      (error) => {
        logger.warn('RideConfirmedScreen.rideListener', error);
      },
    );

    return () => unsub();
  }, [rideId]);

  const doStartRide = async (id: string) => {
    if (starting) return;
    setStarting(true);
    try {
      await rideService.startRide(id);
      if (riderUid && user?.uid) {
        sendRideConfirmed(riderUid, user?.name ?? 'Your partner', id)
          .catch(e => logger.warn('RideConfirmedScreen.sendRideConfirmed', e));
      }
    } catch (e) {
      logger.error('RideConfirmedScreen.startRide', e);
      autoStarted.current = false;
    } finally {
      setStarting(false);
    }
  };

  const handleImHere = async () => {
    if (!rideId || !user?.uid || iAmReady || markingReady) return;
    setMarkingReady(true);
    try {
      await rideService.markReady(rideId, user.uid);
    } catch {
      Alert.alert('Error', 'Could not update your status. Please try again.');
    } finally {
      setMarkingReady(false);
    }
  };

  // Auto-mark "I'm here" when movement detected (5+ km/h)
  // Saves user from having to manually tap when rickshaw starts moving
  useEffect(() => {
    if (!rideId || !user?.uid || iAmReady) return;

    const stop = startMovementDetection(() => {
      logger.info('RideConfirmedScreen', 'Movement detected, auto-marking ready');
      if (!iAmReady && !markingReady) {
        rideService
          .markReady(rideId, user.uid)
          .catch((e) => logger.warn('autoMarkReady', e));
      }
    });

    return () => stop();
  }, [rideId, user?.uid, iAmReady, markingReady]);

  const handleStartManually = async () => {
    if (!rideId || starting) return;
    setStarting(true);
    try {
      await rideService.startRide(rideId);
      if (riderUid && user?.uid) {
        sendRideConfirmed(riderUid, user?.name ?? 'Your partner', rideId)
          .catch(e => logger.warn('RideConfirmedScreen.sendRideConfirmed', e));
      }
      setStatus('active');
      navigatedToActive.current = true;
      navigation.navigate('RideActive', { rideId, rider, fare: totalFare, splitFare: totalSplit, routePreview });
    } catch {
      Alert.alert('Error', 'Could not start ride. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Ride?', 'This may affect your reliability score.', [
      { text: 'Keep Ride', style: 'cancel' },
      {
        text: 'Cancel', style: 'destructive', onPress: async () => {
          if (rideId && user?.uid) await rideService.cancelRide(rideId, user.uid);
          setStatus('idle');
          navigation.navigate('MainApp');
        },
      },
    ]);
  };

  const bothReady = iAmReady && partnerReady;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.radial1} />
      <View style={s.radial2} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.successArea}>
          <Animated.View style={[s.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <IconCheck />
          </Animated.View>
          <Text style={s.successTitle}>Ride Confirmed!</Text>
          <Text style={s.successSub}>Head to the pickup point and meet your partner</Text>
        </View>

        {/* Meet at Pickup card */}
        <Animated.View style={[s.card, { opacity: cardOpacity, transform: [{ translateY: cardY }] }]}>
          <Text style={s.cardLabel}>MEETING POINT</Text>
          <View style={s.pickupHero}>
            <View style={s.pickupIconWrap}>
              <IconPin />
            </View>
            <View style={s.pickupTexts}>
              <Text style={s.pickupName}>{resolvedPickup}</Text>
              <Text style={s.pickupHint}>Meet here before boarding the rickshaw</Text>
            </View>
          </View>

          {/* Ready status rows */}
          <View style={s.readySection}>
            <View style={s.readyRow}>
              <View style={[s.readyDot, iAmReady ? s.readyDotGreen : s.readyDotGray]} />
              <View style={s.readyPersonWrap}>
                <IconPerson color={iAmReady ? C.green : C.textMuted} />
              </View>
              <Text style={[s.readyName, iAmReady && { color: C.green }]}>
                {user?.name ?? 'You'}
              </Text>
              <View style={s.readyChipWrap}>
                {iAmReady
                  ? <View style={[s.readyChip, s.readyChipGreen]}><Text style={[s.readyChipText, { color: C.green }]}>At pickup ✓</Text></View>
                  : <View style={[s.readyChip, s.readyChipGray]}><Text style={s.readyChipText}>Heading there</Text></View>
                }
              </View>
            </View>

            <View style={s.readyDivider} />

            <View style={s.readyRow}>
              <View style={[s.readyDot, partnerReady ? s.readyDotGreen : s.readyDotGray]} />
              <View style={s.readyPersonWrap}>
                <IconPerson color={partnerReady ? C.teal : C.textMuted} />
              </View>
              <Text style={[s.readyName, partnerReady && { color: C.teal }]}>
                {rider?.name ?? 'Partner'}
              </Text>
              <View style={s.readyChipWrap}>
                {partnerReady
                  ? <View style={[s.readyChip, s.readyChipTeal]}><Text style={[s.readyChipText, { color: C.teal }]}>At pickup ✓</Text></View>
                  : <View style={[s.readyChip, s.readyChipGray]}><Text style={s.readyChipText}>Heading there</Text></View>
                }
              </View>
            </View>
          </View>

          {bothReady && (
            <View style={s.bothReadyBanner}>
              <Text style={s.bothReadyText}>Both at pickup — ride starting automatically!</Text>
            </View>
          )}
        </Animated.View>

        {/* Ride details card */}
        <Animated.View style={[s.card, { opacity: cardOpacity, transform: [{ translateY: cardY }] }]}>
          <Text style={s.cardLabel}>RIDE DETAILS</Text>
          <View style={s.infoRow}>
            <View style={s.infoIconWrap}><IconRoute /></View>
            <View style={s.infoContent}>
              <Text style={s.infoKey}>Destination</Text>
              <Text style={s.infoVal}>{resolvedDestination ?? 'Unknown'}</Text>
            </View>
          </View>
          <View style={s.rowDivider} />
          <View style={s.infoRow}>
            <View style={s.infoIconWrap}><IconClock /></View>
            <View style={s.infoContent}>
              <Text style={s.infoKey}>ETA</Text>
              <Text style={s.infoVal}>{routePreview?.durationText ?? 'Calculating...'}</Text>
            </View>
          </View>
          <View style={s.rowDivider} />
          <View style={s.infoRow}>
            <View style={s.infoIconWrap}><IconMoney /></View>
            <View style={s.infoContent}>
              <Text style={s.infoKey}>Your fare</Text>
              <Text style={[s.infoVal, { color: C.teal }]}>৳{totalSplit} each</Text>
            </View>
            <Text style={s.infoValMuted}>Total ৳{totalFare}</Text>
          </View>

          {/* Riders strip */}
          <View style={s.rowDivider} />
          <View style={s.ridersRow}>
            <View style={s.riderPill}>
              <View style={[s.avatar, s.avatarYou]}>
                <Text style={s.avatarText}>{(user?.name ?? 'Y').charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={s.riderName}>{user?.name ?? 'You'}</Text>
            </View>
            <View style={s.plusCircle}>
              <Text style={s.plusText}>+</Text>
            </View>
            <View style={s.riderPill}>
              <View style={[s.avatar, s.avatarPartner]}>
                <Text style={s.avatarText}>{(rider?.name ?? 'R').charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={s.riderName}>{rider?.name ?? 'Rider'}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Disclaimer */}
        <View style={s.noteCard}>
          <Text style={s.noteText}>
            Settle your fare directly with your partner and the driver. GoShareX is not responsible for payment disputes.
          </Text>
        </View>

      </ScrollView>

      {/* Footer actions */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>

        {/* Primary: I'm Here button (until ready) */}
        {!iAmReady && (
          <Animated.View style={{ transform: [{ scale: 1 }] }}>
            <TouchableOpacity
              style={[s.hereBtn, (!rideId || creatingRide || markingReady) && s.hereBtnDisabled]}
              onPress={handleImHere}
              disabled={!rideId || creatingRide || markingReady}
              activeOpacity={0.85}
            >
              <Text style={s.hereBtnText}>
                {markingReady ? 'Updating...' : creatingRide ? 'Setting up ride...' : "I'm at the Pickup Point"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* After marking ready, show waiting / start manually */}
        {iAmReady && !bothReady && (
          <View style={s.waitingCard}>
            <Text style={s.waitingText}>Waiting for {rider?.name ?? 'partner'} to arrive...</Text>
            <TouchableOpacity
              style={[s.startManualBtn, starting && s.startManualBtnDisabled]}
              onPress={handleStartManually}
              disabled={starting || !rideId}
              activeOpacity={0.8}
            >
              <IconStart />
              <Text style={s.startManualBtnText}>{starting ? 'Starting...' : 'Start Now Anyway'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Both ready — auto-starting indicator */}
        {bothReady && (
          <Animated.View style={[s.autoStartCard, { transform: [{ scale: readyPulse }] }]}>
            <Text style={s.autoStartText}>
              {starting ? 'Starting ride...' : 'Both riders at pickup — Starting ride!'}
            </Text>
          </Animated.View>
        )}

        <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
          <IconCancel />
          <Text style={s.cancelBtnText}>Cancel Ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  radial1: { position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(16,185,129,0.1)' },
  radial2: { position: 'absolute', bottom: 80, left: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(124,111,247,0.08)' },
  scroll: { padding: 20, paddingBottom: 16 },

  successArea: { alignItems: 'center', paddingTop: 24, paddingBottom: 28, position: 'relative' },
  ring: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.5)' },
  successTitle: { fontSize: 26, fontWeight: '900', color: C.text, marginTop: 16, letterSpacing: -0.6 },
  successSub: { fontSize: 13, color: C.textSub, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },

  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 18, marginBottom: 14 },
  cardLabel: { fontSize: 10, fontWeight: '800', color: C.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 },

  // Pickup hero
  pickupHero: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  pickupIconWrap: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(124,111,247,0.12)', borderWidth: 1, borderColor: 'rgba(124,111,247,0.25)', alignItems: 'center', justifyContent: 'center' },
  pickupTexts: { flex: 1 },
  pickupName: { fontSize: 16, fontWeight: '800', color: C.text },
  pickupHint: { fontSize: 12, color: C.textSub, marginTop: 2 },

  // Ready section
  readySection: { gap: 0 },
  readyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  readyDot: { width: 8, height: 8, borderRadius: 4 },
  readyDotGreen: { backgroundColor: C.green },
  readyDotGray: { backgroundColor: C.textMuted },
  readyPersonWrap: { width: 20, alignItems: 'center' },
  readyName: { flex: 1, fontSize: 14, fontWeight: '700', color: C.textSub },
  readyChipWrap: { alignItems: 'flex-end' },
  readyChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  readyChipGreen: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' },
  readyChipTeal: { backgroundColor: 'rgba(20,184,166,0.1)', borderColor: 'rgba(20,184,166,0.3)' },
  readyChipGray: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border },
  readyChipText: { fontSize: 11, fontWeight: '700', color: C.textMuted },
  readyDivider: { height: 1, backgroundColor: C.border, marginLeft: 28 },

  bothReadyBanner: { marginTop: 12, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', paddingVertical: 8, paddingHorizontal: 12 },
  bothReadyText: { fontSize: 13, fontWeight: '700', color: C.green, textAlign: 'center' },

  // Ride details
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 2 },
  infoIconWrap: { width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  infoContent: { flex: 1 },
  infoKey: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  infoVal: { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 1 },
  infoValMuted: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  rowDivider: { height: 1, backgroundColor: C.border, marginVertical: 10 },

  // Riders strip
  ridersRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  riderPill: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarYou: { backgroundColor: 'rgba(124,111,247,0.2)', borderWidth: 1.5, borderColor: 'rgba(124,111,247,0.5)' },
  avatarPartner: { backgroundColor: 'rgba(20,184,166,0.2)', borderWidth: 1.5, borderColor: 'rgba(20,184,166,0.5)' },
  avatarText: { fontSize: 14, fontWeight: '900', color: C.text },
  riderName: { fontSize: 13, fontWeight: '700', color: C.textSub },
  plusCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  plusText: { fontSize: 16, fontWeight: '800', color: C.textMuted },

  noteCard: { backgroundColor: 'rgba(245,158,11,0.07)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.18)', borderRadius: 16, padding: 12, marginBottom: 8 },
  noteText: { fontSize: 11, color: '#A0916B', lineHeight: 18, textAlign: 'center' },

  // Footer
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 10, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },

  hereBtn: { height: 56, borderRadius: 18, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', shadowColor: C.green, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  hereBtnDisabled: { opacity: 0.5 },
  hereBtnText: { fontSize: 16, fontWeight: '800', color: C.white, letterSpacing: -0.2 },

  waitingCard: { backgroundColor: 'rgba(124,111,247,0.07)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(124,111,247,0.2)', padding: 14, gap: 10, alignItems: 'center' },
  waitingText: { fontSize: 13, color: C.primary, fontWeight: '600' },
  startManualBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(124,111,247,0.15)', borderWidth: 1, borderColor: 'rgba(124,111,247,0.3)' },
  startManualBtnDisabled: { opacity: 0.5 },
  startManualBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },

  autoStartCard: { height: 56, borderRadius: 18, backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)', alignItems: 'center', justifyContent: 'center' },
  autoStartText: { fontSize: 15, fontWeight: '800', color: C.green },

  cancelBtn: { height: 48, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(244,63,94,0.08)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.22)' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: C.red },
});
