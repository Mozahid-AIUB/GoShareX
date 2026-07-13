import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Circle, Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { useRideStore } from '@/store/rideStore';
import rideService from '@/services/rideService';
import { startGeofencingForDestination, startGeofencingAtCoords, stopGeofencing, registerGeofenceTask } from '@/services/location/geofenceService';
import { startMovementDetection } from '@/services/location/movementDetector';
import type { RideRoutePreview } from '@/types/ride.types';
import { logger } from '@/utils/logger';
import { trackRideComplete } from '@/services/analytics/analyticsService';
import { shareRide } from '@/services/ride/shareRideService';
import { getDestinationByName, getDestinationById } from '@/constants/destinations';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLocationStore } from '@/store/locationStore';
import { useSystemBars } from '@/hooks/useSystemBars';

// ─── Tokens ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#07090F',
  surface: 'rgba(255,255,255,0.055)',
  border: 'rgba(255,255,255,0.08)',
  primary: '#7C6FF7',
  teal: '#14B8A6',
  amber: '#F59E0B',
  green: '#22C55E',
  red: '#EF4444',
  text: '#EEF2FF',
  muted: '#6B7A99',
  card: 'rgba(255,255,255,0.04)',
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IconRoute = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M3 12h18M3 6h18M3 18h18" stroke={C.teal} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconClock = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={C.amber} strokeWidth="1.8" />
    <Path d="M12 7v5l3 3" stroke={C.amber} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconMoney = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconPin = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={C.primary} opacity={0.3} />
    <Circle cx="12" cy="9" r="2.5" fill={C.primary} />
  </Svg>
);

const IconUser = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={C.teal} strokeWidth="1.8" fill="none" />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={C.teal} strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </Svg>
);

// ─── Live pulse dot ────────────────────────────────────────────────────────────
const LiveDot = () => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: C.green,
          opacity: 0.3,
          transform: [{ scale: pulse }],
        }}
      />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.green }} />
    </View>
  );
};

