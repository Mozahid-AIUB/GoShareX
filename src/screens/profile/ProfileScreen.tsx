import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import type { MainTabNavProp } from '@/navigation/types';

import authService from '@/services/authService';
import { getUser } from '@/services/firebase/userService';
import { getTrustBreakdown, RATING_CATEGORIES, type TrustBreakdown } from '@/services/firebase/ratingService';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types/auth.types';
import PremiumIcon from '@/components/common/PremiumIcon';
import { logger } from '@/utils/logger';
import { useScreenFocusTracking } from '@/hooks/useScreenTracking';

const SW = Dimensions.get('window').width;

const C = {
  bg: '#FAF8FF',
  card: '#FFFFFF',
  cardSolid: '#FFFFFF',
  border: '#EDE8F5',
  primary: '#6366F1',
  teal: '#0D9488',
  amber: '#F59E0B',
  green: '#10B981',
  red: '#EF4444',
  pink: '#EC4899',
  blue: '#6366F1',
  text: '#1A1A2E',
  textSub: '#6B7280',
  textMuted: '#9896A8',
  white: '#FFFFFF',
};

const BADGE_META: Record<string, { color: string; bg: string; next?: string; ridesNeeded?: number; icon: string }> = {
  'New Rider':   { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', next: 'Regular',  ridesNeeded: 6,  icon: 'sprout' },
  'Regular':     { color: '#34D399', bg: 'rgba(52,211,153,0.12)',  next: 'Trusted',  ridesNeeded: 21, icon: 'rocket-launch' },
  'Trusted':     { color: '#818CF8', bg: 'rgba(129,140,248,0.12)', next: 'Elite Rider', ridesNeeded: 51, icon: 'diamond-stone' },
  'Elite Rider': { color: '#C084FC', bg: 'rgba(192,132,252,0.12)', icon: 'crown-outline' },
  'Unreliable':  { color: '#F87171', bg: 'rgba(248,113,113,0.12)', icon: 'alert-outline' },
};

const SUPPORT_EMAIL    = 'mozahidislam343@gmail.com';
const SPONSORSHIP_EMAIL = 'mozahidislam343@gmail.com';

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ d, color = C.textSub, size = 16 }: { d: string; color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d={d} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconEdit     = () => <Icon d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />;
const IconHistory  = () => <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />;
const IconSettings = () => <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />;
const IconAlert    = () => <Icon d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" color={C.red} />;
const IconMail     = () => <Icon d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" color={C.amber} />;
const IconShield   = () => <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" color={C.teal} />;
const IconInfo     = () => <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8h.01M12 12v4" color={C.textSub} />;
const IconRide     = () => <Icon d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3M9 17h6m4 0h2M7 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zM13 11h8l-2 4" color={C.blue} />;
const IconLogout   = () => <Icon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" color={C.red} />;
const IconChevron  = () => <Icon d="M9 18l6-6-6-6" color={C.textMuted} />;
const IconStar     = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24">
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={C.amber} />
  </Svg>
);
const IconLock = ({ size = 12, color = '#9896A8' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 11h18v11H3z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    <Path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);
const BadgeIcon = ({ badge, size = 20 }: { badge: string; size?: number }) => {
  if (badge === 'Elite Rider') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs><LinearGradient id="crown" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#C084FC"/><Stop offset="1" stopColor="#F59E0B"/></LinearGradient></Defs>
      <Path d="M3 18h18M5 18L3 8l5 4 4-6 4 6 5-4-2 10H5z" stroke="url(#crown)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </Svg>
  );
  if (badge === 'Trusted') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs><LinearGradient id="gem" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#818CF8"/><Stop offset="1" stopColor="#14B8A6"/></LinearGradient></Defs>
      <Path d="M6 3h12l4 6-10 12L2 9z" stroke="url(#gem)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <Path d="M2 9h20M6 3l4 6M18 3l-4 6" stroke="url(#gem)" strokeWidth="1.4" strokeLinecap="round"/>
    </Svg>
  );
  if (badge === 'Regular') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs><LinearGradient id="rocket" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#34D399"/><Stop offset="1" stopColor="#6366F1"/></LinearGradient></Defs>
      <Path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" stroke="url(#rocket)" strokeWidth="1.8" strokeLinecap="round"/>
      <Path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" stroke="url(#rocket)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
  if (badge === 'Unreliable') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#F87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M12 9v4M12 17h.01" stroke="#F87171" strokeWidth="2" strokeLinecap="round"/>
    </Svg>
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs><LinearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#94A3B8"/><Stop offset="1" stopColor="#34D399"/></LinearGradient></Defs>
      <Path d="M12 22V12M12 12C12 12 7 10 7 5a5 5 0 0110 0c0 5-5 7-5 7z" stroke="url(#leaf)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
};

// ─── Animated progress bar ────────────────────────────────────────────────────
const ProgressBar = ({ value, color }: { value: number; color: string }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 1000, useNativeDriver: false }).start();
  }, [value]);
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: '#EDE8F5', overflow: 'hidden' }}>
      <Animated.View style={{
        height: '100%', borderRadius: 2, backgroundColor: color,
        width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
      }} />
    </View>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, icon, progress }: {
  label: string; value: string; color: string; icon: React.ReactNode; progress?: number;
}) => (
  <View style={[sc.card, { borderColor: `${color}22` }]}>
    <View style={sc.topRow}>
      <View style={[sc.iconBox, { backgroundColor: `${color}18` }]}>{icon}</View>
      <Text style={[sc.val, { color }]}>{value}</Text>
    </View>
    <Text style={sc.lbl}>{label}</Text>
    {progress !== undefined && <View style={{ marginTop: 8 }}><ProgressBar value={progress} color={color} /></View>}
  </View>
);

