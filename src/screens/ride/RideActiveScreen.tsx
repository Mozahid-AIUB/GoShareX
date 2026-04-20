import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { useRideStore } from '@/store/rideStore';
import rideService from '@/services/firebase/rideService';

export default function RideActiveScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { setStatus } = useRideStore();
  const { rideId, rider, fare, splitFare } = route.params ?? {};
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleComplete = () => {
    Alert.alert('Ride শেষ?', 'Destination পৌঁছে গেছো?', [
      { text: 'না', style: 'cancel' },
      { text: 'হ্যাঁ শেষ!', onPress: async () => {
        await rideService.completeRide(rideId, user!.uid);
        setStatus('completed');
        navigation.navigate('RideComplete', { rideId, rider, fare, splitFare });
      }},
    ]);
  };

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Text style={styles.statusIcon}>🛺</Text>
        <Text style={styles.statusTitle}>রিকশায় আছো!</Text>
        <Text style={styles.elapsed}>{mins}:{secs.toString().padStart(2, '0')} চলছে</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Ride Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>🏁 Destination</Text>
          <Text style={styles.infoValue}>{rider?.destination}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>👤 Partner</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Avatar.Text size={24} label={(rider?.name ?? 'R').charAt(0)} style={{ backgroundColor: '#34A853' }} labelStyle={{ color: '#fff', fontSize: 10 }} />
            <Text style={styles.infoValue}>{rider?.name}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>💰 তোমার ভাড়া</Text>
          <Text style={[styles.infoValue, { color: '#34A853', fontWeight: '800' }]}>৳{splitFare}</Text>
        </View>
      </View>

      <View style={styles.reminderBox}>
        <Text style={styles.reminderText}>💡 Cash দিতে ভুলো না — ৳{splitFare} করে দুজন।</Text>
      </View>

      <Text onPress={handleComplete} style={styles.completeBtn}>🏁 Ride শেষ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  topSection: { alignItems: 'center', marginTop: 40, marginBottom: 32 },
  statusIcon: { fontSize: 64, marginBottom: 12 },
  statusTitle: { fontSize: 26, fontWeight: '800', color: '#202124' },
  elapsed: { fontSize: 16, color: '#666', marginTop: 6 },
  infoCard: { backgroundColor: '#F8F9FA', borderRadius: 16, padding: 18, gap: 14, marginBottom: 20 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#9E9E9E', marginBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#202124' },
  reminderBox: { backgroundColor: '#FFF8E1', borderRadius: 12, padding: 12, marginBottom: 32 },
  reminderText: { fontSize: 13, color: '#F57F17', textAlign: 'center' },
  completeBtn: { backgroundColor: '#1A73E8', color: '#fff', padding: 18, borderRadius: 16, textAlign: 'center', fontSize: 18, fontWeight: '800', overflow: 'hidden' },
});
