// ============================================================
// IncomingRequestOverlay — যেকোনো screen-এর উপরে floating request banner।
//
// AppNavigator-এ একবার বসানো; useRequestStore থেকে incoming request পড়ে,
// সবচেয়ে নতুনটা উপরে দেখায় (Accept/Decline)। accept → chat-এ navigate।
// ============================================================
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRequestStore } from '@/store/requestStore';
import { useAuthStore } from '@/store/authStore';
import { rideRequestService } from '@/services/supabase/rideRequestService';
import VehicleIcon from '@/components/common/VehicleIcon';
import { logger } from '@/utils/logger';

export default function IncomingRequestOverlay() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const incoming = useRequestStore((s) => s.incoming);
  const { user } = useAuthStore();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // সবচেয়ে নতুন pending request (একটাই দেখাই — overlay পরিষ্কার থাকে)
  const req = incoming[0];

  const onAccept = useCallback(async () => {
    if (!req || !user?.uid) return;
    setAcceptingId(req.id);
    try {
      const chatId = await rideRequestService.acceptRequest(req, user.name ?? 'Rider');
      navigation.navigate('Chat', { chatId, partnerName: req.fromName });
    } catch (e: any) {
      logger.warn('IncomingRequestOverlay.accept', e?.message ?? e);
    } finally {
      setAcceptingId(null);
    }
  }, [req, user?.uid, user?.name, navigation]);

  const onDecline = useCallback(() => {
    if (!req) return;
    void rideRequestService.declineRequest(req.id);
  }, [req]);

  if (!req) return null;

  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.avatar}>
          <VehicleIcon
            type={req.fromVehicle === 'bike' ? 'motorcycle' : req.fromVehicle === 'cng' ? 'cng' : 'rickshaw'}
            tone={req.fromVehicle === 'bike' ? 'indigo' : req.fromVehicle === 'cng' ? 'teal' : 'amber'}
            size={24}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {req.fromName} wants to ride{req.fromRating != null ? `  ⭐${req.fromRating.toFixed(1)}` : ''}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            🎯 {req.destination}{req.fare > 0 ? ` · ৳${req.fare} each` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.declineBtn} onPress={onDecline} activeOpacity={0.8}>
          <MaterialCommunityIcons name="close" size={18} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} disabled={acceptingId === req.id} activeOpacity={0.85}>
          <Text style={styles.acceptText}>{acceptingId === req.id ? '…' : 'Accept'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 9999, elevation: 9999 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    ...Platform.select({ android: { elevation: 12 } }),
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
  },
  title: { fontSize: 13.5, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.2 },
  sub: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 1 },
  declineBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.14)',
  },
  acceptBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 11, backgroundColor: '#6366F1',
  },
  acceptText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});