// ─── Menu item ────────────────────────────────────────────────────────────────
const MenuItem = ({ icon, label, sub, onPress, danger, rightBadge }: {
  icon: React.ReactNode; label: string; sub?: string; onPress: () => void; danger?: boolean; rightBadge?: string;
}) => (
  <TouchableOpacity style={mi.row} onPress={onPress} activeOpacity={0.7}>
    <View style={[mi.iconWrap, danger && { backgroundColor: 'rgba(244,63,94,0.1)' }]}>{icon}</View>
    <View style={mi.texts}>
      <Text style={[mi.label, danger && { color: C.red }]}>{label}</Text>
      {sub && <Text style={mi.sub}>{sub}</Text>}
    </View>
    {rightBadge && (
      <View style={mi.badge}><Text style={mi.badgeTxt}>{rightBadge}</Text></View>
    )}
    <IconChevron />
  </TouchableOpacity>
);

// ─── Trust breakdown ──────────────────────────────────────────────────────────
const CAT_KEYS: Record<string, keyof TrustBreakdown> = {
  friendly: 'friendlyPct',
  safeRide: 'safeRidePct',
};

const TrustCard = ({ breakdown, onExplain }: { breakdown: TrustBreakdown; onExplain: () => void }) => {
  const scoreColor = breakdown.trustScore >= 80 ? C.green : breakdown.trustScore >= 60 ? C.amber : C.red;
  return (
    <TouchableOpacity onPress={onExplain} activeOpacity={0.85} style={tc.wrap}>
      <View style={tc.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={tc.title}>Trust Score</Text>
            <View style={tc.infoIcon}>
              <Text style={tc.infoIconText}>i</Text>
            </View>
          </View>
          <Text style={tc.sub}>Based on {breakdown.totalRatings} anonymous ratings · tap for info</Text>
        </View>
        <View style={[tc.scoreBadge, { borderColor: `${scoreColor}40`, backgroundColor: `${scoreColor}12` }]}>
          <Text style={[tc.scoreNum, { color: scoreColor }]}>{breakdown.trustScore}</Text>
          <Text style={[tc.scoreOf, { color: scoreColor }]}>/100</Text>
        </View>
      </View>

      <View style={tc.starRow}>
        {[1,2,3,4,5].map(sv => (
          <Svg key={sv} width={15} height={15} viewBox="0 0 24 24">
            <Defs><LinearGradient id={`star${sv}`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#F59E0B"/><Stop offset="1" stopColor="#EF4444"/></LinearGradient></Defs>
            <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={sv <= Math.round(breakdown.avgStars) ? `url(#star${sv})` : 'rgba(0,0,0,0.1)'} stroke="none"/>
          </Svg>
        ))}
        <Text style={tc.starNum}>{breakdown.avgStars.toFixed(1)}</Text>
      </View>

      <View style={tc.cats}>
        {RATING_CATEGORIES.map(cat => {
          const pct = (breakdown[CAT_KEYS[cat.id]] as number) ?? 0;
          const barColor = pct >= 80 ? C.green : pct >= 60 ? C.amber : C.red;
          return (
            <View key={cat.id} style={tc.catRow}>
              <PremiumIcon
                name={cat.id === 'safeRide' ? 'shield-check-outline' : 'emoticon-happy-outline'}
                size={10}
                tone={cat.id === 'safeRide' ? 'teal' : 'amber'}
                containerStyle={tc.catIcon}
              />
              <Text style={tc.catLabel}>{cat.label}</Text>
              <View style={tc.barTrack}>
                <View style={[tc.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
              </View>
              <Text style={[tc.catPct, { color: barColor }]}>{pct}%</Text>
            </View>
          );
        })}
      </View>
      <View style={tc.anonRow}>
        <PremiumIcon name="lock-outline" size={10} tone="slate" />
        <Text style={tc.anonNote}>Individual raters are never revealed</Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Trust Score explanation modal ────────────────────────────────────────────
const TrustExplainModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={tx.overlay} onPress={onClose}>
      <Pressable style={tx.card} onPress={(e) => e.stopPropagation()}>
        <View style={tx.header}>
          <Text style={tx.title}>How Trust Score Works</Text>
          <TouchableOpacity onPress={onClose} style={tx.closeBtn} activeOpacity={0.7}>
            <Text style={tx.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={tx.intro}>
          Your Trust Score (0–100) reflects how well other riders rated their experience with you. Higher = more trusted.
        </Text>

        <View style={tx.formulaBox}>
          <Text style={tx.formulaLabel}>Formula</Text>
          <Text style={tx.formulaText}>
            <Text style={tx.formulaBold}>70%</Text> from your average stars (1–5)
          </Text>
          <Text style={tx.formulaText}>
            <Text style={tx.formulaBold}>30%</Text> from positive trait %s (Friendly + Safe)
          </Text>
        </View>

        <View style={tx.scaleRow}>
          <View style={[tx.scaleBox, { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.3)' }]}>
            <Text style={[tx.scaleNum, { color: C.green }]}>80–100</Text>
            <Text style={tx.scaleLbl}>Excellent</Text>
          </View>
          <View style={[tx.scaleBox, { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' }]}>
            <Text style={[tx.scaleNum, { color: C.amber }]}>60–79</Text>
            <Text style={tx.scaleLbl}>Good</Text>
          </View>
          <View style={[tx.scaleBox, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)' }]}>
            <Text style={[tx.scaleNum, { color: C.red }]}>0–59</Text>
            <Text style={tx.scaleLbl}>Improve</Text>
          </View>
        </View>

        <View style={tx.tipBox}>
          <Text style={tx.tipTitle}>How to improve</Text>
          <Text style={tx.tipItem}>• Be on time at the pickup point</Text>
          <Text style={tx.tipItem}>• Greet your partner friendly</Text>
          <Text style={tx.tipItem}>• Settle the fare fairly before starting</Text>
          <Text style={tx.tipItem}>• Stay respectful during the ride</Text>
        </View>

        <View style={tx.privacyRow}>
          <Text style={tx.privacyText}>
            Ratings stay anonymous — the other person never knows what you scored them.
          </Text>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

// ─── Report modal ─────────────────────────────────────────────────────────────
const ReportModal = ({ visible, onClose, userEmail }: { visible: boolean; onClose: () => void; userEmail?: string }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('GoShareX — Problem Report')}&body=${encodeURIComponent(`From: ${userEmail ?? 'unknown'}\n\n${text}`)}`;
    try {
      await Linking.openURL(url);
      setText('');
      onClose();
    } catch {
      Alert.alert('Error', 'Could not open email app.');
    } finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={rm.overlay} onPress={onClose}>
        <Pressable style={rm.sheet} onPress={e => e.stopPropagation()}>
          <View style={rm.handle} />
          <Text style={rm.title}>Report a Problem</Text>
          <Text style={rm.sub}>We'll get back to you within 24 hours.</Text>
          <TextInput
            style={rm.input}
            placeholder="Describe what went wrong…"
            placeholderTextColor={C.textMuted}
            multiline numberOfLines={5}
            value={text} onChangeText={setText} editable={!busy}
          />
          <View style={rm.btnRow}>
            <TouchableOpacity style={rm.cancel} onPress={onClose}>
              <Text style={rm.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[rm.send, (!text.trim() || busy) && rm.sendDim]} onPress={send} disabled={!text.trim() || busy}>
              <Text style={rm.sendTxt}>{busy ? 'Sending…' : 'Send Report'}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

function isRecoverable(err: unknown) {
  const s = String((err as any)?.code ?? '') + String((err as any)?.message ?? '');
  return /unavailable|deadline|precondition|network|offline|unstable/i.test(s);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  useScreenFocusTracking('Profile');
  const navigation = useNavigation<MainTabNavProp>();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { user, logout, setUser } = useAuthStore();
  const [profile, setProfile]     = useState<User | null>(user);
  const [breakdown, setBreakdown] = useState<TrustBreakdown | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [trustExplainVisible, setTrustExplainVisible] = useState(false);
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => { setProfile(user); }, [user]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!user?.uid) return () => { active = false; };
    Promise.all([
      getUser(user.uid),
      getTrustBreakdown(user.uid),
    ]).then(([next, b]) => {
      if (!active) return;
      if (next) { const merged = { ...next, profileStatus: 'live' as const, profileWarning: undefined }; setProfile(merged); setUser(merged); }
      if (b) setBreakdown(b);
    }).catch(e => { if (!isRecoverable(e)) logger.warn('ProfileScreen.refresh', e); });
    return () => { active = false; };
  }, [user?.uid, setUser]));

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        try { await authService.logout(); } finally { logout(); }
      }},
    ]);
  };

  const badge      = profile?.badge ?? 'New Rider';
  const badgeMeta  = BADGE_META[badge] ?? BADGE_META['New Rider'];
  const totalRides = profile?.totalRides ?? 0;
  const rating     = profile?.rating ?? 5;
  const totalSaved = profile?.totalSaved ?? 0;
  const completion = profile?.completionRate ?? 100;
  const trustScore = breakdown?.trustScore ?? profile?.trustScore ?? 0;
  const strikes    = profile?.strikes ?? 0;
  const joinedAt   = useMemo(() => profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-BD', { year: 'numeric', month: 'short' })
    : '—', [profile?.createdAt]);

  const { badgeProgress, ridesLeft } = useMemo(() => {
    let progress = 100;
    if (badge === 'New Rider') progress = Math.min((totalRides / 6) * 100, 100);
    else if (badge === 'Regular') progress = Math.min(((totalRides - 6) / 15) * 100, 100);
    else if (badge === 'Trusted') progress = Math.min(((totalRides - 21) / 30) * 100, 100);
    return { badgeProgress: progress, ridesLeft: badgeMeta.ridesNeeded ? Math.max(badgeMeta.ridesNeeded - totalRides, 0) : 0 };
  }, [badge, totalRides, badgeMeta.ridesNeeded]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Background glows */}
      <View style={[s.glow, { top: -80, right: -60, backgroundColor: 'rgba(99,102,241,0.08)' }]} />
      <View style={[s.glow, { bottom: 120, left: -80, backgroundColor: 'rgba(13,148,136,0.06)', width: 280, height: 280 }]} />

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 80, paddingHorizontal: 16, paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>

          {/* ── Hero card ── */}
          <View style={s.hero}>
            <View style={s.heroRow}>
              {/* Avatar */}
              <View style={s.avatarWrap}>
                <View style={[s.avatarRing, { borderColor: badgeMeta.color }]}>
                  <Svg width={76} height={76} viewBox="0 0 76 76" style={StyleSheet.absoluteFillObject}>
                    <Defs>
                      <LinearGradient id="av" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={badgeMeta.color} stopOpacity="0.25" />
                        <Stop offset="1" stopColor={badgeMeta.color} stopOpacity="0.05" />
                      </LinearGradient>
                    </Defs>
                    <Circle cx="38" cy="38" r="38" fill="url(#av)" />
                  </Svg>
                  <Text style={[s.avatarLetter, { color: badgeMeta.color }]}>
                    {(profile?.name ?? 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={s.onlineDot} />
              </View>

              {/* Info */}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.name} numberOfLines={1}>{profile?.name ?? 'Rider'}</Text>
                <Text style={s.email} numberOfLines={1}>{profile?.email ?? '—'}</Text>
                <View style={s.pillRow}>
                  <View style={[s.badgePill, { backgroundColor: badgeMeta.bg, borderColor: `${badgeMeta.color}40` }]}>
                    <BadgeIcon badge={badge} size={13} />
                    <Text style={[s.badgeLabel, { color: badgeMeta.color }]}>{badge}</Text>
                  </View>
                  <View style={s.ratingPill}>
                    <IconStar />
                    <Text style={s.ratingTxt}>{rating.toFixed(1)}</Text>
                  </View>
                </View>
                <Text style={s.joinedTxt}>Member since {joinedAt}</Text>
              </View>
            </View>

            {/* Badge progress */}
            {badge !== 'Elite Rider' && badge !== 'Unreliable' && (
              <View style={s.progressSection}>
                <View style={s.progressLabelRow}>
                  <Text style={s.progressLabel}>Progress to {badgeMeta.next}</Text>
                  <Text style={[s.progressPct, { color: badgeMeta.color }]}>
                    {ridesLeft > 0 ? `${ridesLeft} rides left` : 'Almost there!'}
                  </Text>
                </View>
                <ProgressBar value={badgeProgress} color={badgeMeta.color} />
              </View>
            )}

            {/* Quick stats strip */}
            <View style={s.quickRow}>
              {[
                { val: String(totalRides), lbl: 'Rides' },
                { val: `৳${totalSaved}`,  lbl: 'Saved' },
                { val: trustScore > 0 ? `${trustScore}` : '—', lbl: 'Trust' },
              ].map((item, i) => (
                <View key={i} style={[s.quickItem, i > 0 && s.quickBorder]}>
                  <Text style={s.quickVal}>{item.val}</Text>
                  <Text style={s.quickLbl}>{item.lbl}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Stats grid (Trust Score already shown in TrustCard above) ── */}
          <View style={s.grid}>
            <StatCard label="Rating"      value={rating.toFixed(1)}   color={C.pink}    icon={<IconStar />}    progress={(rating / 5) * 100} />
            <StatCard label="Total Rides" value={String(totalRides)}  color={C.primary} icon={<IconRide />}    progress={Math.min((totalRides / 50) * 100, 100)} />
            <StatCard label="Saved (৳)"   value={`৳${totalSaved}`}    color={C.amber}   icon={<IconHistory />} progress={Math.min((totalSaved / 1000) * 100, 100)} />
            <StatCard label="Completion"  value={`${completion}%`}    color={C.teal}    icon={<IconHistory />} progress={completion} />
          </View>

          {/* ── Trust breakdown ── */}
          {breakdown && breakdown.totalRatings > 0 && (
            <TrustCard breakdown={breakdown} onExplain={() => setTrustExplainVisible(true)} />
          )}

          {/* ── Strikes warning ── */}
          {strikes > 0 && (
            <View style={s.strikeBanner}>
              <IconAlert />
              <Text style={s.strikeTxt}>
                {strikes} strike{strikes > 1 ? 's' : ''} on your account.
                {strikes >= 2 ? ' One more will result in a 24h suspension.' : ''}
              </Text>
            </View>
          )}

          {/* ── Account ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Account</Text>
            <MenuItem icon={<IconEdit />}     label="Edit Profile"  sub="Update name & photo"       onPress={() => navigation.navigate('EditProfile')} />
            <MenuItem icon={<IconHistory />}  label="Ride History"  sub="Past rides & receipts"      onPress={() => navigation.navigate('RideHistory')} />
            <MenuItem icon={<IconSettings />} label="Settings"      sub="Notifications, privacy"     onPress={() => navigation.navigate('Settings')} />
          </View>

          {/* ── Support ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Support</Text>
            <MenuItem icon={<IconAlert />} label="Report a Problem"      sub="We respond within 24h"         onPress={() => setReportVisible(true)} />
            <MenuItem icon={<IconMail />}  label="Contact Us"            sub={SUPPORT_EMAIL}                 onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})} />
            <MenuItem icon={<IconInfo />}  label="Financial Disclaimer"  sub="About fare splits & payments"  onPress={() => setDisclaimerVisible(true)} />
          </View>

          {/* ── Become a Sponsor ── */}
          <TouchableOpacity
            style={s.sponsorBtn}
            onPress={() => Linking.openURL(`mailto:${SPONSORSHIP_EMAIL}?subject=GoShareX%20Sponsorship%20Inquiry`).catch(() => {})}
            activeOpacity={0.85}
          >
            <IconMail />
            <View style={{ flex: 1 }}>
              <Text style={s.sponsorTitle}>Become a Sponsor</Text>
              <Text style={s.sponsorSub}>Partner with GoShareX · {SPONSORSHIP_EMAIL}</Text>
            </View>
          </TouchableOpacity>

          {/* ── App info ── */}
          <View style={s.appInfo}>
            <Text style={s.appName}>GoShareX</Text>
            <View style={s.appTaglineRow}>
              <Text style={s.appTagline}>Share rides · Save money</Text>
              <PremiumIcon name="rickshaw" size={12} tone="amber" />
            </View>
            <Text style={s.appVersion}>v1.1.1 · © 2026</Text>
          </View>

          {/* ── Logout ── */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <IconLogout />
            <Text style={s.logoutTxt}>Sign Out</Text>
          </TouchableOpacity>

        </Animated.View>
      </Animated.ScrollView>

      <ReportModal visible={reportVisible} onClose={() => setReportVisible(false)} userEmail={profile?.email} />
      <TrustExplainModal visible={trustExplainVisible} onClose={() => setTrustExplainVisible(false)} />

      {/* Financial Disclaimer Modal */}
      <Modal visible={disclaimerVisible} transparent animationType="slide" onRequestClose={() => setDisclaimerVisible(false)}>
        <Pressable style={rm.overlay} onPress={() => setDisclaimerVisible(false)}>
          <Pressable style={rm.sheet} onPress={e => e.stopPropagation()}>
            <View style={rm.handle} />
            <Text style={rm.title}>Financial Disclaimer</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              <Text style={dl.body}>
                GoShareX is a <Text style={dl.bold}>ride-matching platform</Text> that helps users coordinate shared rides. We are{' '}
                <Text style={dl.bold}>not a payment processor</Text> and do not handle any money on your behalf.{'\n\n'}
                All fare amounts shown are <Text style={dl.bold}>estimates only</Text>. Actual fares may vary based on distance, route, and mutual agreement between riders.{'\n\n'}
                GoShareX is <Text style={dl.bold}>not responsible</Text> for any financial disputes, unpaid amounts, or disagreements between riders. All transactions are made directly between users.{'\n\n'}
                By using GoShareX, you agree to settle any fare-related matters directly with your ride partner. In case of disputes, users are encouraged to contact support for assistance.
              </Text>
            </ScrollView>
            <TouchableOpacity style={[rm.send, { marginTop: 16 }]} onPress={() => setDisclaimerVisible(false)}>
              <Text style={rm.sendTxt}>Got It</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Stat card styles ─────────────────────────────────────────────────────────
const sc = StyleSheet.create({
  card: {
    flex: 1, minWidth: (SW - 44) / 2, maxWidth: (SW - 44) / 2,
    borderRadius: 16, padding: 12, borderWidth: 1,
    backgroundColor: C.card,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  iconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  val: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  lbl: { fontSize: 11, color: C.textSub, fontWeight: '600' },
});

// ─── Menu item styles ─────────────────────────────────────────────────────────
const mi = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: '#EDE8F5', gap: 12,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#F3F0FF',
    alignItems: 'center', justifyContent: 'center',
  },
  texts: { flex: 1 },
  label: { color: C.text, fontSize: 14, fontWeight: '700' },
  sub:   { color: C.textSub, fontSize: 11, fontWeight: '500', marginTop: 1 },
  badge: { backgroundColor: 'rgba(124,111,247,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginRight: 4 },
  badgeTxt: { color: C.primary, fontSize: 10, fontWeight: '800' },
});

// ─── Report modal styles ──────────────────────────────────────────────────────
const rm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.cardSolid, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: C.border,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D4D0E8', alignSelf: 'center', marginBottom: 20 },
  title:  { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sub:    { color: C.textSub, fontSize: 12, fontWeight: '500', marginBottom: 16 },
  input: {
    backgroundColor: '#F9F7FF', borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14, color: C.text, fontSize: 13,
    textAlignVertical: 'top', minHeight: 110, marginBottom: 16,
  },
  btnRow:    { flexDirection: 'row', gap: 10 },
  cancel:    { flex: 1, backgroundColor: '#F3F0FF', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cancelTxt: { color: C.textSub, fontSize: 14, fontWeight: '700' },
  send:      { flex: 1, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  sendDim:   { opacity: 0.4 },
  sendTxt:   { color: C.white, fontSize: 14, fontWeight: '800' },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  glow: { position: 'absolute', width: 260, height: 260, borderRadius: 130 },

  hero: {
    backgroundColor: C.card, borderRadius: 24, padding: 18,
    borderWidth: 1, borderColor: C.border, marginBottom: 12,
  },
  heroRow:    { flexDirection: 'row', gap: 14, marginBottom: 18 },
  avatarWrap: { position: 'relative' },
  avatarRing: {
    width: 76, height: 76, borderRadius: 38, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarLetter: { fontSize: 30, fontWeight: '900', zIndex: 1 },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: C.green, borderWidth: 2, borderColor: C.bg,
  },

  name:      { color: C.text, fontSize: 18, fontWeight: '800' },
  email:     { color: C.textSub, fontSize: 11, fontWeight: '500' },
  pillRow:   { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  badgePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  badgeEmoji: { fontSize: 11 },
  badgeLabel: { fontSize: 11, fontWeight: '700' },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
    backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  ratingTxt: { color: C.amber, fontSize: 11, fontWeight: '800' },
  joinedTxt: { color: C.textSub, fontSize: 10 },

  progressSection:  { marginBottom: 16 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel:    { color: C.textSub, fontSize: 11, fontWeight: '600' },
  progressPct:      { fontSize: 11, fontWeight: '700' },

  quickRow:    { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EDE8F5', paddingTop: 14 },
  quickItem:   { flex: 1, alignItems: 'center' },
  quickBorder: { borderLeftWidth: 1, borderLeftColor: '#EDE8F5' },
  quickVal:    { color: C.text, fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  quickLbl:    { color: C.textSub, fontSize: 10, fontWeight: '600', marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },

  strikeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(244,63,94,0.08)', borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.25)', borderRadius: 14, padding: 12, marginBottom: 12,
  },
  strikeTxt: { flex: 1, color: C.red, fontSize: 12, fontWeight: '600', lineHeight: 17 },

  section: {
    backgroundColor: C.card, borderRadius: 20, borderWidth: 1,
    borderColor: C.border, marginBottom: 12, overflow: 'hidden',
  },
  sectionTitle: {
    color: C.textSub, fontSize: 10, fontWeight: '800', letterSpacing: 1.3,
    textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },

  appInfo: { alignItems: 'center', paddingVertical: 24, gap: 5 },
  appName:    { color: C.primary, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  appTaglineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appTagline: { color: C.textSub, fontSize: 12, fontWeight: '600' },
  appVersion: { color: C.textSub, fontSize: 10, fontWeight: '500' },

  sponsorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(245,158,11,0.07)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: 18, padding: 16, marginBottom: 12,
  },
  sponsorTitle: { fontSize: 14, fontWeight: '800', color: '#92680A' },
  sponsorSub:   { fontSize: 11, color: C.textMuted, marginTop: 2 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.07)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)', borderRadius: 16, paddingVertical: 14, marginBottom: 8,
  },
  logoutTxt: { color: C.red, fontSize: 14, fontWeight: '800' },
});

// ─── Trust card styles ────────────────────────────────────────────────────────
const tc = StyleSheet.create({
  wrap: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1,
    borderColor: C.border, padding: 12, marginBottom: 10,
  },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title:      { color: C.text, fontSize: 13, fontWeight: '800', marginBottom: 1 },
  sub:        { color: C.textSub, fontSize: 10, fontWeight: '500' },
  scoreBadge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', flexDirection: 'row', gap: 2 },
  scoreNum:   { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  scoreOf:    { fontSize: 10, fontWeight: '700', marginTop: 3 },
  starRow:    { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 10 },
  starNum:    { color: C.amber, fontSize: 13, fontWeight: '800', marginLeft: 5 },
  cats:       { gap: 6 },
  catRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catIcon:    { width: 18, height: 18 },
  catLabel:   { color: C.textSub, fontSize: 11, fontWeight: '600', width: 75 },
  barTrack:   { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#EDE8F5', overflow: 'hidden' },
  barFill:    { height: '100%', borderRadius: 2 },
  catPct:     { fontSize: 11, fontWeight: '800', width: 32, textAlign: 'right' },
  anonRow:    { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  anonNote:   { fontSize: 9, color: C.textMuted, textAlign: 'center', fontStyle: 'italic' },
  infoIcon:   { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(99,102,241,0.18)', alignItems: 'center', justifyContent: 'center' },
  infoIconText: { fontSize: 9, fontWeight: '900', color: C.primary, fontStyle: 'italic' },
});

// ─── Trust explain modal styles ───────────────────────────────────────────────
const tx = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 22,
    padding: 22, borderWidth: 1, borderColor: '#EDE8F5',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '900', color: '#1A1A2E', letterSpacing: -0.3 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 13, fontWeight: '900', color: '#475569' },
  intro: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 16 },

  formulaBox: { backgroundColor: 'rgba(99,102,241,0.06)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.18)', borderRadius: 14, padding: 14, marginBottom: 14, gap: 4 },
  formulaLabel: { fontSize: 10, fontWeight: '800', color: '#6366F1', letterSpacing: 0.6, marginBottom: 4 },
  formulaText: { fontSize: 13, color: '#1A1A2E' },
  formulaBold: { fontWeight: '900', color: '#6366F1' },

  scaleRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  scaleBox: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  scaleNum: { fontSize: 13, fontWeight: '900', marginBottom: 2 },
  scaleLbl: { fontSize: 10, fontWeight: '700', color: '#475569' },

  tipBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 12 },
  tipTitle: { fontSize: 12, fontWeight: '800', color: '#1A1A2E', marginBottom: 6 },
  tipItem: { fontSize: 12, color: '#475569', lineHeight: 20 },

  privacyRow: { borderTopWidth: 1, borderTopColor: '#EDE8F5', paddingTop: 12 },
  privacyText: { fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 16, fontStyle: 'italic' },
});

// ─── Disclaimer styles ────────────────────────────────────────────────────────
const dl = StyleSheet.create({
  body: { color: C.textSub, fontSize: 13, lineHeight: 21 },
  bold: { color: C.text, fontWeight: '700' },
});
