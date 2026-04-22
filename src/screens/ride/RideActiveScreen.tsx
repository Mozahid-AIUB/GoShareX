import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Avatar, Button, Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useRideStore } from '@/store/rideStore';
import rideService from '@/services/firebase/rideService';
import type { RideRoutePreview } from '@/types/ride.types';

export default function RideActiveScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { setStatus } = useRideStore();
  const { rideId, rider, fare, splitFare, routePreview } = route.params ?? {};
  const [elapsed, setElapsed] = useState(0);
  const [currentRoutePreview, setCurrentRoutePreview] = useState<RideRoutePreview | null>(routePreview ?? null);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((current) => current + 1), 1000);
    return () => clearInterval(interval);
  }, []);

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

  const handleComplete = () => {
    Alert.alert('Complete Ride', 'Have you reached the destination?', [
      { text: 'Not Yet', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          await rideService.completeRide(rideId);
          setStatus('completed');
          navigation.navigate('RideComplete', {
            rideId,
            rider,
            fare,
            splitFare,
            routePreview: currentRoutePreview,
          });
        },
      },
    ]);
  };

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Text style={styles.statusTitle}>Ride in Progress</Text>
        <Text style={styles.elapsed}>{mins}:{secs.toString().padStart(2, '0')} elapsed</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Ride Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Destination</Text>
          <Text style={styles.infoValue}>{rider?.destination ?? 'Unknown'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Partner</Text>
          <View style={styles.partnerRow}>
            <Avatar.Text
              size={28}
              label={(rider?.name ?? 'R').charAt(0).toUpperCase()}
              style={styles.avatar}
              labelStyle={styles.avatarLabel}
            />
            <Text style={styles.infoValue}>{rider?.name ?? 'Rider'}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Your Fare</Text>
          <Text style={styles.infoValue}>BDT {currentRoutePreview?.splitFare ?? splitFare ?? 0}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ride ETA</Text>
          <Text style={styles.infoValue}>{currentRoutePreview?.durationText ?? 'Live route pending'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Route Distance</Text>
          <Text style={styles.infoValue}>
            {currentRoutePreview?.distanceMeters ? `${(currentRoutePreview.distanceMeters / 1000).toFixed(1)} km` : 'Live route pending'}
          </Text>
        </View>
      </View>

      <View style={styles.reminderBox}>
        <Text style={styles.reminderText}>Remember to settle the split fare fairly at the end of the ride.</Text>
      </View>

      <Button mode="contained" onPress={handleComplete}>
        Complete Ride
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  topSection: { alignItems: 'center', marginTop: 40, marginBottom: 32 },
  statusTitle: { fontSize: 26, fontWeight: '800', color: '#202124' },
  elapsed: { fontSize: 16, color: '#666', marginTop: 6 },
  infoCard: { backgroundColor: '#F8F9FA', borderRadius: 16, padding: 18, gap: 14, marginBottom: 20 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#9E9E9E', marginBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#202124' },
  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { backgroundColor: '#34A853' },
  avatarLabel: { color: '#fff', fontSize: 12, fontWeight: '700' },
  reminderBox: { backgroundColor: '#FFF8E1', borderRadius: 12, padding: 12, marginBottom: 32 },
  reminderText: { fontSize: 13, color: '#F57F17', textAlign: 'center' },
});
