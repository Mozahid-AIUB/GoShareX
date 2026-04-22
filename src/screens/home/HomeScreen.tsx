import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth } from '@/config/firebase.config';
import { DESTINATIONS } from '@/constants/destinations';
import { getFare, getSplitFare } from '@/constants/fareTable';
import { PICKUP_POINTS, getPickupPointById } from '@/constants/pickupPoints';
import { COLORS } from '@/constants/theme';
import type { MainTabNavProp } from '@/navigation/types';
import aiService from '@/services/ai/aiService';
import distanceMatrixService from '@/services/google/distanceMatrixService';
import placesService, { type PlaceSuggestion } from '@/services/google/placesService';
import locationService from '@/services/firebase/locationService';
import type { RiderMatch } from '@/services/firebase/matchingService';
import { useRideStore } from '@/store';
import type { RideRequestState } from '@/store/rideStore';

type LivePartner = {
  id: string;
  name: string;
  department: string;
  destinationId: string;
  distanceMeters: number;
  etaMinutes: number;
  matchScore: number;
  rating: number;
  badge: string;
};

type RouteDestination = {
  id: string;
  name: string;
  subtitle: string;
  soloFare: number;
  splitFare: number;
  etaMin: number;
};

const LIVE_PARTNERS: LivePartner[] = [
  { id: 'rakib', name: 'Rakib H.', department: 'CSE', destinationId: 'kuril', distanceMeters: 50, etaMinutes: 1, matchScore: 94, rating: 4.9, badge: 'Instant' },
  { id: 'sadia', name: 'Sadia K.', department: 'EEE', destinationId: 'badda', distanceMeters: 120, etaMinutes: 2, matchScore: 87, rating: 4.7, badge: 'Trusted' },
  { id: 'naim', name: 'Naim R.', department: 'BBA', destinationId: 'notun_bazar', distanceMeters: 180, etaMinutes: 3, matchScore: 82, rating: 4.8, badge: 'Regular' },
];

const T = {
  bg: '#F5F6FA',
  surface: '#FFFFFF',
  dark: '#0F1923',
  primary: '#1A56DB',
  primaryLight: '#EEF3FF',
  accent: '#F5A623',
  green: '#12B76A',
  textPrimary: '#0F1923',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
};

const getTimeContext = () => {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 10) return { label: 'Morning Rush', sub: 'High demand, fast partner discovery' };
  if (hour >= 10 && hour < 12) return { label: 'Mid Morning', sub: 'Steady match availability around campus' };
  if (hour >= 12 && hour < 14) return { label: 'Lunch Break', sub: 'A strong time to split short rides' };
  if (hour >= 14 && hour < 17) return { label: 'Afternoon', sub: 'Good route overlap for quick departures' };
  if (hour >= 17 && hour < 20) return { label: 'Evening Rush', sub: 'Peak demand and more live riders' };
  return { label: 'Night Ride', sub: 'Fewer riders, clearer route decisions' };
};

const formatDistance = (meters: number) =>
  meters < 1000 ? `${meters}m away` : `${(meters / 1000).toFixed(1)}km away`;

