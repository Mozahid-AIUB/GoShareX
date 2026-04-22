import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useRideStore } from '@/store/rideStore';
import rideService from '@/services/firebase/rideService';
import type { RideRoutePreview } from '@/types/ride.types';

export default function RideCompleteScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { clearRide } = useRideStore();
  const { rideId, rider, splitFare, routePreview } = route.params ?? {};
  const [selectedRating, setSelectedRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [currentRoutePreview, setCurrentRoutePreview] = useState<RideRoutePreview | null>(routePreview ?? null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 6,
    }).start();
  }, [scaleAnim]);

  useEffect(() => {
    if (!rideId || routePreview) {
      return;
    }

    let mounted = true;
    rideService.getRide(rideId).then((ride) => {
      if (mounted && ride?.routePreview) {
        setCurrentRoutePreview(ride.routePreview);
      }
    }).catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [rideId, routePreview]);

  const handleSubmit = async () => {
    if (selectedRating === 0) return;

    await rideService.submitRating(rideId, rider?.userId ?? rider?.uid ?? '', selectedRating);
    setSubmitted(true);
    clearRide();

    setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      });
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.title}>Ride Complete</Text>
        <Text style={styles.subtitle}>
          You saved BDT {currentRoutePreview?.splitFare ?? splitFare ?? 0} on this shared trip.
        </Text>
        <Text style={styles.routeSummary}>
          {currentRoutePreview?.distanceMeters
            ? `${(currentRoutePreview.distanceMeters / 1000).toFixed(1)} km • ${currentRoutePreview.durationText}`
            : 'Route summary synced from fare preview when available'}
        </Text>
      </Animated.View>

      {!submitted ? (
        <>
          <Text style={styles.ratingTitle}>Rate your ride partner</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
                <Text style={[styles.star, selectedRating >= star && styles.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, selectedRating === 0 && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={selectedRating === 0}
          >
            <Text style={styles.submitBtnText}>Submit Rating</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.successBox}>
          <Text style={styles.successText}>Thanks for rating your ride.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 28 },
  header: { alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 32, fontWeight: '800', color: '#202124' },
  subtitle: { fontSize: 14, color: '#4CAF50', marginTop: 8, textAlign: 'center' },
  routeSummary: { fontSize: 13, color: '#5F6368', marginTop: 6, textAlign: 'center' },
  ratingTitle: { fontSize: 17, fontWeight: '700', color: '#202124', marginBottom: 16 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  star: { fontSize: 44, color: '#E0E0E0' },
  starActive: { color: '#FBBC04' },
  submitBtn: { backgroundColor: '#1A73E8', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 14, width: '100%', alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#DADCE0' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successBox: { backgroundColor: '#E8F5E9', padding: 16, borderRadius: 14 },
  successText: { color: '#2E7D32', fontSize: 16, fontWeight: '600' },
});
