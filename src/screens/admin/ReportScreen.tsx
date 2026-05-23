/**
 * ReportScreen — User submits a report against another user.
 * Saves to Firestore `reports/{auto-id}`, triggers Cloud Function for admin review.
 */

import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { db } from '@/config/firebase.config';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/errorHandler';
import { trackEvent } from '@/services/analytics/analyticsService';
import { useScreenTracking } from '@/hooks/useScreenTracking';

const C = {
  bg: '#FAF8FF',
  card: '#FFFFFF',
  border: '#EDE8F5',
  primary: '#6366F1',
  red: '#EF4444',
  redSoft: 'rgba(239,68,68,0.08)',
  text: '#1A1A2E',
  textSub: '#6B7280',
  textMuted: '#9896A8',
  white: '#FFFFFF',
};

const REASONS = [
  { id: 'no_show', label: 'Did not show up', icon: 'account-cancel' },
  { id: 'rude_behavior', label: 'Rude or aggressive behavior', icon: 'alert-octagon' },
  { id: 'unsafe_driving', label: 'Unsafe driving / wrong route', icon: 'car-emergency' },
  { id: 'overcharge', label: 'Asked for extra money', icon: 'cash-remove' },
  { id: 'fake_profile', label: 'Fake profile or identity', icon: 'account-question' },
  { id: 'harassment', label: 'Harassment / inappropriate', icon: 'shield-alert' },
  { id: 'other', label: 'Other concern', icon: 'message-alert' },
] as const;

type ReasonId = (typeof REASONS)[number]['id'];

export default function ReportScreen() {
  useScreenTracking('Report');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const { reportedUserId, rideId } = (route.params ?? {}) as {
    reportedUserId?: string;
    rideId?: string;
  };

  const [selectedReason, setSelectedReason] = useState<ReasonId | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = selectedReason !== null && description.trim().length >= 10 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    if (!reportedUserId) {
      Alert.alert('Error', 'No user to report. Please go back and try again.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        reporterName: user.name,
        reportedUserId,
        rideId: rideId ?? null,
        reasonId: selectedReason,
        reasonLabel: REASONS.find((r) => r.id === selectedReason)?.label ?? 'Other',
        description: description.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      trackEvent('report_submitted', { reason: selectedReason });

      Alert.alert(
        'Report Submitted',
        'Thank you for keeping the community safe. Our team will review this within 24 hours.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: unknown) {
      logger.error('ReportScreen.submit', err);
      Alert.alert('Submission Failed', getErrorMessage(err) || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header notice */}
          <View style={s.notice}>
            <MaterialCommunityIcons name="shield-check" size={20} color={C.primary} />
            <Text style={s.noticeText}>
              All reports are confidential. Submitting false reports may result in penalties on
              your own account.
            </Text>
          </View>

          {/* Reason selector */}
          <Text style={s.sectionLabel}>What happened?</Text>
          <View style={s.card}>
            {REASONS.map((r, idx) => {
              const selected = selectedReason === r.id;
              return (
                <React.Fragment key={r.id}>
                  <TouchableOpacity
                    style={[s.reasonRow, selected && s.reasonRowSelected]}
                    onPress={() => setSelectedReason(r.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.reasonIcon, selected && { backgroundColor: C.primary }]}>
                      <MaterialCommunityIcons
                        name={r.icon}
                        size={18}
                        color={selected ? C.white : C.primary}
                      />
                    </View>
                    <Text style={[s.reasonLabel, selected && s.reasonLabelSelected]}>
                      {r.label}
                    </Text>
                    {selected && (
                      <MaterialCommunityIcons name="check-circle" size={20} color={C.primary} />
                    )}
                  </TouchableOpacity>
                  {idx < REASONS.length - 1 && <View style={s.divider} />}
                </React.Fragment>
              );
            })}
          </View>

          {/* Description */}
          <Text style={s.sectionLabel}>Details</Text>
          <View style={s.card}>
            <TextInput
              style={s.textArea}
              placeholder="Please describe what happened in detail (minimum 10 characters). Include time, location, and any other riders involved."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={6}
              value={description}
              onChangeText={setDescription}
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text style={s.charCount}>{description.length}/1000</Text>
          </View>

          {/* Context info */}
          {(reportedUserId || rideId) && (
            <View style={s.contextCard}>
              <Text style={s.contextTitle}>Report context</Text>
              {reportedUserId && (
                <Text style={s.contextItem}>User ID: {reportedUserId.slice(0, 8)}...</Text>
              )}
              {rideId && <Text style={s.contextItem}>Ride ID: {rideId.slice(0, 8)}...</Text>}
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="send" size={18} color={C.white} />
            <Text style={s.submitText}>{submitting ? 'Submitting...' : 'Submit Report'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 32 },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.18)',
    marginBottom: 16,
  },
  noticeText: { flex: 1, fontSize: 12, color: C.textSub, lineHeight: 18 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSub,
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
    overflow: 'hidden',
  },

  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  reasonRowSelected: { backgroundColor: 'rgba(99,102,241,0.05)' },
  reasonIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonLabel: { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },
  reasonLabelSelected: { color: C.primary, fontWeight: '700' },
  divider: { height: 1, backgroundColor: C.border, marginLeft: 60 },

  textArea: {
    minHeight: 130,
    padding: 14,
    fontSize: 14,
    color: C.text,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'right',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },

  contextCard: {
    backgroundColor: C.redSoft,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.18)',
  },
  contextTitle: { fontSize: 11, fontWeight: '800', color: C.red, marginBottom: 4, letterSpacing: 0.4 },
  contextItem: { fontSize: 12, color: C.textSub, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.red,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
    elevation: 3,
    shadowColor: C.red,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  submitBtnDisabled: { backgroundColor: '#CBD5E1', shadowOpacity: 0, elevation: 0 },
  submitText: { color: C.white, fontSize: 15, fontWeight: '800' },
});
