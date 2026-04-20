/**
 * SuspensionScreen.tsx
 * Shown when a user's account is suspended.
 * Uses only packages already in package.json — no LinearGradient, no vector-icons.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';

import badgePenaltyService from '@/services/user/badgePenaltyService';
import authService from '@/services/firebase/authService';
import { useAuthStore } from '@/store';

// ─── Countdown timer hook ────────────────────────────────────────────────────

function useCountdown(suspendedUntil: number) {
  const [remaining, setRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = suspendedUntil - Date.now();
      if (diff <= 0) {
        setRemaining({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setRemaining({
        hours: Math.floor(diff / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1_000),
      });
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [suspendedUntil]);

  return remaining;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SuspensionScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();

  const remainingHours: number = route.params?.remainingHours ?? 24;
  const reason: string = route.params?.reason ?? 'Confirmed ride cancellations';
  const suspendedUntil: number = Date.now() + remainingHours * 3_600_000;

  const countdown = useCountdown(suspendedUntil);

  const [appealText, setAppealText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [appealSent, setAppealSent] = useState(false);
  const [showAppeal, setShowAppeal] = useState(false);

  const pad = (n: number) => n.toString().padStart(2, '0');

  // Auto-navigate when suspension expires
  useEffect(() => {
    if (
      countdown.hours === 0 &&
      countdown.minutes === 0 &&
      countdown.seconds === 0 &&
      remainingHours > 0
    ) {
      Alert.alert(
        'Account পুনরুদ্ধার',
        'তোমার suspension শেষ হয়েছে। আবার ride share করো।',
        [{ text: 'ঠিক আছে', onPress: () => navigation.replace('MainApp') }],
      );
    }
  }, [countdown]);

  const handleAppeal = async () => {
    if (appealText.trim().length < 20) {
      Alert.alert('Appeal', 'কমপক্ষে ২০ অক্ষরের কারণ লেখো।');
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      await badgePenaltyService.submitAppeal(user.uid, appealText.trim());
      setAppealSent(true);
    } catch {
      Alert.alert('Error', 'Appeal পাঠানো যায়নি। আবার চেষ্টা করো।');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    logout();
    navigation.replace('Auth');
  };

  const RULES = [
    'Confirmed ride cancel করলে penalty পাবে',
    '৩টি strike হলে ২৪ ঘণ্টার suspension',
    '৫টি no-show হলে Unreliable badge',
    'Suspension শেষে strike count reset হয়',
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header (replaces LinearGradient) ── */}
        <View style={styles.header}>
          <View style={styles.shieldWrap}>
            <Text style={styles.shieldEmoji}>🚫</Text>
          </View>
          <Text style={styles.headerTitle}>Account সীমিত</Text>
          <Text style={styles.headerSub}>তোমার account সাময়িকভাবে বন্ধ আছে</Text>
        </View>

        {/* ── Countdown ── */}
        <View style={styles.countdownCard}>
          <Text style={styles.countdownLabel}>REMAINING TIME</Text>
          <View style={styles.countdownRow}>
            {[
              { value: pad(countdown.hours), unit: 'HRS' },
              { value: pad(countdown.minutes), unit: 'MIN' },
              { value: pad(countdown.seconds), unit: 'SEC' },
            ].map((item, i) => (
              <React.Fragment key={item.unit}>
                {i > 0 && <Text style={styles.colon}>:</Text>}
                <View style={styles.timeBox}>
                  <Text style={styles.timeValue}>{item.value}</Text>
                  <Text style={styles.timeUnit}>{item.unit}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── Reason ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚠️  কারণ</Text>
          <Text style={styles.cardBody}>{reason}</Text>
        </View>

        {/* ── Rules ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📖  Community Rules</Text>
          {RULES.map((rule, i) => (
            <View key={i} style={styles.ruleRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>

        {/* ── Appeal ── */}
        {!appealSent ? (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.appealToggle}
              onPress={() => setShowAppeal(v => !v)}
            >
              <Text style={styles.cardTitle}>⚖️  Appeal করো</Text>
              <Text style={styles.chevron}>{showAppeal ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showAppeal && (
              <>
                <Text style={styles.appealHint}>
                  মনে করো এটা ভুল? কারণ জানাও — admin review করবে।
                </Text>
                <TextInput
                  style={styles.appealInput}
                  placeholder="কেন suspension তুলে নেওয়া উচিত..."
                  placeholderTextColor="#BDBDBD"
                  multiline
                  numberOfLines={4}
                  value={appealText}
                  onChangeText={setAppealText}
                  maxLength={500}
                />
                <Text style={styles.charCount}>{appealText.length}/500</Text>
                <TouchableOpacity
                  style={[styles.appealBtn, submitting && styles.btnDisabled]}
                  onPress={handleAppeal}
                  disabled={submitting}
                >
                  <Text style={styles.appealBtnText}>
                    {submitting ? 'পাঠানো হচ্ছে...' : '📤  Appeal পাঠাও'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={[styles.card, styles.successCard]}>
            <Text style={styles.successEmoji}>✅</Text>
            <Text style={styles.successText}>Appeal পাঠানো হয়েছে।</Text>
            <Text style={styles.successSub}>Admin ২৪ ঘণ্টার মধ্যে review করবে।</Text>
          </View>
        )}

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪  Logout</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { paddingBottom: 40 },

  header: {
    backgroundColor: '#C62828',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 36,
    paddingHorizontal: 24,
  },
  shieldWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  shieldEmoji: { fontSize: 52 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', marginBottom: 6 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },

  countdownCard: {
    backgroundColor: '#FFF',
    margin: 16, borderRadius: 16, padding: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  countdownLabel: { fontSize: 11, fontWeight: '700', color: '#9E9E9E', letterSpacing: 1.5, marginBottom: 12 },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colon: { fontSize: 32, fontWeight: '800', color: '#C62828', marginBottom: 16 },
  timeBox: { alignItems: 'center' },
  timeValue: { fontSize: 48, fontWeight: '900', color: '#202124', lineHeight: 52 },
  timeUnit: { fontSize: 10, fontWeight: '700', color: '#9E9E9E', letterSpacing: 1 },

  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 16,
    elevation: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#202124', marginBottom: 10 },
  cardBody: { fontSize: 14, color: '#555', lineHeight: 22 },

  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  bullet: { color: '#9E9E9E', marginRight: 8, fontSize: 16, lineHeight: 20 },
  ruleText: { fontSize: 13, color: '#555', flex: 1, lineHeight: 20 },

  appealToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { fontSize: 14, color: '#9E9E9E' },
  appealHint: { fontSize: 13, color: '#757575', marginBottom: 10, lineHeight: 20 },
  appealInput: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#202124',
    minHeight: 100, textAlignVertical: 'top', backgroundColor: '#FAFAFA',
  },
  charCount: { fontSize: 11, color: '#BDBDBD', textAlign: 'right', marginTop: 4 },
  appealBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FF8F00', borderRadius: 10,
    padding: 14, marginTop: 12,
  },
  btnDisabled: { opacity: 0.5 },
  appealBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  successCard: { alignItems: 'center', gap: 8 },
  successEmoji: { fontSize: 36 },
  successText: { fontSize: 16, fontWeight: '700', color: '#43A047' },
  successSub: { fontSize: 13, color: '#757575', textAlign: 'center' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    margin: 16, padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E53935',
  },
  logoutText: { color: '#E53935', fontWeight: '700', fontSize: 15 },
});