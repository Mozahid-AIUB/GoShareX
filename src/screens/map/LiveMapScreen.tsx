import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Text, Avatar, Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/store/authStore';
import { useLocationStore } from '@/store/locationStore';
import { useRideStore } from '@/store/rideStore';
import locationService from '@/services/firebase/locationService';
import matchingService, { RiderMatch } from '@/services/firebase/matchingService';

// ─── Blinking LIVE badge ───────────────────────────────────────────────────
const LiveBadge = () => {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.liveBadge, { opacity }]}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>LIVE</Text>
    </Animated.View>
  );
};

// ─── Rider card ────────────────────────────────────────────────────────────
const RiderCard = ({ rider, onChat, onPress }: { rider: RiderMatch; onChat: (r: RiderMatch) => void; onPress: (r: RiderMatch) => void }) => {
  const pinColor = rider.isMatch ? '#34A853' : '#EA4335';
  return (
    <TouchableOpacity onPress={() => onPress(rider)} activeOpacity={0.85}>
      <Surface style={styles.riderCard} elevation={2}>
        <View style={[styles.colorBar, { backgroundColor: pinColor }]} />
        <Avatar.Text size={44} label={rider.name.charAt(0).toUpperCase()} style={{ backgroundColor: pinColor }} labelStyle={{ color: '#fff', fontSize: 18, fontWeight: '700' }} />
        <View style={styles.riderInfo}>
          <Text style={styles.riderName}>{rider.name}</Text>
          <Text style={styles.riderDestination}>📍 {rider.destination}</Text>
          <View style={styles.riderMeta}>
            <Text style={styles.metaText}>📏 {rider.distance}m</Text>
            <Text style={styles.metaText}>⭐ {rider.rating.toFixed(1)}</Text>
            {rider.isMatch && <View style={styles.matchBadge}><Text style={styles.matchBadgeText}>MATCH!</Text></View>}
          </View>
        </View>
        <TouchableOpacity style={[styles.chatBtn, { backgroundColor: rider.isMatch ? '#1A73E8' : '#9E9E9E' }]} onPress={() => onChat(rider)}>
          <Text style={styles.chatBtnText}>💬 Chat</Text>
        </TouchableOpacity>
      </Surface>
    </TouchableOpacity>
  );
};

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function LiveMapScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { latitude, longitude, setLocation, setTracking } = useLocationStore();
  const { destination, pickupPoint } = useRideStore();
  const [nearbyRiders, setNearbyRiders] = useState<RiderMatch[]>([]);
  const [selectedRider, setSelectedRider] = useState<RiderMatch | null>(null);
  const mapRef = useRef<MapView>(null);

  const userLat = latitude ?? 23.8103;
  const userLng = longitude ?? 90.4125;
  const matchCount = nearbyRiders.filter((r) => r.isMatch).length;

  useEffect(() => {
    if (!user?.uid || !destination) return;
    let stopWatching: (() => void) | null = null;

    const start = async () => {
      await locationService.startWatching(user.uid, destination, pickupPoint ?? 'Main Gate', (loc) => {
        setLocation(loc.latitude, loc.longitude, loc.accuracy);
      });
      setTracking(true);
      stopWatching = locationService.watchNearbyRiders((allRiders) => {
        const filtered = allRiders.filter((r) => r.id !== user.uid);
        const matches = matchingService.findNearbyRiders(userLat, userLng, destination, filtered);
        setNearbyRiders(matches);
      });
    };

    start();
    return () => {
      locationService.stopWatching();
      setTracking(false);
      stopWatching?.();
    };
  }, [user?.uid, destination]);

  const centerMap = useCallback(() => {
    mapRef.current?.animateToRegion({ latitude: userLat, longitude: userLng, latitudeDelta: 0.002, longitudeDelta: 0.002 }, 600);
  }, [userLat, userLng]);

  const getPinColor = (rider: RiderMatch) => rider.isMatch ? '#34A853' : '#EA4335';

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{ latitude: userLat, longitude: userLng, latitudeDelta: 0.003, longitudeDelta: 0.003 }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        <Circle center={{ latitude: userLat, longitude: userLng }} radius={30} strokeColor="#1A73E8" strokeWidth={2} fillColor="rgba(26,115,232,0.08)" lineDashPattern={[6, 4]} />
        {nearbyRiders.map((rider) => (
          <Marker key={rider.userId} coordinate={{ latitude: rider.lat, longitude: rider.lng }} onPress={() => setSelectedRider(rider)} pinColor={getPinColor(rider)} title={rider.name} description={`${rider.destination} · ${rider.distance}m · ⭐${rider.rating.toFixed(1)}`} />
        ))}
      </MapView>

      {/* Top bar */}
      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <LiveBadge />
        <View style={styles.destChip}>
          <Text style={styles.destChipText}>{destination ?? 'কোথায় যাবে?'} · {matchCount > 0 ? `${matchCount} match 🟢` : 'কেউ নেই'}</Text>
        </View>
        <TouchableOpacity style={styles.centerBtn} onPress={centerMap}>
          <Text style={{ fontSize: 18 }}>🎯</Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={[styles.legend, { top: insets.top + 64 }]}>
        {[{ color: '#34A853', label: 'Match' }, { color: '#EA4335', label: 'অন্য' }, { color: '#9E9E9E', label: 'Ride-এ' }].map((l) => (
          <View key={l.color} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
      </View>

      {/* Selected rider preview */}
      {selectedRider && (
        <View style={[styles.selectedCard, { bottom: nearbyRiders.length > 0 ? 250 : 20 }]}>
          <View style={styles.selectedCardInner}>
            <Avatar.Text size={40} label={selectedRider.name.charAt(0)} style={{ backgroundColor: getPinColor(selectedRider) }} labelStyle={{ color: '#fff', fontWeight: '700' }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.selectedName}>{selectedRider.name}</Text>
              <Text style={styles.selectedMeta}>{selectedRider.destination} · {selectedRider.distance}m · ⭐{selectedRider.rating.toFixed(1)}</Text>
            </View>
            <TouchableOpacity style={styles.chatBtnSmall} onPress={() => navigation.navigate('Chat', { rider: selectedRider })}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>💬 Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedRider(null)} style={{ padding: 4 }}>
              <Text style={{ color: '#666', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Rider list */}
      {nearbyRiders.length > 0 ? (
        <View style={[styles.listPanel, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>কাছের Rider ({nearbyRiders.length} জন)</Text>
            <Text style={styles.listSubText}>ট্যাপ করো বা Chat করো</Text>
          </View>
          <FlatList
            data={nearbyRiders}
            keyExtractor={(r) => r.userId}
            renderItem={({ item }) => <RiderCard rider={item} onChat={(r) => navigation.navigate('Chat', { rider: r })} onPress={(r) => { setSelectedRider(r); mapRef.current?.animateToRegion({ latitude: r.lat, longitude: r.lng, latitudeDelta: 0.001, longitudeDelta: 0.001 }, 400); }} />}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
          />
        </View>
      ) : (
        <View style={[styles.emptyState, { bottom: insets.bottom + 20 }]}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>🔍</Text>
          <Text style={styles.emptyTitle}>কাছে কেউ নেই এখন</Text>
          <Text style={styles.emptySubtitle}>অন্য students এলে automatically দেখাবে</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EA4335', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  destChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, elevation: 3 },
  destChipText: { fontSize: 13, fontWeight: '600', color: '#202124' },
  centerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', elevation: 3, alignItems: 'center', justifyContent: 'center' },
  legend: { position: 'absolute', right: 12, backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: 10, padding: 8, gap: 4, elevation: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, color: '#555', fontWeight: '500' },
  selectedCard: { position: 'absolute', left: 12, right: 12 },
  selectedCardInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 12, elevation: 6, gap: 6 },
  selectedName: { fontSize: 15, fontWeight: '700', color: '#202124' },
  selectedMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  chatBtnSmall: { backgroundColor: '#1A73E8', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  listPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.97)', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 14, elevation: 10, maxHeight: 230 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  listHeaderText: { fontSize: 15, fontWeight: '700', color: '#202124' },
  listSubText: { fontSize: 12, color: '#9E9E9E' },
  riderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 10, width: 220, overflow: 'hidden', gap: 8 },
  colorBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  riderInfo: { flex: 1 },
  riderName: { fontSize: 14, fontWeight: '700', color: '#202124' },
  riderDestination: { fontSize: 11, color: '#555', marginTop: 1 },
  riderMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  metaText: { fontSize: 10, color: '#888' },
  matchBadge: { backgroundColor: '#34A853', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  matchBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
  chatBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, alignItems: 'center' },
  chatBtnText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  emptyState: { position: 'absolute', left: 0, right: 0, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', marginHorizontal: 20, borderRadius: 16, padding: 20, elevation: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#202124' },
  emptySubtitle: { fontSize: 13, color: '#666', marginTop: 4, textAlign: 'center' },
});