// ─── Animated Timer Ring ───────────────────────────────────────────────────────
const TimerRing = ({ elapsed }: { elapsed: number }) => {
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <View style={styles.timerWrap}>
      <Svg width={160} height={160} viewBox="0 0 160 160">
        <Defs>
          <SvgLinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={C.primary} />
            <Stop offset="1" stopColor={C.teal} />
          </SvgLinearGradient>
        </Defs>
        <Circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="none" />
        <Circle
          cx="80" cy="80" r="70"
          stroke="url(#ringGrad)"
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${2 * Math.PI * 70}`}
          strokeDashoffset={`${2 * Math.PI * 70 * (1 - Math.min(elapsed / 600, 1))}`}
          strokeLinecap="round"
          transform="rotate(-90 80 80)"
        />
      </Svg>
      <View style={styles.timerInner}>
        <Text style={styles.timerMins}>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</Text>
        <Text style={styles.timerLabel}>elapsed</Text>
      </View>
    </View>
  );
};

// ─── Info Row ────────────────────────────────────────────────────────────────
const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoRowLeft}>
      {icon}
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function RideActiveScreen() {
  useSystemBars(C.bg, 'light');
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { setStatus } = useRideStore();
  const { rideId, rider, fare, splitFare, routePreview } = route.params ?? {};
  const [elapsed, setElapsed] = useState(0);
  const [currentRoutePreview, setCurrentRoutePreview] = useState<RideRoutePreview | null>(routePreview ?? null);
  // Keep a ref in sync so Firestore listeners always read the latest value
  const currentRoutePreviewRef = useRef<RideRoutePreview | null>(routePreview ?? null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  // Stable ref so the geofence background task always calls the latest version
  // of handleCompleteRide without needing it to be defined before the useEffect
  const handleCompleteRideRef = useRef<() => Promise<void>>(async () => { });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideUp]);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((c) => c + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!rideId || routePreview) return;
    let mounted = true;
    rideService.getRide(rideId).then((ride) => {
      if (mounted && ride?.routePreview) {
        setCurrentRoutePreview(ride.routePreview);
        currentRoutePreviewRef.current = ride.routePreview;
      }
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, [rideId, routePreview]);

  // Keep ref in sync with state so the Firestore listener below always reads
  // the latest routePreview without being re-subscribed on every state change
  useEffect(() => {
    currentRoutePreviewRef.current = currentRoutePreview;
  }, [currentRoutePreview]);

  // Real-time Firestore listener — if partner completes the ride, auto-navigate
  useEffect(() => {
    if (!rideId) return;
    let alreadyNavigated = false;
    const unsub = onSnapshot(
      doc(db, 'rides', rideId),
      (snap) => {
        if (!snap.exists() || alreadyNavigated) return;
        const data = snap.data();
        if (data?.status === 'completed') {
          alreadyNavigated = true;
          setStatus('completed');
          navigation.navigate('RideComplete', {
            rideId,
            rider,
            fare,
            splitFare,
            routePreview: currentRoutePreviewRef.current,
          });
        }
      },
      (error) => {
        logger.warn('RideActiveScreen.rideListener', error);
      },
    );
    return () => unsub();
  }, [rideId]);

  // Register geofence task and start geofencing — Uber/Pathao-style auto-complete.
  // গন্তব্যে পৌঁছালে geofence Enter fire করে → ride নিজে complete হয়।
  useEffect(() => {
    const destination = rider?.destination;
    // custom গন্তব্যেও কাজ করাতে coordinate-প্রথম: rider payload-এ destLat/
    // destLng থাকলে সরাসরি সেই point-এ geofence; নাহলে preset নাম দিয়ে resolve
    // (পুরোনো fallback)। তাই preset + custom — দুটোতেই auto-complete কাজ করে।
    const destLat = rider?.destLat ?? rider?.destinationLat;
    const destLng = rider?.destLng ?? rider?.destinationLng;

    const setupGeofence = async () => {
      if (!destination && destLat == null) return;

      // Use the ref so the callback always reaches the latest handleCompleteRide
      // regardless of when the geofence task fires relative to the render cycle
      registerGeofenceTask((_destinationId) => {
        Alert.alert(
          'Destination Reached! \u{1F389}',
          "You've arrived at your destination. Completing ride...",
          [{ text: 'OK' }]
        );
        handleCompleteRideRef.current();
      });

      try {
        if (typeof destLat === 'number' && typeof destLng === 'number') {
          // যেকোনো গন্তব্য (custom বা preset) — coordinate দিয়ে।
          await startGeofencingAtCoords('ride_destination', destLat, destLng, 120);
          logger.debug('RideActiveScreen', 'Geofencing started at coords', destLat, destLng);
        } else if (destination) {
          // fallback — preset DESTINATIONS তালিকার নাম দিয়ে।
          await startGeofencingForDestination(destination);
          logger.debug('RideActiveScreen', 'Geofencing started for', destination);
        }
      } catch (error) {
        logger.warn('RideActiveScreen.geofenceSetup', error);
      }
    };

    setupGeofence();

    return () => {
      stopGeofencing().catch((error) => {
        logger.warn('RideActiveScreen.geofenceStop', error);
      });
    };
  }, [rider?.destination, rider?.destLat, rider?.destLng, rider?.destinationLat, rider?.destinationLng]);

  // Movement detection — auto-confirm ride has physically started (5+ km/h)
  useEffect(() => {
    let alreadyMoving = false;
    const stopDetection = startMovementDetection(() => {
      if (alreadyMoving) return;
      alreadyMoving = true;
      logger.debug('RideActiveScreen', 'Movement detected — ride physically started');
      // Ride is already in 'active' state from RideConfirmedScreen.
      // Movement detection here is a confirmation signal only — no extra state change needed.
      // If you want a "Ride Started" toast, uncomment below:
      // Alert.alert('Ride Started', 'Movement detected — your ride is underway!');
    });
    return () => stopDetection();
  }, []);

  const handleCompleteRide = async () => {
    handleCompleteRideRef.current = handleCompleteRide;
    if (!rideId) return;
    try {
      await rideService.completeRide(rideId);
      trackRideComplete(rideId, fare ?? 0, splitFare ? (fare ?? 0) - splitFare : 0);
      setStatus('completed');
      navigation.navigate('RideComplete', {
        rideId,
        rider,
        fare,
        splitFare,
        routePreview: currentRoutePreview,
      });
    } catch (error) {
      logger.warn('RideActiveScreen.completeRide', error);
    }
  };

  const handleShareRide = async () => {
    const destName = rider?.destination ?? 'destination';
    const dest =
      getDestinationByName(destName) ?? getDestinationById(destName) ?? null;
    const myLat = useLocationStore.getState().latitude;
    const myLng = useLocationStore.getState().longitude;
    if (!dest) {
      Alert.alert('Cannot share', 'Destination coordinates unknown.');
      return;
    }
    await shareRide({
      riderName: 'I',
      destinationName: dest.name,
      destinationLat: dest.lat,
      destinationLng: dest.lng,
      currentLat: myLat ?? undefined,
      currentLng: myLng ?? undefined,
      etaMinutes: currentRoutePreview?.durationSeconds
        ? Math.round(currentRoutePreview.durationSeconds / 60)
        : undefined,
      rideId: rideId ?? undefined,
    });
  };

  const handleComplete = () => {
    Alert.alert(
      'Complete Ride',
      'Have you reached the destination?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Complete',
          onPress: handleCompleteRide,
        },
      ]
    );
  };

  const partnerName = rider?.name ?? 'Partner';
  const partnerInitial = partnerName.charAt(0).toUpperCase();
  const destination = rider?.destination ?? 'Unknown';
  const displayFare = currentRoutePreview?.splitFare ?? splitFare ?? 0;
  const distText = currentRoutePreview?.distanceMeters
    ? `${(currentRoutePreview.distanceMeters / 1000).toFixed(1)} km`
    : '—';
  const etaText = currentRoutePreview?.durationText ?? '—';

  return (
    <View style={styles.bg}>
      {/* ambient glow */}
      <View style={[styles.glow, { top: -60, left: -60, backgroundColor: 'rgba(124,111,247,0.12)' }]} />
      <View style={[styles.glow, { bottom: 80, right: -40, backgroundColor: 'rgba(20,184,166,0.10)', width: 220, height: 220 }]} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.liveRow}>
              <LiveDot />
              <Text style={styles.liveText}>RIDE IN PROGRESS</Text>
            </View>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShareRide}
              activeOpacity={0.8}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="share-variant" size={16} color="#A5B4FC" />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
            <TimerRing elapsed={elapsed} />
          </View>

          {/* Partner card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>RIDE PARTNER</Text>
            <View style={styles.partnerRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{partnerInitial}</Text>
              </View>
              <View style={styles.partnerInfo}>
                <Text style={styles.partnerName}>{partnerName}</Text>
                <View style={styles.chip}>
                  <IconUser />
                  <Text style={styles.chipText}>Co-rider</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Route info card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>RIDE DETAILS</Text>
            <View style={styles.divider} />
            <InfoRow icon={<IconPin />} label="Destination" value={destination} />
            <View style={styles.divider} />
            <InfoRow icon={<IconRoute />} label="Distance" value={distText} />
            <View style={styles.divider} />
            <InfoRow icon={<IconClock />} label="ETA" value={etaText} />
            <View style={styles.divider} />
            <InfoRow icon={<IconMoney />} label="Your fare" value={`৳${displayFare}`} />
          </View>

          {/* Reminder */}
          <View style={styles.reminderCard}>
            <Text style={styles.reminderTitle}>Payment Reminder</Text>
            <Text style={styles.reminderText}>
              Settle your split fare with your partner directly. GoShareX does not handle payments and is not responsible for any monetary disputes.
            </Text>
          </View>

        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleComplete} activeOpacity={0.85}>
          <View style={styles.completeBtn}>
            <Text style={styles.completeBtnText}>Complete Ride</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  glow: { position: 'absolute', width: 280, height: 280, borderRadius: 140 },
  scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 120 },

  header: { alignItems: 'center', marginBottom: 28 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  liveText: { fontSize: 11, fontWeight: '800', color: C.green, letterSpacing: 1.5 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(124,111,247,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124,111,247,0.3)',
    marginBottom: 16,
  },
  shareBtnText: { fontSize: 12, fontWeight: '700', color: '#A5B4FC', letterSpacing: 0.3 },

  timerWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  timerInner: { position: 'absolute', alignItems: 'center' },
  timerMins: { fontSize: 34, fontWeight: '800', color: C.text, letterSpacing: -1 },
  timerLabel: { fontSize: 11, color: C.muted, marginTop: 2, letterSpacing: 0.5 },

  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 1.5, marginBottom: 14 },

  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.45)',
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  partnerInfo: { flex: 1, gap: 6 },
  partnerName: { fontSize: 18, fontWeight: '700', color: C.text },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20,184,166,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.25)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  chipText: { fontSize: 10, fontWeight: '700', color: C.teal },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 13, color: C.muted },
  infoValue: { fontSize: 14, fontWeight: '700', color: C.text },

  reminderCard: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  reminderTitle: { fontSize: 11, fontWeight: '800', color: C.amber, letterSpacing: 0.8, marginBottom: 6 },
  reminderText: { fontSize: 12, color: 'rgba(245,158,11,0.8)', lineHeight: 18 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: 'rgba(7,9,15,0.95)',
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  completeBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.green,
    paddingHorizontal: 24,
  },
  completeBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
});
