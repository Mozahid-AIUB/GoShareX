import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Avatar, Surface, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import directionsService from '@/services/google/directionsService';
import { useAuthStore } from '@/store/authStore';
import { useLocationStore } from '@/store/locationStore';
import { useRideStore } from '@/store/rideStore';
import locationService from '@/services/firebase/locationService';
import matchingService, { RiderMatch } from '@/services/firebase/matchingService';

const LiveBadge = () => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.liveBadge, { opacity }]}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>LIVE</Text>
    </Animated.View>
  );
};

const RiderCard = ({
  rider,
  onChat,
  onPress,
}: {
  rider: RiderMatch;
  onChat: (r: RiderMatch) => void;
  onPress: (r: RiderMatch) => void;
}) => {
  const pinColor = rider.isMatch ? '#34A853' : '#EA4335';

  return (
    <TouchableOpacity onPress={() => onPress(rider)} activeOpacity={0.88}>
      <Surface style={styles.riderCard} elevation={2}>
        <View style={[styles.colorBar, { backgroundColor: pinColor }]} />
        <Avatar.Text
          size={44}
          label={rider.name.charAt(0).toUpperCase()}
          style={{ backgroundColor: pinColor }}
          labelStyle={styles.avatarLabel}
        />
        <View style={styles.riderInfo}>
          <Text style={styles.riderName}>{rider.name}</Text>
          <Text style={styles.riderDestination}>{rider.destination}</Text>
          <View style={styles.riderMeta}>
            <Text style={styles.metaText}>{rider.distance}m away</Text>
            <Text style={styles.metaText}>Rating {rider.rating.toFixed(1)}</Text>
            {rider.isMatch ? (
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>MATCH</Text>
              </View>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.chatBtn, { backgroundColor: rider.isMatch ? '#1A73E8' : '#9E9E9E' }]}
          onPress={() => onChat(rider)}
        >
          <Text style={styles.chatBtnText}>Chat</Text>
        </TouchableOpacity>
      </Surface>
    </TouchableOpacity>
  );
};

