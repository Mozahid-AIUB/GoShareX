import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Polyline, Stop } from 'react-native-svg';
import PremiumIcon from '@/components/common/PremiumIcon';
import { useRideStore } from '@/store/rideStore';
import { useAuthStore } from '@/store/authStore';
import rideService from '@/services/rideService';
import { submitRating, RATING_CATEGORIES, type CategoryId } from '@/services/ratingService';
import { supabase } from '@/config/supabase.config';
import { logger } from '@/utils/logger';
import type { RideRoutePreview } from '@/types/ride.types';
import { useSystemBars } from '@/hooks/useSystemBars';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#07090F',
  border: 'rgba(255,255,255,0.08)',
  primary: '#7C6FF7',
  teal: '#14B8A6',
  amber: '#F59E0B',
  green: '#22C55E',
  text: '#EEF2FF',
  muted: '#6B7A99',
  card: 'rgba(255,255,255,0.04)',
};

// ─── Check circle ─────────────────────────────────────────────────────────────
const CheckCircle = ({ scale }: { scale: Animated.Value }) => (
  <Animated.View style={{ transform: [{ scale }] }}>
    <Svg width={100} height={100} viewBox="0 0 100 100">
      <Defs>
        <SvgLinearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#22C55E" />
          <Stop offset="1" stopColor="#14B8A6" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx="50" cy="50" r="48" fill="url(#cg)" opacity={0.15} />
      <Circle cx="50" cy="50" r="44" stroke="url(#cg)" strokeWidth="2" fill="none" />
      <Polyline points="32,52 45,65 68,38" stroke="#22C55E" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </Animated.View>
);

