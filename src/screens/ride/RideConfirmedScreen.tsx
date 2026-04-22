import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, View } from 'react-native';
import { Avatar, Button, Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { useRideStore } from '@/store/rideStore';
import rideService from '@/services/firebase/rideService';
import { buildRideRoutePreview } from '@/services/ride/routePreviewService';
import type { RideRoutePreview } from '@/types/ride.types';

export default function RideConfirmedScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { setCurrentRide, setStatus, destination, pickupPoint } = useRideStore();
  const { rider, fare, splitFare, routePreview: incomingRoutePreview } = route.params ?? {};
  const [rideId, setRideId] = useState<string | null>(null);
  const [routePreview, setRoutePreview] = useState<RideRoutePreview | null>(incomingRoutePreview ?? null);
  const [creatingRide, setCreatingRide] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const resolvedDestination = destination ?? rider?.destination ?? null;
  const resolvedPickupPoint = pickupPoint ?? rider?.pickupPoint ?? 'main_gate';
  const totalFare = routePreview?.soloFare ?? fare ?? 0;
  const totalSplitFare = routePreview?.splitFare ?? splitFare ?? Math.ceil(totalFare / 2);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 7,
    }).start();

    const bootstrapRide = async () => {
      if (!user || !rider || creatingRide || rideId) return;
      setCreatingRide(true);

      const computedRoutePreview = incomingRoutePreview ?? await buildRideRoutePreview({
        pickup: resolvedPickupPoint,
        destination: resolvedDestination,
        fallbackFare: fare,
      });

      if (computedRoutePreview) {
        setRoutePreview(computedRoutePreview);
      }

      const id = await rideService.createRide(
        user.uid,
        user.name,
        rider.userId,
        rider.name,
        resolvedDestination ?? rider.destination,
        resolvedPickupPoint,
        computedRoutePreview?.soloFare ?? fare ?? 0,
        computedRoutePreview ?? undefined,
      );

      setRideId(id);
      setCurrentRide({
        rideId: id,
        rider1: user.uid,
        rider2: rider.userId,
        routePreview: computedRoutePreview ?? null,
      });
      setStatus('matched');
      setCreatingRide(false);
    };

    bootstrapRide().catch((error) => {
      console.error('Ride bootstrap error:', error);
      setCreatingRide(false);
      Alert.alert('Ride Error', 'Unable to create the ride. Please try again.');
      navigation.goBack();
    });
  }, [
    creatingRide,
    destination,
    fare,
    incomingRoutePreview,
    navigation,
    pickupPoint,
    resolvedDestination,
    resolvedPickupPoint,
    rider,
    rideId,
    scaleAnim,
    setCurrentRide,
    setStatus,
    user,
  ]);

  const handleStartRide = async () => {
    if (!rideId) return;
    await rideService.startRide(rideId);
    setStatus('active');
    navigation.navigate('RideActive', {
      rideId,
      rider,
      fare: totalFare,
      splitFare: totalSplitFare,
      routePreview,
    });
  };

  const handleCancel = () => {
    Alert.alert('Cancel Ride', 'Cancelling may affect your reliability score.', [
      { text: 'Keep Ride', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          if (rideId && user?.uid) {
            await rideService.cancelRide(rideId, user.uid);
          }
          setStatus('idle');
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainApp', params: { screen: 'Home' } }],
          });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.checkIcon}>OK</Text>
      </Animated.View>

      <Text style={styles.title}>Ride Confirmed</Text>
      <Text style={styles.subtitle}>Both riders are ready to go.</Text>

      <View style={styles.ridersRow}>
        <View style={styles.riderBox}>
          <Avatar.Text size={52} label={(user?.name ?? 'A').charAt(0).toUpperCase()} style={styles.youAvatar} labelStyle={styles.avatarLabel} />
          <Text style={styles.riderName}>{user?.name ?? 'You'}</Text>
        </View>
        <Text style={styles.plusText}>+</Text>
        <View style={styles.riderBox}>
          <Avatar.Text size={52} label={(rider?.name ?? 'B').charAt(0).toUpperCase()} style={styles.partnerAvatar} labelStyle={styles.avatarLabel} />
          <Text style={styles.riderName}>{rider?.name ?? 'Rider'}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoRow}>Destination: {resolvedDestination ?? 'Unknown'}</Text>
        <Text style={styles.infoRow}>Pickup: {resolvedPickupPoint}</Text>
        <Text style={styles.infoRow}>Total Fare: BDT {totalFare}</Text>
        <Text style={styles.infoRow}>Your Share: BDT {totalSplitFare}</Text>
        <Text style={styles.infoRow}>Route ETA: {routePreview?.durationText ?? 'Calculating...'}</Text>
        <Text style={styles.infoRow}>
          Distance: {routePreview?.distanceMeters ? `${(routePreview.distanceMeters / 1000).toFixed(1)} km` : 'Calculating...'}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <Button mode="contained" onPress={handleStartRide} style={styles.button}>
          Start Ride
        </Button>
        <Button mode="outlined" onPress={handleCancel} style={styles.button}>
          Cancel
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  checkCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  checkIcon: { fontSize: 28, fontWeight: '800', color: '#2E7D32' },
  title: { fontSize: 28, fontWeight: '800', color: '#202124', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 30 },
  ridersRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 24 },
  riderBox: { alignItems: 'center', gap: 8 },
  riderName: { fontSize: 14, fontWeight: '600', color: '#202124' },
  plusText: { fontSize: 28, fontWeight: '800', color: '#DADCE0' },
  youAvatar: { backgroundColor: '#1A73E8' },
  partnerAvatar: { backgroundColor: '#34A853' },
  avatarLabel: { color: '#fff', fontWeight: '700' },
  infoCard: { backgroundColor: '#F8F9FA', borderRadius: 16, padding: 16, width: '100%', gap: 8, marginBottom: 24 },
  infoRow: { fontSize: 15, color: '#202124', fontWeight: '500' },
  buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  button: { flex: 1 },
});