const RouteBar = ({
  currentLocation,
  destination,
  elevated,
  onLocationPress,
  onDestinationPress,
}: {
  currentLocation: string;
  destination: string | null;
  elevated: boolean;
  onLocationPress: () => void;
  onDestinationPress: () => void;
}) => (
  <View style={[styles.routeBarWrapper, elevated && styles.routeBarElevated]}>
    <View style={styles.routeBar}>
      <TouchableOpacity style={styles.routeSlot} activeOpacity={0.75} onPress={onLocationPress}>
        <View style={styles.routeDot}>
          <View style={styles.routeDotInner} />
        </View>
        <View style={styles.routeSlotText}>
          <Text style={styles.routeSlotLabel}>FROM</Text>
          <Text style={styles.routeSlotValue} numberOfLines={1}>
            {currentLocation || 'Detecting location...'}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.routeDivider} />

      <TouchableOpacity style={styles.routeSlot} activeOpacity={0.75} onPress={onDestinationPress}>
        <View style={[styles.routeDot, styles.routeDotDestination]}>
          <View style={[styles.routeDotInner, styles.routeDotInnerDestination]} />
        </View>
        <View style={styles.routeSlotText}>
          <Text style={styles.routeSlotLabel}>TO</Text>
          <Text
            style={[styles.routeSlotValue, !destination && styles.routeSlotPlaceholder]}
            numberOfLines={1}
          >
            {destination || 'Where are you going?'}
          </Text>
        </View>
        {!destination ? (
          <View style={styles.searchIconBadge}>
            <MaterialCommunityIcons name="magnify" size={16} color={T.primary} />
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  </View>
);

const ContextCard = ({
  timeLabel,
  timeSubtitle,
  suggestedDestination,
  matchChance,
  splitFare,
  onPress,
}: {
  timeLabel: string;
  timeSubtitle: string;
  suggestedDestination: string;
  matchChance: number;
  splitFare: number;
  onPress: () => void;
}) => (
  <View style={styles.contextCard}>
    <View style={styles.contextRow}>
      <View>
        <Text style={styles.contextTimeLabel}>{timeLabel}</Text>
        <Text style={styles.contextTimeSub}>{timeSubtitle}</Text>
      </View>
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>
    </View>

    <TouchableOpacity style={styles.suggestionPill} onPress={onPress} activeOpacity={0.86}>
      <View>
        <Text style={styles.suggestionLabel}>SMART SUGGESTION</Text>
        <Text style={styles.suggestionName}>{suggestedDestination}</Text>
        <Text style={styles.suggestionSub}>Split from BDT {splitFare}</Text>
      </View>
      <View style={styles.suggestionRight}>
        <Text style={styles.suggestionMatch}>{matchChance}%</Text>
        <Text style={styles.suggestionMatchLabel}>match chance</Text>
      </View>
    </TouchableOpacity>
  </View>
);

const QuickDestGrid = ({
  destinations,
  selected,
  onSelect,
}: {
  destinations: RouteDestination[];
  selected: string | null;
  onSelect: (item: RouteDestination) => void;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Quick destinations</Text>
    <View style={styles.destGrid}>
      {destinations.map((item, index) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.destCard,
            selected === item.name && styles.destCardSelected,
            index === 0 && styles.destCardTop,
          ]}
          activeOpacity={0.8}
          onPress={() => onSelect(item)}
        >
          {index === 0 ? <Text style={styles.destCardHot}>Popular</Text> : null}
          <Text style={styles.destCardName}>{item.name}</Text>
          <Text style={styles.destCardEta}>~{item.etaMin} min</Text>
          <View style={styles.destCardFares}>
            <Text style={styles.destCardSolo}>Solo BDT {item.soloFare}</Text>
            <Text style={styles.destCardSplit}>Shared BDT {item.splitFare}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const PartnerCard = ({
  partner,
  requestState,
  onRequest,
  onChat,
}: {
  partner: LivePartner & { destinationName: string; splitFare: number };
  requestState: RideRequestState;
  onRequest: () => void;
  onChat: () => void;
}) => {
  const trustColor =
    partner.badge === 'Instant' ? T.primary : partner.badge === 'Trusted' ? T.green : T.textMuted;

  return (
    <View style={styles.partnerCard}>
      <View style={styles.partnerCardHeader}>
        <View
          style={[
            styles.matchBadge,
            { backgroundColor: partner.matchScore >= 90 ? T.primary : '#374151' },
          ]}
        >
          <Text style={styles.matchBadgeText}>{partner.matchScore}% match</Text>
        </View>
        <Text style={[styles.trustLabel, { color: trustColor }]}>
          {requestState === 'confirmed' ? 'Confirmed' : requestState === 'pending' ? 'Pending' : partner.badge}
        </Text>
      </View>

      <Text style={styles.partnerName}>{partner.name}</Text>
      <Text style={styles.partnerMeta}>
        {partner.department} · {partner.rating.toFixed(1)} rating
      </Text>

      <View style={styles.partnerInfo}>
        <View>
          <Text style={styles.partnerInfoValue}>{partner.destinationName}</Text>
          <Text style={styles.partnerInfoLabel}>Meetup ETA {partner.etaMinutes} min</Text>
        </View>
        <View style={styles.partnerInfoRight}>
          <Text style={styles.partnerInfoValue}>{formatDistance(partner.distanceMeters)}</Text>
          <Text style={styles.partnerInfoLabel}>Split fare BDT {partner.splitFare}</Text>
        </View>
      </View>

      <View style={styles.partnerActions}>
        <TouchableOpacity
          style={[
            styles.btnRequest,
            requestState === 'pending' && styles.btnRequestPending,
            requestState === 'confirmed' && styles.btnRequestConfirmed,
          ]}
          activeOpacity={0.85}
          onPress={onRequest}
        >
          <Text style={styles.btnRequestText}>
            {requestState === 'confirmed' ? 'Confirmed' : requestState === 'pending' ? 'Pending' : 'Request'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnChat} activeOpacity={0.85} onPress={onChat}>
          <Text style={styles.btnChatText}>Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const navigation = useNavigation<any>()
  const tabBarHeight = useBottomTabBarHeight();
  const {
    destination,
    pickupPoint,
    setDestination,
    setPickupPoint,
    setPartner,
    setStatus,
    requestStates,
    requestingPartner,
    setRequestState,
    clearRequestState,
    setRequestingPartner,
  } = useRideStore();

  const [userName, setUserName] = useState('Student');
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [routeBarElevated, setRouteBarElevated] = useState(false);
  const [destinationQuery, setDestinationQuery] = useState('');
  const [remoteSuggestions, setRemoteSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState('');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [partnerDistances, setPartnerDistances] = useState<Record<string, { distanceMeters: number; durationSeconds: number }>>({});

  const selectedPickup = pickupPoint ?? 'main_gate';
  const selectedPickupDetails = useMemo(
    () => getPickupPointById(selectedPickup) ?? PICKUP_POINTS[0],
    [selectedPickup]
  );
  const selectedDestinationDetails = useMemo(
    () => DESTINATIONS.find((item) => item.id === destination),
    [destination]
  );
  const timeCtx = useMemo(() => getTimeContext(), []);

  const quickDestinations = useMemo<RouteDestination[]>(
    () =>
      DESTINATIONS.map((item, index) => ({
        id: item.id,
        name: item.name,
        subtitle:
          index === 0
            ? 'Popular right now'
            : index === 1
              ? 'Fast match available'
              : `${item.estimatedTime} min from AIUB`,
        soloFare: getFare(selectedPickup, item.id),
        splitFare: getSplitFare(selectedPickup, item.id, 2),
        etaMin: item.estimatedTime,
      })),
    [selectedPickup]
  );

  const suggestedDestination = quickDestinations[0];

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const firstName = (user.displayName ?? '').trim().split(' ')[0];
      setUserName(firstName || 'Student');
    }

    if (!pickupPoint) {
      setPickupPoint('main_gate');
    }

    const loadLocation = async () => {
      const granted = await locationService.requestPermissions();
      if (!granted) {
        return;
      }

      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
    };

    loadLocation().catch(() => setCurrentLocation(null));
  }, [pickupPoint, setPickupPoint]);

  useEffect(() => {
    if (!destinationQuery.trim() || destinationQuery.trim().length < 2) {
      setRemoteSuggestions([]);
      setPlacesError('');
      setIsSearchingPlaces(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsSearchingPlaces(true);
        setPlacesError('');
        const results = await placesService.autocomplete({
          input: destinationQuery,
          latitude: currentLocation?.latitude,
          longitude: currentLocation?.longitude,
          radiusMeters: 10000,
        });
        if (!cancelled) {
          setRemoteSuggestions(results.slice(0, 6));
        }
      } catch (error) {
        if (!cancelled) {
          setRemoteSuggestions([]);
          setPlacesError(error instanceof Error ? error.message : 'Search failed');
        }
      } finally {
        if (!cancelled) {
          setIsSearchingPlaces(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentLocation?.latitude, currentLocation?.longitude, destinationQuery]);

  useEffect(() => {
    if (!currentLocation?.latitude || !currentLocation?.longitude || !destination) {
      setPartnerDistances({});
      return;
    }

    const scopedPartners = LIVE_PARTNERS.filter((item) => item.destinationId === destination);
    if (scopedPartners.length === 0) {
      setPartnerDistances({});
      return;
    }

    let cancelled = false;
    const loadDistances = async () => {
      try {
        const matrix = await distanceMatrixService.getWalkingMatrix(
          { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
          scopedPartners.map((item) => ({
            latitude: DESTINATIONS.find((d) => d.id === item.destinationId)?.lat ?? selectedPickupDetails.lat,
            longitude: DESTINATIONS.find((d) => d.id === item.destinationId)?.lng ?? selectedPickupDetails.lng,
          }))
        );

        if (cancelled) return;

        const nextState: Record<string, { distanceMeters: number; durationSeconds: number }> = {};
        scopedPartners.forEach((partner, index) => {
          const row = matrix[index];
          if (row?.status === 'OK') {
            nextState[partner.id] = {
              distanceMeters: row.distanceMeters,
              durationSeconds: row.durationSeconds,
            };
          }
        });
        setPartnerDistances(nextState);
      } catch {
        if (!cancelled) {
          setPartnerDistances({});
        }
      }
    };

    loadDistances();
    return () => {
      cancelled = true;
    };
  }, [currentLocation?.latitude, currentLocation?.longitude, destination, selectedPickupDetails.lat, selectedPickupDetails.lng]);

  const visiblePartners = useMemo(() => {
    if (!destination) return [];

    return LIVE_PARTNERS.filter((item) => item.destinationId === destination)
      .map((partner) => {
        const apiDistance = partnerDistances[partner.id];
        const destinationName = DESTINATIONS.find((item) => item.id === partner.destinationId)?.name ?? 'Route';
        return {
          ...partner,
          destinationName,
          splitFare: getSplitFare(selectedPickup, partner.destinationId, 2),
          distanceMeters: apiDistance?.distanceMeters ?? partner.distanceMeters,
          etaMinutes: apiDistance?.durationSeconds
            ? Math.max(1, Math.round(apiDistance.durationSeconds / 60))
            : partner.etaMinutes,
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [destination, partnerDistances, selectedPickup]);

  const buildRiderPayload = (partner: LivePartner): RiderMatch => ({
    userId: partner.id,
    name: partner.name,
    distance: partner.distanceMeters,
    destination: DESTINATIONS.find((item) => item.id === partner.destinationId)?.name ?? 'Route',
    pickupPoint: selectedPickupDetails.name,
    rating: partner.rating,
    badge: partner.badge,
    lat: currentLocation?.latitude ?? selectedPickupDetails.lat,
    lng: currentLocation?.longitude ?? selectedPickupDetails.lng,
    isMatch: destination === partner.destinationId,
  });

  const selectDestination = (item: RouteDestination) => {
    setDestination(item.id);
    setDestinationQuery(item.name);
    setRemoteSuggestions([]);
    setPlacesError('');
    setSearchModalVisible(false);
  };

  const handleRemoteSuggestion = (suggestion: PlaceSuggestion) => {
    const match = quickDestinations.find((item) =>
      suggestion.description.toLowerCase().includes(item.name.toLowerCase()) ||
      suggestion.primaryText.toLowerCase().includes(item.name.toLowerCase())
    );

    if (!match) {
      Alert.alert(
        'Destination not configured',
        'Google Places search is working, but this destination is not yet mapped inside your fare and ride flow.'
      );
      return;
    }

    selectDestination(match);
  };

  const handleRequest = (partner: LivePartner) => {
    const rider = buildRiderPayload(partner);
    setPartner(rider);
    setStatus('waiting');
    setRequestState(partner.id, 'pending');
    setRequestingPartner(partner);
  };

  const handleOpenChat = (partner: LivePartner) => {
    const rider = buildRiderPayload(partner);
    setPartner(rider);
    setStatus('matched');
    setRequestState(partner.id, 'confirmed');
    setRequestingPartner(null);
    navigation.navigate('Chat', { rider, partnerName: partner.name });
  };

  const dismissRequestSheet = () => {
    if (requestingPartner) {
      clearRequestState(requestingPartner.id);
    }
    setRequestingPartner(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

      <RouteBar
        currentLocation={selectedPickupDetails.name}
        destination={selectedDestinationDetails?.name ?? null}
        elevated={routeBarElevated}
        onLocationPress={() => { }}
        onDestinationPress={() => setSearchModalVisible(true)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 30 }]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => setRouteBarElevated(event.nativeEvent.contentOffset.y > 10)}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {timeCtx.label.split(' ')[0]}{userName ? `, ${userName}` : ''}</Text>
            <Text style={styles.subGreeting}>Where are you headed today?</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.8}>
            <MaterialCommunityIcons name="bell-outline" size={18} color={T.textPrimary} />
          </TouchableOpacity>
        </View>

        <ContextCard
          timeLabel={timeCtx.label}
          timeSubtitle={timeCtx.sub}
          suggestedDestination={suggestedDestination?.name ?? 'Kuril'}
          matchChance={90}
          splitFare={suggestedDestination?.splitFare ?? 20}
          onPress={() => suggestedDestination && selectDestination(suggestedDestination)}
        />

        <QuickDestGrid
          destinations={quickDestinations}
          selected={selectedDestinationDetails?.name ?? null}
          onSelect={selectDestination}
        />

        {selectedDestinationDetails ? (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Live partner feed</Text>
              <View style={styles.liveBadgeSmall}>
                <Text style={styles.liveTextSmall}>{visiblePartners.length} live</Text>
              </View>
            </View>
            <Text style={styles.sectionSub}>
              Nearby students going to {selectedDestinationDetails.name}
            </Text>

            {!currentLocation && visiblePartners.length > 0 ? (
              <ActivityIndicator color={T.primary} style={{ marginVertical: 18 }} />
            ) : visiblePartners.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No partners nearby right now.</Text>
                <Text style={styles.emptyStateSub}>Post a request and someone will join you.</Text>
              </View>
            ) : (
              visiblePartners.map((partner) => (
                <PartnerCard
                  key={partner.id}
                  partner={partner}
                  requestState={requestStates[partner.id] ?? 'idle'}
                  onRequest={() =>
                    (requestStates[partner.id] ?? 'idle') === 'confirmed'
                      ? handleOpenChat(partner)
                      : handleRequest(partner)
                  }
                  onChat={() => handleOpenChat(partner)}
                />
              ))
            )}

            <TouchableOpacity style={styles.postBtn} activeOpacity={0.82}>
              <Text style={styles.postBtnText}>+ Post my ride request</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={searchModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSearchModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Where to?</Text>
            <Text style={styles.modalSubtitle}>Search with Google Places or choose a supported route.</Text>

            <View style={styles.searchInputWrap}>
              <MaterialCommunityIcons name="magnify" size={18} color={T.textSecondary} />
              <TextInput
                value={destinationQuery}
                onChangeText={setDestinationQuery}
                placeholder="Search destination"
                placeholderTextColor={T.textMuted}
                style={styles.searchInput}
              />
              {isSearchingPlaces ? <ActivityIndicator size="small" color={T.primary} /> : null}
            </View>

            {placesError ? <Text style={styles.searchError}>{placesError}</Text> : null}

            <ScrollView showsVerticalScrollIndicator={false}>
              {remoteSuggestions.map((item) => (
                <TouchableOpacity
                  key={item.placeId}
                  style={styles.searchResult}
                  activeOpacity={0.82}
                  onPress={() => handleRemoteSuggestion(item)}
                >
                  <MaterialCommunityIcons name="map-marker-outline" size={18} color={T.primary} />
                  <View style={styles.searchResultText}>
                    <Text style={styles.searchResultTitle}>{item.primaryText}</Text>
                    <Text style={styles.searchResultMeta}>
                      {item.secondaryText || item.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              <Text style={styles.modalSectionTitle}>Supported quick routes</Text>
              {quickDestinations.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.modalQuickItem}
                  activeOpacity={0.82}
                  onPress={() => selectDestination(item)}
                >
                  <View>
                    <Text style={styles.modalQuickTitle}>{item.name}</Text>
                    <Text style={styles.modalQuickMeta}>{item.subtitle}</Text>
                  </View>
                  <Text style={styles.modalQuickFare}>BDT {item.splitFare}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!requestingPartner}
        transparent
        animationType="slide"
        onRequestClose={dismissRequestSheet}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={dismissRequestSheet} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Partner ready</Text>
            <Text style={styles.modalSubtitle}>
              {requestingPartner?.name} is nearby for {DESTINATIONS.find((item) => item.id === requestingPartner?.destinationId)?.name ?? 'your route'}.
            </Text>

            <View style={styles.requestSummaryCard}>
              <Text style={styles.requestSummaryTitle}>{requestingPartner?.name}</Text>
              <Text style={styles.requestSummaryMeta}>
                {requestingPartner?.department} · {requestingPartner?.rating.toFixed(1)} rating
              </Text>
              <Text style={styles.requestSummaryMeta}>
                Meetup ETA {requestingPartner?.etaMinutes ?? '--'} min · Split fare BDT {requestingPartner ? getSplitFare(selectedPickup, requestingPartner.destinationId, 2) : '--'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryModalButton}
              activeOpacity={0.85}
              onPress={() => requestingPartner && handleOpenChat(requestingPartner)}
            >
              <Text style={styles.primaryModalButtonText}>Continue to chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryModalButton}
              activeOpacity={0.85}
              onPress={() => {
                setRequestingPartner(null);
                navigation.navigate('Map' as any)
              }}
            >
              <Text style={styles.secondaryModalButtonText}>Open live map</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: T.textPrimary, letterSpacing: -0.3 },
  subGreeting: { fontSize: 14, color: T.textSecondary, marginTop: 2 },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  routeBarWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: T.bg,
    zIndex: 100,
  },
  routeBarElevated: {
    backgroundColor: T.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  routeBar: {
    backgroundColor: T.surface,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: T.border,
  },
  routeSlot: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeDotInner: { width: 5, height: 5, borderRadius: 3, backgroundColor: T.primary },
  routeDotDestination: { borderColor: T.dark },
  routeDotInnerDestination: { backgroundColor: T.dark },
  routeSlotText: { flex: 1 },
  routeSlotLabel: { fontSize: 9, fontWeight: '700', color: T.textMuted, letterSpacing: 0.8, marginBottom: 2 },
  routeSlotValue: { fontSize: 14, fontWeight: '600', color: T.textPrimary },
  routeSlotPlaceholder: { color: T.textMuted, fontWeight: '400' },
  routeDivider: { width: 1, height: 32, backgroundColor: T.border, marginHorizontal: 12 },
  searchIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: T.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextCard: { backgroundColor: T.dark, borderRadius: 20, padding: 20, marginBottom: 16 },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  contextTimeLabel: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  contextTimeSub: { fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#12B76A' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
  suggestionPill: {
    backgroundColor: T.accent,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(0,0,0,0.5)', letterSpacing: 0.8, marginBottom: 4 },
  suggestionName: { fontSize: 22, fontWeight: '800', color: T.dark, marginBottom: 4 },
  suggestionSub: { fontSize: 12, color: 'rgba(0,0,0,0.55)' },
  suggestionRight: { alignItems: 'flex-end' },
  suggestionMatch: { fontSize: 24, fontWeight: '800', color: T.dark },
  suggestionMatchLabel: { fontSize: 10, color: 'rgba(0,0,0,0.5)' },
  section: { marginBottom: 16 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: T.textPrimary, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: T.textSecondary, marginBottom: 12 },
  liveBadgeSmall: { backgroundColor: '#ECFDF3', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  liveTextSmall: { fontSize: 12, fontWeight: '700', color: T.green },
  destGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  destCard: {
    width: '47.5%',
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: T.border,
  },
  destCardSelected: { borderColor: T.primary, backgroundColor: T.primaryLight },
  destCardTop: { borderColor: T.accent },
  destCardHot: { fontSize: 10, color: T.accent, fontWeight: '700', marginBottom: 4 },
  destCardName: { fontSize: 15, fontWeight: '700', color: T.textPrimary, marginBottom: 2 },
  destCardEta: { fontSize: 12, color: T.textSecondary, marginBottom: 8 },
  destCardFares: { gap: 2 },
  destCardSolo: { fontSize: 11, color: T.textMuted },
  destCardSplit: { fontSize: 12, fontWeight: '600', color: T.green },
  partnerCard: {
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  partnerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  matchBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  trustLabel: { fontSize: 12, fontWeight: '600' },
  partnerName: { fontSize: 20, fontWeight: '700', color: T.textPrimary, marginBottom: 2 },
  partnerMeta: { fontSize: 13, color: T.textSecondary, marginBottom: 12 },
  partnerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  partnerInfoValue: { fontSize: 14, fontWeight: '600', color: T.textPrimary, marginBottom: 2 },
  partnerInfoLabel: { fontSize: 12, color: T.textSecondary },
  partnerInfoRight: { alignItems: 'flex-end' },
  partnerActions: { flexDirection: 'row', gap: 10 },
  btnRequest: {
    flex: 1,
    backgroundColor: T.primary,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnRequestPending: { backgroundColor: '#F4B400' },
  btnRequestConfirmed: { backgroundColor: T.green },
  btnRequestText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  btnChat: {
    width: 90,
    backgroundColor: T.surface,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: T.border,
  },
  btnChatText: { color: T.textPrimary, fontWeight: '600', fontSize: 14 },
  postBtn: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: T.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  postBtnText: { color: T.primary, fontWeight: '600', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyStateText: { fontSize: 15, fontWeight: '600', color: T.textSecondary, marginBottom: 4 },
  emptyStateSub: { fontSize: 13, color: T.textMuted, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,25,35,0.35)' },
  modalSheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '78%',
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: T.textPrimary },
  modalSubtitle: { fontSize: 13, color: T.textSecondary, marginTop: 4, marginBottom: 14 },
  searchInputWrap: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: T.textPrimary, paddingVertical: 0 },
  searchError: { color: COLORS.error, fontSize: 12, fontWeight: '700', marginBottom: 10 },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  searchResultText: { flex: 1 },
  searchResultTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary, marginBottom: 2 },
  searchResultMeta: { fontSize: 12, color: T.textSecondary },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: T.textMuted,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.7,
  },
  modalQuickItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  modalQuickTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  modalQuickMeta: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  modalQuickFare: { fontSize: 13, fontWeight: '700', color: T.green },
  requestSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  requestSummaryTitle: { fontSize: 16, fontWeight: '700', color: T.textPrimary, marginBottom: 4 },
  requestSummaryMeta: { fontSize: 13, color: T.textSecondary, marginTop: 2 },
  primaryModalButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryModalButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryModalButton: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryModalButtonText: { color: T.textPrimary, fontSize: 15, fontWeight: '700' },
});
