import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { useRideStore } from '@/store/rideStore';
import rideService from '@/services/firebase/rideService';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/config/firebase.config';

export default function RideCompleteScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { clearRide } = useRideStore();
  const { rideId, rider, fare, splitFare } = route.params ?? {};

  const [selectedRating, setSelectedRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [totalSaved, setTotalSaved] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }).start();
    // Fetch total saved
    const fetchSaved = async () => {
      if (!user?.uid) return;
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) setTotalSaved(snap.data().totalSaved ?? 0);
    };
    fetchSaved();
  }, []);

  const handleSubmit = async () => {
    if (selectedRating === 0 || !user?.uid) return;
    await rideService.submitRating(rideId, user.uid, selectedRating);

    // Update user stats
    await updateDoc(doc(db, 'users', user.uid), {
      totalRides: increment(1),
      totalSaved: increment(splitFare),
    });

    setSubmitted(true);
    clearRide();
    setTimeout(() => navigation.navigate('Home'), 1800);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.celebBox, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.celebEmoji}>🎉</Text>
        <Text style={styles.celebTitle}>Ride শেষ!</Text>
      </Animated.View>

      <View style={styles.savingCard}>
        <Text style={styles.savingLabel}>এই রাইডে বাঁচালে</Text>
        <Text style={styles.savingAmount}>৳{splitFare}</Text>
        <Text style={styles.totalSaving}>মোট savings: ৳{totalSaved + splitFare} 🏆</Text>
      </View>

      {!submitted ? (
        <>
          <Text style={styles.ratingTitle}>{rider?.name}-কে rate করো</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} onPress={() => setSelectedRating(s)}>
                <Text style={[styles.star, selectedRating >= s && styles.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.submitBtn, selectedRating === 0 && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={selectedRating === 0}
          >
            <Text style={styles.submitBtnText}>Submit ও Home এ যাও</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.thankBox}>
          <Text style={styles.thankText}>✅ Rating দেওয়া হয়েছে! ধন্যবাদ।</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 28 },
  celebBox: { alignItems: 'center', marginBottom: 28 },
  celebEmoji: { fontSize: 72, marginBottom: 8 },
  celebTitle: { fontSize: 32, fontWeight: '800', color: '#202124' },
  savingCard: { backgroundColor: '#E8F5E9', borderRadius: 20, padding: 24, alignItems: 'center', width: '100%', marginBottom: 32 },
  savingLabel: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
  savingAmount: { fontSize: 48, fontWeight: '900', color: '#2E7D32', marginVertical: 4 },
  totalSaving: { fontSize: 13, color: '#4CAF50' },
  ratingTitle: { fontSize: 17, fontWeight: '700', color: '#202124', marginBottom: 16 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  star: { fontSize: 44, color: '#E0E0E0' },
  starActive: { color: '#FBBC04' },
  submitBtn: { backgroundColor: '#1A73E8', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 14, width: '100%', alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#DADCE0' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  thankBox: { backgroundColor: '#E8F5E9', padding: 16, borderRadius: 14 },
  thankText: { color: '#2E7D32', fontSize: 16, fontWeight: '600' },
});