// ─── Star icon ────────────────────────────────────────────────────────────────
const StarIcon = ({ filled, size = 40 }: { filled: boolean; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Defs>
      <SvgLinearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#F59E0B" />
        <Stop offset="1" stopColor="#F97316" />
      </SvgLinearGradient>
    </Defs>
    <Path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill={filled ? 'url(#sg)' : 'rgba(255,255,255,0.1)'}
      stroke={filled ? '#F59E0B' : 'rgba(255,255,255,0.15)'}
      strokeWidth="1"
    />
  </Svg>
);

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <View style={[st.statCard, { borderColor: `${color}30` }]}>
    <Text style={[st.statValue, { color }]}>{value}</Text>
    <Text style={st.statLabel}>{label}</Text>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function RideCompleteScreen() {
  useSystemBars(C.bg, 'light');
  const route     = useRoute<any>();
  const navigation = useNavigation<any>();
  const { clearRide } = useRideStore();
  const { user }  = useAuthStore();
  const { rideId, rider, splitFare, routePreview } = route.params ?? {};

  const [stars, setStars]           = useState(0);
  const [selected, setSelected]     = useState<CategoryId[]>([]);
  const [comment, setComment]       = useState('');
  const [submitted, setSubmitted]   = useState(false);
  const [busy, setBusy]             = useState(false);

  const [currentRoutePreview, setCurrentRoutePreview] = useState<RideRoutePreview | null>(routePreview ?? null);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideUp   = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (!rideId || routePreview) return;
    let mounted = true;
    rideService.getRide(rideId).then((ride) => {
      if (mounted && ride?.routePreview) setCurrentRoutePreview(ride.routePreview);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, [rideId, routePreview]);

  // Mark ride as completed (for rating reminder tracking)
  useEffect(() => {
    if (!rideId || !user?.uid || !rider?.uid) return;
    const markCompleted = async () => {
      try {
        const { error } = await supabase.rpc('mark_ride_completed', {
          p_ride_id: rideId,
          p_ratee_id: rider.uid || rider.userId,
          p_ratee_name: rider.name || 'Rider',
          p_rater_id: user.uid,
          p_rater_name: user.name || 'User',
        });
        if (error) logger.warn('RideCompleteScreen.markCompleted', error);
      } catch (e) {
        logger.warn('RideCompleteScreen.markCompleted', e);
      }
    };
    void markCompleted();
  }, [rideId, user?.uid, rider?.uid]);

  const toggleCategory = (id: CategoryId) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (stars === 0 || busy || !user) return;
    setBusy(true);
    try {
      const rateeId = rider?.userId ?? rider?.uid ?? '';
      await submitRating({
        rideId,
        rateeId,
        raterId: user.uid,
        stars,
        categories: selected,
        comment,
      });
      setSubmitted(true);
      clearRide();
      setTimeout(() => navigation.navigate('MainApp'), 1400);
    } catch {
      setBusy(false);
    }
  };

  const displayFare = currentRoutePreview?.splitFare ?? splitFare ?? 0;
  const distText    = currentRoutePreview?.distanceMeters
    ? `${(currentRoutePreview.distanceMeters / 1000).toFixed(1)} km` : '—';
  const etaText     = currentRoutePreview?.durationText ?? '—';

  const starLabel   = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][stars] ?? '';

  return (
    <View style={st.bg}>
      <View style={[st.glow, { top: -80, left: '50%', marginLeft: -100, backgroundColor: 'rgba(34,197,94,0.1)' }]} />
      <View style={[st.glow, { bottom: 60, right: -60, backgroundColor: 'rgba(124,111,247,0.08)' }]} />

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={st.heroSection}>
          <CheckCircle scale={scaleAnim} />
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUp }], alignItems: 'center', marginTop: 20 }}>
            <Text style={st.heroTitle}>Ride Complete!</Text>
            <Text style={st.heroSub}>You've reached your destination safely.</Text>
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUp }] }}>

          {/* Stats */}
          <View style={st.statsRow}>
            <StatCard label="You Saved" value={`৳${displayFare}`} color={C.green} />
            <StatCard label="Distance"  value={distText}           color={C.teal} />
            <StatCard label="Duration"  value={etaText}            color={C.primary} />
          </View>

          {/* Rating card */}
          {!submitted ? (
            <View style={st.card}>
              <Text style={st.cardEyebrow}>RATE YOUR PARTNER</Text>
              <Text style={st.cardSub}>
                How was your ride with{' '}
                <Text style={{ color: C.text, fontWeight: '800' }}>
                  {rider?.name ?? 'your partner'}
                </Text>
                ?
              </Text>

              {/* Stars */}
              <View style={st.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => setStars(s)} activeOpacity={0.7}>
                    <StarIcon filled={stars >= s} />
                  </TouchableOpacity>
                ))}
              </View>
              {stars > 0 && <Text style={st.starLabel}>{starLabel}</Text>}

              {/* Category chips — only show after stars picked */}
              {stars > 0 && (
                <View style={st.catSection}>
                  <Text style={st.catTitle}>What stood out? (optional)</Text>
                  <View style={st.catGrid}>
                    {RATING_CATEGORIES.map((cat) => {
                      const active = selected.includes(cat.id);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[st.catChip, active && st.catChipActive]}
                          onPress={() => toggleCategory(cat.id)}
                          activeOpacity={0.75}
                        >
                          <PremiumIcon
                            name={cat.id === 'safeRide' ? 'shield-check-outline' : 'emoticon-happy-outline'}
                            size={10}
                            tone={cat.id === 'safeRide' ? 'teal' : 'amber'}
                            containerStyle={st.catIcon}
                          />
                          <Text style={[st.catLabel, active && st.catLabelActive]}>
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={st.anonRow}>
                    <PremiumIcon name="lock-outline" size={10} tone="slate" />
                    <Text style={st.anonNote}>
                      Your rating is anonymous — your partner won't know it was you.
                    </Text>
                  </View>
                </View>
              )}

              {/* Comment box — shown after stars selected */}
              {stars > 0 && (
                <View style={st.commentWrap}>
                  <Text style={st.commentLabel}>Add a note (optional)</Text>
                  <TextInput
                    style={st.commentInput}
                    value={comment}
                    onChangeText={(t) => setComment(t.slice(0, 200))}
                    placeholder="e.g. Friendly partner, smooth ride…"
                    placeholderTextColor={C.muted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={200}
                  />
                  <Text style={st.commentCount}>{comment.length}/200</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={stars === 0 || busy}
                activeOpacity={0.85}
                style={{ marginTop: 20 }}
              >
                <View style={[st.submitBtn, stars === 0 ? st.submitBtnOff : st.submitBtnOn]}>
                  <Text style={[st.submitBtnTxt, stars === 0 && { color: C.muted }]}>
                    {busy ? 'Submitting…' : 'Submit Rating'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={st.successCard}>
              <Svg width={32} height={32} viewBox="0 0 24 24">
                <Circle cx="12" cy="12" r="10" fill="rgba(34,197,94,0.15)" />
                <Polyline points="8,12 11,15 16,9" stroke={C.green} strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </Svg>
              <Text style={st.successTitle}>Rating Submitted</Text>
              <Text style={st.successSub}>Thanks for helping build a trusted community.</Text>
            </View>
          )}

          {/* Disclaimer */}
          <View style={st.disclaimerCard}>
            <Text style={st.disclaimerTitle}>FINANCIAL DISCLAIMER</Text>
            <Text style={st.disclaimerText}>
              GoShareX is a platform for coordinating ride sharing only. We are{' '}
              <Text style={{ fontWeight: '800', color: C.amber }}>not responsible</Text>
              {' '}for any payment disputes, monetary loss, or fare disagreements between riders.
              All financial transactions are handled directly between users.
            </Text>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  bg:   { flex: 1, backgroundColor: C.bg },
  glow: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  scroll: { paddingHorizontal: 20, paddingTop: 70, paddingBottom: 60 },

  heroSection: { alignItems: 'center', marginBottom: 32 },
  heroTitle:   { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  heroSub:     { fontSize: 14, color: C.muted, marginTop: 6 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, color: C.muted, fontWeight: '600', letterSpacing: 0.3 },

  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20, marginBottom: 14 },
  cardEyebrow: { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 1.5, marginBottom: 6 },
  cardSub:     { fontSize: 14, color: C.muted, marginBottom: 20, lineHeight: 20 },

  starsRow: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  starLabel: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: C.amber, marginTop: 10 },

  // Category chips
  catSection: { marginTop: 20 },
  catTitle:   { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.5, marginBottom: 12 },
  catGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  catChipActive: {
    borderColor: 'rgba(20,184,166,0.5)',
    backgroundColor: 'rgba(20,184,166,0.12)',
  },
  catIcon:        { width: 20, height: 20 },
  catLabel:       { fontSize: 12, fontWeight: '600', color: C.muted },
  catLabelActive: { color: C.teal },
  anonRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  anonNote: {
    fontSize: 11,
    color: 'rgba(107,122,153,0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  commentWrap: { marginTop: 20 },
  commentLabel: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.5, marginBottom: 8 },
  commentInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, padding: 14,
    fontSize: 14, color: C.text, lineHeight: 20,
    minHeight: 80,
  },
  commentCount: { fontSize: 10, color: C.muted, textAlign: 'right', marginTop: 5 },

  submitBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitBtnOn:  { backgroundColor: C.primary, borderWidth: 1, borderColor: 'rgba(20,184,166,0.35)' },
  submitBtnOff: { backgroundColor: '#2A2D3A' },
  submitBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  successCard: {
    backgroundColor: 'rgba(34,197,94,0.06)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    borderRadius: 20, padding: 24, alignItems: 'center', gap: 10, marginBottom: 14,
  },
  successTitle: { fontSize: 18, fontWeight: '800', color: C.green },
  successSub:   { fontSize: 13, color: 'rgba(34,197,94,0.7)', textAlign: 'center' },

  disclaimerCard: {
    backgroundColor: 'rgba(245,158,11,0.06)', borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.18)', borderRadius: 16, padding: 14,
  },
  disclaimerTitle: { fontSize: 9, fontWeight: '800', color: C.amber, letterSpacing: 1.5, marginBottom: 6 },
  disclaimerText:  { fontSize: 12, color: 'rgba(245,158,11,0.75)', lineHeight: 18 },
});