export default function LiveMapScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { latitude, longitude, setLocation, setTracking } = useLocationStore();
  const { destination, pickupPoint } = useRideStore();
  const [nearbyRiders, setNearbyRiders] = useState<RiderMatch[]>([]);
  const [selectedRider, setSelectedRider] = useState<RiderMatch | null>(null);
  const [meetupRoute, setMeetupRoute] = useState<{
    distanceText: string;
    durationText: string;
    summary: string;
  } | null>(null);
  const mapRef = useRef<MapView>(null);

  const userLat = latitude ?? 23.8103;
  const userLng = longitude ?? 90.4125;
  const matchCount = nearbyRiders.filter((rider) => rider.isMatch).length;

  useEffect(() => {
    if (!user?.uid || !destination) return;

    let stopWatching: (() => void) | null = null;

    const start = async () => {
      await locationService.startWatching(
        user.uid,
        destination,
        pickupPoint ?? 'Main Gate',
        (loc) => {
          setLocation(loc.latitude, loc.longitude, loc.accuracy);
        }
      );

      setTracking(true);
      stopWatching = locationService.watchNearbyRiders((allRiders) => {
        const filtered = allRiders.filter((rider: any) => rider.id !== user.uid);
        const matches = matchingService.findNearbyRiders(
          userLat,
          userLng,
          destination,
          filtered
        );
        setNearbyRiders(matches);
      });
    };

    start();

    return () => {
      locationService.stopWatching();
      setTracking(false);
      stopWatching?.();
    };
  }, [destination, pickupPoint, setLocation, setTracking, user?.uid, userLat, userLng]);

  useEffect(() => {
    if (!selectedRider) {
      setMeetupRoute(null);
      return;
    }

    let cancelled = false;

    const loadMeetupRoute = async () => {
      try {
        const route = await directionsService.getRoute({
          origin: { latitude: userLat, longitude: userLng },
          destination: { latitude: selectedRider.lat, longitude: selectedRider.lng },
          mode: 'walking',
        });

        if (!cancelled) {
          setMeetupRoute({
            distanceText: route.distanceText,
            durationText: route.durationText,
            summary: route.summary,
          });
        }
      } catch {
        if (!cancelled) {
          setMeetupRoute(null);
        }
      }
    };

    loadMeetupRoute();

    return () => {
      cancelled = true;
    };
  }, [selectedRider, userLat, userLng]);

  const centerMap = useCallback(() => {
    mapRef.current?.animateToRegion(
      {
        latitude: userLat,
        longitude: userLng,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      },
      600
    );
  }, [userLat, userLng]);

  const goHome = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp', params: { screen: 'Home' } }],
    });
  }, [navigation]);

  const openChat = useCallback(
    (rider: RiderMatch) => {
      navigation.navigate('Chat', { rider });
    },
    [navigation]
  );

  const getPinColor = (rider: RiderMatch) => (rider.isMatch ? '#34A853' : '#EA4335');

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: userLat,
          longitude: userLng,
          latitudeDelta: 0.003,
          longitudeDelta: 0.003,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        <Circle
          center={{ latitude: userLat, longitude: userLng }}
          radius={30}
          strokeColor="#1A73E8"
          strokeWidth={2}
          fillColor="rgba(26,115,232,0.08)"
        />
        {nearbyRiders.map((rider) => (
          <Marker
            key={rider.userId}
            coordinate={{ latitude: rider.lat, longitude: rider.lng }}
            onPress={() => setSelectedRider(rider)}
            pinColor={getPinColor(rider)}
            title={rider.name}
            description={`${rider.destination} | ${rider.distance}m | ${rider.rating.toFixed(1)}`}
          />
        ))}
      </MapView>

      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navBtnText}>Back</Text>
        </TouchableOpacity>
        <LiveBadge />
        <View style={styles.destChip}>
          <Text style={styles.destChipText}>
            {destination ?? 'Choose destination'} | {matchCount > 0 ? `${matchCount} matches` : 'No riders yet'}
          </Text>
        </View>
        <TouchableOpacity style={styles.centerBtn} onPress={centerMap}>
          <Text style={styles.centerBtnText}>Center</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={goHome}>
          <Text style={styles.navBtnText}>Home</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.legend, { top: insets.top + 72 }]}>
        {[
          { color: '#34A853', label: 'Matched rider' },
          { color: '#EA4335', label: 'Nearby rider' },
        ].map((item) => (
          <View key={item.color} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>

      {selectedRider ? (
        <View style={[styles.selectedCard, { bottom: nearbyRiders.length > 0 ? 250 : 24 }]}>
          <View style={styles.selectedCardInner}>
            <Avatar.Text
              size={40}
              label={selectedRider.name.charAt(0).toUpperCase()}
              style={{ backgroundColor: getPinColor(selectedRider) }}
              labelStyle={styles.avatarLabel}
            />
            <View style={styles.selectedCardText}>
              <Text style={styles.selectedName}>{selectedRider.name}</Text>
              <Text style={styles.selectedMeta}>
                {selectedRider.destination} | {selectedRider.distance}m | {selectedRider.rating.toFixed(1)}
              </Text>
              {meetupRoute ? (
                <Text style={styles.selectedRouteMeta}>
                  Walk {meetupRoute.distanceText} in about {meetupRoute.durationText}
                  {meetupRoute.summary ? ` via ${meetupRoute.summary}` : ''}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity style={styles.chatBtnSmall} onPress={() => openChat(selectedRider)}>
              <Text style={styles.chatBtnText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedRider(null)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {nearbyRiders.length > 0 ? (
        <View style={[styles.listPanel, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>Nearby riders ({nearbyRiders.length})</Text>
            <Text style={styles.listSubText}>Tap a rider or start chatting</Text>
          </View>
          <FlatList
            data={nearbyRiders}
            keyExtractor={(rider) => rider.userId}
            renderItem={({ item }) => (
              <RiderCard
                rider={item}
                onChat={openChat}
                onPress={(rider) => {
                  setSelectedRider(rider);
                  mapRef.current?.animateToRegion(
                    {
                      latitude: rider.lat,
                      longitude: rider.lng,
                      latitudeDelta: 0.001,
                      longitudeDelta: 0.001,
                    },
                    400
                  );
                }}
              />
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.riderListContent}
          />
        </View>
      ) : (
        <View style={[styles.emptyState, { bottom: insets.bottom + 20 }]}>
          <Text style={styles.emptyTitle}>No nearby riders right now</Text>
          <Text style={styles.emptySubtitle}>
            Keep this screen open and the list will update automatically.
          </Text>
          <TouchableOpacity style={styles.emptyHomeBtn} onPress={goHome}>
            <Text style={styles.emptyHomeBtnText}>Back To Home</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    elevation: 3,
  },
  navBtnText: { fontSize: 12, fontWeight: '800', color: '#202124' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA4335',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF' },
  liveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  destChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    elevation: 3,
  },
  destChipText: { fontSize: 13, fontWeight: '600', color: '#202124' },
  centerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtnText: { fontSize: 12, fontWeight: '800', color: '#1A73E8' },
  legend: {
    position: 'absolute',
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 10,
    padding: 8,
    gap: 4,
    elevation: 2,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, color: '#555', fontWeight: '500' },
  selectedCard: { position: 'absolute', left: 12, right: 12 },
  selectedCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    elevation: 6,
    gap: 8,
  },
  selectedCardText: { flex: 1 },
  selectedName: { fontSize: 15, fontWeight: '700', color: '#202124' },
  selectedMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  selectedRouteMeta: { fontSize: 11, color: '#1A73E8', marginTop: 4, lineHeight: 16 },
  closeBtn: { padding: 6 },
  closeBtnText: { color: '#666', fontSize: 14, fontWeight: '700' },
  listPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 14,
    elevation: 10,
    maxHeight: 230,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  listHeaderText: { fontSize: 15, fontWeight: '700', color: '#202124' },
  listSubText: { fontSize: 12, color: '#9E9E9E' },
  riderListContent: { paddingHorizontal: 12, gap: 10 },
  riderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    width: 220,
    overflow: 'hidden',
    gap: 8,
  },
  colorBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  avatarLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  riderInfo: { flex: 1 },
  riderName: { fontSize: 14, fontWeight: '700', color: '#202124' },
  riderDestination: { fontSize: 11, color: '#555', marginTop: 1 },
  riderMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  metaText: { fontSize: 10, color: '#888' },
  matchBadge: { backgroundColor: '#34A853', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  matchBadgeText: { fontSize: 9, color: '#FFFFFF', fontWeight: '800', letterSpacing: 0.5 },
  chatBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, alignItems: 'center' },
  chatBtnSmall: { backgroundColor: '#1A73E8', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  chatBtnText: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  emptyState: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#202124' },
  emptySubtitle: { fontSize: 13, color: '#666', marginTop: 4, textAlign: 'center' },
  emptyHomeBtn: {
    marginTop: 14,
    backgroundColor: '#1A73E8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyHomeBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
