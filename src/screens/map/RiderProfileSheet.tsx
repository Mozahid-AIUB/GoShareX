import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { Text, Avatar, Divider } from 'react-native-paper';
import { RiderMatch } from '@/services/firebase/matchingService';

interface Props {
  rider: RiderMatch | null;
  visible: boolean;
  onClose: () => void;
  onChat: (rider: RiderMatch) => void;
  currentDestination?: string;
}

const BADGE_COLORS: Record<string, string> = {
  'Elite Rider': '#FF8C00',
  'Trusted': '#1A73E8',
  'Regular': '#34A853',
  'New Rider': '#9E9E9E',
};

export default function RiderProfileSheet({ rider, visible, onClose, onChat, currentDestination }: Props) {
  if (!rider) return null;

  const isMatch = rider.destination === currentDestination;
  const badgeColor = BADGE_COLORS[rider.badge] ?? '#9E9E9E';
  const partialId = rider.userId.length > 6 ? `S***${rider.userId.slice(-2)}` : 'S***??';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Avatar.Text
            size={64}
            label={rider.name.charAt(0).toUpperCase()}
            style={{ backgroundColor: isMatch ? '#34A853' : '#EA4335' }}
            labelStyle={{ color: '#fff', fontSize: 26, fontWeight: '700' }}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.nameText}>{rider.name}</Text>
            <Text style={styles.idText}>🎓 {partialId}</Text>
            <View style={[styles.badgeChip, { backgroundColor: badgeColor }]}>
              <Text style={styles.badgeText}>{rider.badge}</Text>
            </View>
          </View>
        </View>

        <Divider style={{ marginVertical: 14 }} />

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>⭐ {rider.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>📏 {rider.distance}m</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>📍 {rider.destination}</Text>
            <Text style={styles.statLabel}>Destination</Text>
          </View>
        </View>

        {/* Match indicator */}
        <View style={[styles.matchRow, { backgroundColor: isMatch ? '#E8F5E9' : '#FFF3E0' }]}>
          <Text style={{ fontSize: 20 }}>{isMatch ? '🟢' : '🔴'}</Text>
          <Text style={[styles.matchText, { color: isMatch ? '#2E7D32' : '#E65100' }]}>
            {isMatch
              ? `Same destination! Fare split হবে 💰`
              : `Different destination (${rider.destination})`}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.chatButton} onPress={() => { onChat(rider); onClose(); }}>
            <Text style={styles.chatButtonText}>💬 Chat করো</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>❌ Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  handle: { width: 40, height: 4, backgroundColor: '#DADCE0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerInfo: { flex: 1 },
  nameText: { fontSize: 20, fontWeight: '800', color: '#202124' },
  idText: { fontSize: 13, color: '#666', marginTop: 3 },
  badgeChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginTop: 6 },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  statBox: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 14, fontWeight: '700', color: '#202124' },
  statLabel: { fontSize: 11, color: '#9E9E9E' },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, marginBottom: 18 },
  matchText: { fontSize: 13, fontWeight: '600', flex: 1 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  chatButton: { flex: 1, backgroundColor: '#1A73E8', padding: 14, borderRadius: 14, alignItems: 'center' },
  chatButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  closeButton: { flex: 1, backgroundColor: '#F5F5F5', padding: 14, borderRadius: 14, alignItems: 'center' },
  closeButtonText: { color: '#555', fontSize: 16, fontWeight: '600' },
});
