import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Alert } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { useRideStore } from '@/store/rideStore';
import rideService from '@/services/firebase/rideService';

export default function RideConfirmedScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { setCurrentRide, setStatus } = useRideStore();

  const { rider, fare, splitFare } = route.params ?? {};
  const [rideId, setRideId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(600); // 10 min
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const timerWidth = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }).start();

    // Create ride in Firebase
    const createRide = async () => {
      if (!user || !rider) return;
      const id = await rideService.createRide(
        user.uid, user.name ?? 'You',
        rider.userId, rider.name,
        rider.destination, 'Main Gate', fare
      );
      setRideId(id);
      setCurrentRide({ id, rider1: user.uid, rider2: rider.userId });
      setStatus('matched');
    };
    createRide();

    // 10 min countdown
    Animated.timing(timerWidth, { toValue: 0, duration: 600000, useNativeDriver: false }).start();
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          Alert.alert('Time Up!', 'Ride time expired। New match করো।');
          navigation.navigate('Home');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStartRide = async () => {
    if (!rideId) return;
    await rideService.startRide(rideId);
    setStatus('active');
    navigation.navigate('RideActive', { rideId, rider, fare, splitFare });
  };

  const handleCancel = () => {
    Alert.alert('Cancel করবে?', 'Cancel করলে penalty হতে পারে।', [
      { text: 'না', style: 'cancel' },
      { text: 'হ্যাঁ Cancel', style: 'destructive', onPress: async () => {
        if (rideId) await rideService.cancelRide(rideId, user!.uid);
        setStatus('idle');
        navigation.navigate('Home');
      }},
    ]);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.checkIcon}>✅</Text>
      </Animated.View>

      <Text style={styles.title}>Deal Confirmed!</Text>
      <Text style={styles.subtitle}>দুজনেই agree করেছো 🎉</Text>

      {/* Both riders */}
      <View style={styles.ridersRow}>
        <View style={styles.riderBox}>
          <Avatar.Text size={52} label={(user?.name ?? 'A').charAt(0)} style={{ backgroundColor: '#1A73E8' }} labelStyle={{ color: '#fff', fontWeight: '700' }} />
          <Text style={styles.riderBoxName}>{user?.name ?? 'You'}</Text>
        </View>
        <Text style={styles.plusText}>+</Text>
        <View style={styles.riderBox}>
          <Avatar.Text size={52} label={(rider?.name ?? 'B').charAt(0)} style={{ backgroundColor: '#34A853' }} labelStyle={{ color: '#fff', fontWeight: '700' }} />
          <Text style={styles.riderBoxName}>{rider?.name ?? 'Rider'}</Text>
        </View>
      </View>

      {/* Route + fare */}
      <View style={styles.infoCard}>
        <Text style={styles.infoRow}>🛺 AIUB → {rider?.destination}</Text>
        <Text style={styles.infoRow}>💰 Total: ৳{fare} · তোমার: ৳{splitFare}</Text>
      </View>

      {/* Timer bar */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>⏰ {mins}:{secs.toString().padStart(2, '0')} বাকি</Text>
        <View style={styles.timerTrack}>
          <Animated.View style={[styles.timerFill, { flex: timerWidth }]} />
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.btnRow}>
        <View style={{ flex: 1 }}>
          <Text onPress={handleStartRide} style={styles.startBtn}>🛺 Ride শুরু করো</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text onPress={handleCancel} style={styles.cancelBtn}>Cancel</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  checkCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  checkIcon: { fontSize: 48 },
  title: { fontSize: 28, fontWeight: '800', color: '#202124', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 30 },
  ridersRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 24 },
  riderBox: { alignItems: 'center', gap: 8 },
  riderBoxName: { fontSize: 14, fontWeight: '600', color: '#202124' },
  plusText: { fontSize: 28, fontWeight: '800', color: '#DADCE0' },
  infoCard: { backgroundColor: '#F8F9FA', borderRadius: 16, padding: 16, width: '100%', gap: 8, marginBottom: 24 },
  infoRow: { fontSize: 15, color: '#202124', fontWeight: '500' },
  timerContainer: { width: '100%', marginBottom: 32 },
  timerText: { fontSize: 14, color: '#666', marginBottom: 8, textAlign: 'center' },
  timerTrack: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, flexDirection: 'row' },
  timerFill: { backgroundColor: '#34A853', borderRadius: 4 },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  startBtn: { backgroundColor: '#34A853', color: '#fff', padding: 16, borderRadius: 14, textAlign: 'center', fontSize: 16, fontWeight: '700', overflow: 'hidden' },
  cancelBtn: { backgroundColor: '#F5F5F5', color: '#555', padding: 16, borderRadius: 14, textAlign: 'center', fontSize: 16, fontWeight: '600', overflow: 'hidden' },
});
