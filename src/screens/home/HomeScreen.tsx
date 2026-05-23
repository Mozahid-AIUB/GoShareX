import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Circle, Path, Rect } from 'react-native-svg';
import PremiumIcon from '@/components/common/PremiumIcon';

import { auth } from '@/config/firebase.config';
import { DESTINATIONS } from '@/constants/destinations';
import { getFare, getSplitFare } from '@/constants/fareTable';
import { PICKUP_POINTS, getPickupPointById } from '@/constants/pickupPoints';
import { COLORS } from '@/constants/theme';
import { premiumTheme } from '@/design/premium';
import type { MainTabNavProp } from '@/navigation/types';
import distanceMatrixService from '@/services/google/distanceMatrixService';
import directionsService from '@/services/google/directionsService';
import routesService from '@/services/google/routesService';
import placesService, { type PlaceSuggestion } from '@/services/google/placesService';
import locationService from '@/services/firebase/locationService';
import type { RiderMatch } from '@/services/firebase/matchingService';
import { useRideStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { useNearbyRiders } from '@/hooks/useNearbyRiders';
import { useLocationStore } from '@/store';
import type { RideRequestState } from '@/store/rideStore';
import { VEHICLE_CONFIG, type VehicleType } from '@/store/rideStore';
import { sanitizeSpeedKmh } from '@/utils/locationSpeed';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import PremiumVehicleArt from '@/components/vehicles/PremiumVehicleArt';
import {
  recordSearch,
  getPopularSearches,
  recordPickupUsage,
  getFrequentPickups,
  getMostUsedPickup,
  type SearchEntry,
  type PickupHistoryEntry,
} from '@/services/search/searchHistoryService';
import { getStreetViewUrl } from '@/services/google/staticMapService';
import geocodingService from '@/services/google/geocodingService';
import { Image } from 'react-native';
import {
  IconSunrise,
  IconSun,
  IconLunch,
  IconAfternoon,
  IconEvening,
  IconMoon,
  IconWave,
  IconFire,
  IconStar,
  IconSmart,
  IconRouteArrow,
  IconCar,
  IconMapPin,
  IconLiveDot,
  IconClock,
  IconCash,
  IconNavigation,
  IconBell,
  IconCheck,
  IconRouteLine,
} from './components/HomeIcons';
import { IconRickshaw, IconBikeVehicle, IconCNG } from './components/VehicleIcons';
import { LiveDot, TrustChip, MatchRing } from './components/StatusChips';
import {
  LIVE_PARTNER_FEED_ENABLED,
  MY_LOCATION_PICKUP_ID,
  getGreeting,
  getTimeContext,
  fmtDist,
  type TimeContext,
  type WayPoint,
  type RouteDestination,
  type RouteInfo,
  type RouteStep,
  type DistanceMatrixResult,
  type VisiblePartner,
  type AppNotification,
} from './utils/homeHelpers';
import { useScreenFocusTracking } from '@/hooks/useScreenTracking';


// ─── Design Tokens — light theme matching the S StyleSheet ───────────────────
const D = {
  bg: '#FAF8FF',
  card: '#FFFFFF',
  dark: '#1A1A2E',
  navy: '#10182D',
  primary: '#6366F1',
  primarySoft: 'rgba(99,102,241,0.08)',
  primaryMid: 'rgba(99,102,241,0.2)',
  accent: '#F59E0B',
  accentSoft: 'rgba(245,158,11,0.12)',
  green: '#0D9488',
  greenSoft: 'rgba(13,148,136,0.1)',
  red: '#EF4444',
  redSoft: 'rgba(239,68,68,0.1)',
  amber: '#F59E0B',
  text: '#1A1A2E',
  textSub: '#9896A8',
  textMuted: '#B0AACC',
  border: '#EDE8F5',
  borderStrong: '#D4D7FF',
  shadow: '#6366F1',
  radius: 20,
  radiusSm: 12,
  radiusLg: 28,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Route waypoint row card (FROM/TO/STOP) */
const RouteCard = ({
  waypoints, onFromPress, onToPress, onAddStop, onSwap, onRemoveStop, elevated,
}: {
  waypoints: WayPoint[];
  onFromPress: () => void;
  onToPress: (idx: number) => void;
  onAddStop: () => void;
  onSwap: () => void;
  onRemoveStop: (idx: number) => void;
  elevated: boolean;
}) => {
  const from = waypoints[0];
  const destinations = waypoints.slice(1);

  return (
    <View style={[S.routeCard, elevated && S.routeCardElevated]}>
      {/* FROM row */}
      <Pressable style={S.routeRow} onPress={onFromPress} android_ripple={{ color: '#EEF2FF' }}>
        <View style={S.routeIconWrapFrom}>
          <MaterialCommunityIcons name="map-marker" size={18} color="#6366F1" />
        </View>
        <View style={S.routeTextWrap}>
          <Text style={S.routeLabelFrom}>FROM</Text>
          <Text
            style={[S.routeRowValue, !from?.label && S.routeRowPlaceholder]}
            numberOfLines={1}
          >
            {from?.label || 'Choose pickup point'}
          </Text>
        </View>
        <View style={S.routeChevronWrap}>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#6366F1" />
        </View>
      </Pressable>

      {/* Divider with swap */}
      <View style={S.routeDividerRow}>
        <View style={S.routeDividerLine} />
        <TouchableOpacity style={S.swapBtn} onPress={onSwap} activeOpacity={0.75}>
          <MaterialCommunityIcons name="swap-vertical" size={16} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* TO / STOP row(s) */}
      {destinations.map((wp, idx) => (
        <View key={wp.id}>
          <Pressable
            style={S.routeRow}
            onPress={() => onToPress(idx + 1)}
            android_ripple={{ color: '#FEF2F2' }}
          >
            <View style={wp.type === 'stop' ? S.routeIconWrapStop : S.routeIconWrapTo}>
              <MaterialCommunityIcons
                name={wp.type === 'stop' ? 'map-marker-plus' : 'flag-checkered'}
                size={18}
                color={wp.type === 'stop' ? '#F59E0B' : '#EF4444'}
              />
            </View>
            <View style={S.routeTextWrap}>
              <Text style={wp.type === 'stop' ? S.routeLabelStop : S.routeLabelTo}>
                {wp.type === 'stop' ? 'STOP' : 'TO'}
              </Text>
              <Text
                style={[S.routeRowValue, !wp.label && S.routeRowPlaceholder]}
                numberOfLines={1}
              >
                {wp.label || 'Where are you going?'}
              </Text>
            </View>
            {destinations.length > 1 && wp.type === 'stop' ? (
              <TouchableOpacity onPress={() => onRemoveStop(idx + 1)} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ) : !wp.label ? (
              <View style={S.searchBadge}>
                <MaterialCommunityIcons name="magnify" size={15} color="#EF4444" />
              </View>
            ) : (
              <View style={S.routeChevronWrap}>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#EF4444" />
              </View>
            )}
          </Pressable>
          {idx < destinations.length - 1 && <View style={S.routeInnerDivider} />}
        </View>
      ))}

      {/* Add stop */}
      <TouchableOpacity style={S.addStopBtn} onPress={onAddStop} activeOpacity={0.8}>
        <MaterialCommunityIcons name="plus-circle-outline" size={16} color="#6366F1" />
        <Text style={S.addStopText}>Add a stop</Text>
      </TouchableOpacity>
    </View>
  );
};

/** Quick destination chip — compact horizontal suggestion pill */
const DestCard = ({
  item, selected, onSelect, rank,
}: {
  item: RouteDestination; selected: boolean; onSelect: () => void; rank: number;
}) => (
  <TouchableOpacity
    style={[S.destChip, selected && S.destChipSelected]}
    onPress={onSelect}
    activeOpacity={0.8}
  >
    {rank === 0 && <IconFire size={11} />}
    <View style={S.destChipInner}>
      <Text style={[S.destChipName, selected && S.destChipNameSelected]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={[S.destChipFare, selected && S.destChipFareSelected]}>
        ৳{item.splitFare} split
      </Text>
    </View>
  </TouchableOpacity>
);

/** Partner card */
const PartnerCard = ({
  partner, requestState, onRequest, onChat,
}: {
  partner: VisiblePartner; requestState: RideRequestState; onRequest: () => void; onChat: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const isConfirmed = requestState === 'confirmed';
  const isPending = requestState === 'pending';

  return (
    <Animated.View style={[S.partnerCard, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} style={{ gap: 0 }}>
        {/* Header */}
        <View style={S.partnerHeader}>
          <View style={S.partnerAvatar}>
            <Text style={S.partnerAvatarText}>{partner.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={S.partnerName}>{partner.name}</Text>
              <TrustChip badge={partner.badge} confirmed={isConfirmed} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <IconStar size={11} />
              <Text style={S.partnerMeta}> {partner.rating?.toFixed(1)}</Text>
            </View>
          </View>
          <MatchRing score={partner.matchScore} />
        </View>

        {/* Info row */}
        <View style={S.partnerInfoRow}>
          <View style={S.partnerInfoItem}>
            <IconMapPin size={14} color1="#8E9DC0" color2="#4B5A7A" />
            <Text style={S.partnerInfoVal}>{fmtDist(partner.distanceMeters)} away</Text>
          </View>
          <View style={S.partnerInfoDivider} />
          <View style={S.partnerInfoItem}>
            <IconClock size={14} />
            <Text style={S.partnerInfoVal}>ETA {partner.etaMinutes} min</Text>
          </View>
          <View style={S.partnerInfoDivider} />
          <View style={S.partnerInfoItem}>
            <IconCash size={14} />
            <Text style={[S.partnerInfoVal, { color: D.green, fontWeight: '700' }]}>BDT {partner.splitFare}</Text>
          </View>
        </View>

        {/* Destination */}
        <View style={S.partnerDest}>
          <IconNavigation size={13} />
          <Text style={S.partnerDestText}>Going to {partner.destinationName}</Text>
        </View>

        {/* Actions */}
        <View style={S.partnerActions}>
          <TouchableOpacity
            style={[
              S.btnRequest,
              isPending && { backgroundColor: D.amber },
              isConfirmed && { backgroundColor: D.green },
            ]}
            onPress={onRequest}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name={isConfirmed ? 'check' : isPending ? 'clock-outline' : 'hand-wave-outline'}
              size={16}
              color="#FFF"
            />
            <Text style={S.btnRequestText}>
              {isConfirmed ? 'Confirmed' : isPending ? 'Pending…' : 'Request'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={S.btnChat} onPress={onChat} activeOpacity={0.82}>
            <MaterialCommunityIcons name="message-text-outline" size={16} color={D.primary} />
            <Text style={S.btnChatText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Animated.View>
  );
};

// ─── PICKUP SELECTOR MODAL ──────────────────────────────────────────────────
const PickupModal = ({
  visible, selected, currentLocation, currentLocationLabel, frequentPickups, onSelect, onClose, onSelectGPS,
}: {
  visible: boolean;
  selected: string;
  currentLocation: { latitude: number; longitude: number } | null;
  currentLocationLabel: string;
  frequentPickups: PickupHistoryEntry[];
  onSelect: (id: string) => void;
  onClose: () => void;
  onSelectGPS: () => Promise<void>;
}) => {
  const [gpsLoading, setGpsLoading] = React.useState(false);
  // IDs of pickup points that appear in frequent list (to avoid duplicate in full list)
  const frequentIds = new Set(frequentPickups.map(f => f.id));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.modalOverlay}>
        <TouchableOpacity style={S.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[S.modalSheet, { maxHeight: '90%' }]}>
          <View style={S.modalHandle} />
          <Text style={S.modalTitle}>Where are you boarding from?</Text>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* ── Live location option ── */}
            <TouchableOpacity
              style={[S.pickupItem, selected === MY_LOCATION_PICKUP_ID && S.pickupItemSelected, gpsLoading && { opacity: 0.7 }]}
              onPress={async () => {
                if (gpsLoading) return;
                setGpsLoading(true);
                try {
                  await onSelectGPS();
                  onClose();
                } finally {
                  setGpsLoading(false);
                }
              }}
              activeOpacity={0.82}
            >
              <View style={[S.pickupIcon, (selected === MY_LOCATION_PICKUP_ID || gpsLoading) && { backgroundColor: D.primary }]}>
                <MaterialCommunityIcons
                  name={gpsLoading ? 'loading' : 'crosshairs-gps'}
                  size={18}
                  color={(selected === MY_LOCATION_PICKUP_ID || gpsLoading) ? '#FFFFFF' : D.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.pickupName, (selected === MY_LOCATION_PICKUP_ID || gpsLoading) && { color: D.primary }]}>
                  {gpsLoading ? 'Getting your location...' : 'My current location'}
                </Text>
                <Text style={S.pickupNameBn}>
                  {gpsLoading
                    ? 'Please wait, fetching GPS...'
                    : currentLocation
                      ? currentLocationLabel
                      : 'Tap to fetch live GPS location'}
                </Text>
              </View>
              {!gpsLoading && selected === MY_LOCATION_PICKUP_ID && (
                <MaterialCommunityIcons name="check-circle" size={20} color={D.primary} />
              )}
              {gpsLoading && (
                <ActivityIndicator size="small" color={D.primary} />
              )}
            </TouchableOpacity>

            {/* ── Frequently used section ── */}
            {frequentPickups.length > 0 && (
              <>
                <View style={S.pickupSectionHeader}>
                  <MaterialCommunityIcons name="history" size={13} color="#9896A8" />
                  <Text style={S.pickupSectionLabel}>Frequently used</Text>
                </View>
                {frequentPickups.map((fp) => {
                  const hasCoords = fp.lat != null && fp.lng != null;
                  const streetViewUrl = hasCoords
                    ? getStreetViewUrl({ latitude: fp.lat!, longitude: fp.lng! }, { width: 120, height: 80 })
                    : null;
                  return (
                    <TouchableOpacity
                      key={fp.id}
                      style={[S.pickupItem, S.pickupItemFrequent, selected === fp.id && S.pickupItemSelected]}
                      onPress={() => { onSelect(fp.id); onClose(); }}
                      activeOpacity={0.82}
                    >
                      {streetViewUrl ? (
                        <Image
                          source={{ uri: streetViewUrl }}
                          style={{ width: 56, height: 56, borderRadius: 10, marginRight: 4 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[S.pickupIcon, { backgroundColor: 'rgba(99,102,241,0.08)' }, selected === fp.id && { backgroundColor: D.primary }]}>
                          <MaterialCommunityIcons
                            name="map-marker-check"
                            size={18}
                            color={selected === fp.id ? '#FFFFFF' : D.primary}
                          />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[S.pickupName, selected === fp.id && { color: D.primary }]}>{fp.name}</Text>
                        <Text style={S.pickupNameBn}>
                          Used {fp.count} time{fp.count !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      {selected === fp.id
                        ? <MaterialCommunityIcons name="check-circle" size={20} color={D.primary} />
                        : <View style={S.pickupCountBadge}>
                          <Text style={S.pickupCountText}>{fp.count}×</Text>
                        </View>
                      }
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── DESTINATION SEARCH MODAL ────────────────────────────────────────────────
const DestinationModal = ({
  visible, onClose, onSelect, onSelectSuggestion, onSelectCustomHistory, onUseAsAddress, currentLocation,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: RouteDestination) => void;
  onSelectSuggestion: (item: PlaceSuggestion) => void;
  onSelectCustomHistory: (entry: SearchEntry) => void;
  onUseAsAddress: (rawText: string) => Promise<void>;
  currentLocation: { latitude: number; longitude: number } | null;
}) => {
  const [query, setQuery] = useState('');
  const [remoteSuggestions, setRemoteSuggestions] = useState<PlaceSuggestion[]>([]);
  const [popularSearches, setPopularSearches] = useState<SearchEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 300);
      // Load popular searches when modal opens
      getPopularSearches(8).then(setPopularSearches).catch(() => { });
    } else {
      setQuery(''); setRemoteSuggestions([]); setError('');
    }
  }, [visible]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setRemoteSuggestions([]); setError(''); setIsSearching(false); return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setIsSearching(true); setError('');
        const res = await placesService.autocomplete({
          input: query,
          latitude: currentLocation?.latitude,
          longitude: currentLocation?.longitude,
          radiusMeters: 15000,
          sessionToken: `session_${Date.now()}`,
        });
        if (!cancelled) setRemoteSuggestions(res.slice(0, 8));
      } catch (e) {
        if (!cancelled) {
          setRemoteSuggestions([]);
          setError('Search unavailable. Check your connection.');
        }
      } finally { if (!cancelled) setIsSearching(false); }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, currentLocation]);

  const handleSelectHistory = (entry: SearchEntry) => {
    recordSearch({ id: entry.id, name: entry.name, lat: entry.lat, lng: entry.lng, placeId: entry.placeId }).catch(() => { });
    // Custom Places entries (lat/lng present) need customDestination set — not just destination id
    if (entry.lat && entry.lng) {
      onSelectCustomHistory(entry);
    } else {
      const dest: RouteDestination = {
        id: entry.id,
        name: entry.name,
        subtitle: `Used ${entry.count} time${entry.count > 1 ? 's' : ''}`,
        soloFare: 0,
        splitFare: 0,
        etaMin: 0,
      };
      onSelect(dest);
    }
    onClose();
  };

  const handleRemote = (s: PlaceSuggestion) => {
    recordSearch({
      id: s.placeId,
      name: s.primaryText,
      subtitle: s.secondaryText,
      placeId: s.placeId,
    }).catch(() => { });

    onSelectSuggestion(s);
    onClose();
  };

  const showHistory = query.trim().length < 2;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.modalOverlay}>
        <TouchableOpacity style={S.modalBackdrop} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <View style={[S.modalSheet, { maxHeight: '88%' }]}>
          <View style={S.modalHandle} />
          <Text style={S.modalTitle}>Where to?</Text>

          <View style={S.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={18} color={D.textMuted} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search destination or address..."
              placeholderTextColor={D.textMuted}
              style={S.searchInput}
              returnKeyType="search"
            />
            {isSearching
              ? <ActivityIndicator size="small" color={D.primary} />
              : query.length > 0
                ? <TouchableOpacity onPress={() => setQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={D.textMuted} />
                </TouchableOpacity>
                : null}
          </View>

          {!!error && <Text style={{ color: COLORS.error, fontSize: 12, marginBottom: 8, fontWeight: '600' }}>{error}</Text>}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Popular / recent searches when no query */}
            {showHistory && popularSearches.length > 0 && (
              <>
                <Text style={S.modalSection}>Popular searches</Text>
                {popularSearches.map((entry, i) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={S.destSearchRow}
                    onPress={() => handleSelectHistory(entry)}
                    activeOpacity={0.82}
                  >
                    <View style={[S.destSearchIcon, i === 0 && { backgroundColor: D.accentSoft }]}>
                      {i === 0 ? <IconFire size={16} /> : <IconClock size={16} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={S.destSearchTitle}>{entry.name}</Text>
                      <Text style={S.destSearchMeta}>
                        {entry.count === 1 ? 'Recently visited' : `Searched ${entry.count} times`}
                      </Text>
                    </View>
                    {i === 0 && (
                      <View style={{ backgroundColor: D.accentSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: D.amber }}>TOP</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Empty state when no history */}
            {showHistory && popularSearches.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <IconSmart size={36} />
                <Text style={{ fontSize: 14, color: D.textSub, marginTop: 12, fontWeight: '600' }}>
                  Start typing to search
                </Text>
                <Text style={{ fontSize: 12, color: D.textMuted, marginTop: 4, textAlign: 'center' }}>
                  Your popular destinations will appear here after your first search
                </Text>
              </View>
            )}

            {/* Remote Google Places results */}
            {!showHistory && remoteSuggestions.length > 0 && (
              <>
                <Text style={S.modalSection}>Search results</Text>
                {remoteSuggestions.map(s => (
                  <TouchableOpacity key={s.placeId} style={S.destSearchRow} onPress={() => handleRemote(s)} activeOpacity={0.82}>
                    <View style={S.destSearchIcon}>
                      <IconMapPin size={16} color1={D.primary} color2="#0D47A1" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={S.destSearchTitle}>{s.primaryText}</Text>
                      <Text style={S.destSearchMeta}>{s.secondaryText || s.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* No results — offer geocoding fallback */}
            {!showHistory && !isSearching && remoteSuggestions.length === 0 && !error && (
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 12 }}>
                <Text style={{ fontSize: 13, color: D.textMuted }}>
                  No suggestions for "{query}"
                </Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: D.primarySoft,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: D.primaryMid,
                  }}
                  onPress={async () => {
                    await onUseAsAddress(query);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="map-search" size={16} color={D.primary} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: D.primary }}>
                    Use "{query}" as address
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  useScreenFocusTracking('Home');
  const navigation = useNavigation<MainTabNavProp>();
  const tabBarHeight = useBottomTabBarHeight();
  const {
    destination, customDestination, pickupPoint, setDestination, setCustomDestination, setPickupPoint,
    setPartner, setStatus, requestStates,
    setRequestState, clearRequestState, triggerRouteSearch,
    vehicleType, setVehicleType,
  } = useRideStore();

  // শুধু completed ride এর পরে destination reset করো — normal navigation এ না
  useFocusEffect(
    useCallback(() => {
      const { status } = useRideStore.getState();
      if (status === 'completed') {
        setDestination('');
        setCustomDestination(null);
        setWaypoints([
          { id: 'from', label: '', type: 'pickup' },
          { id: 'to_0', label: '', type: 'destination' },
        ]);
      }
    }, [setDestination, setCustomDestination])
  );

  // Smart default: auto-set "My current location" as pickup on first mount
  // if user hasn't picked anything yet — saves a tap on every fresh session.
  useEffect(() => {
    if (!pickupPoint) {
      setPickupPoint(MY_LOCATION_PICKUP_ID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lat = useLocationStore((s) => s.latitude);
  const lng = useLocationStore((s) => s.longitude);
  const setLocation = useLocationStore((s) => s.setLocation);
  // Route state
  const [waypoints, setWaypoints] = useState<WayPoint[]>([
    { id: 'from', label: '', type: 'pickup' },
    { id: 'to_0', label: '', type: 'destination' },
  ]);

  const { user: storeUser } = useAuthStore();
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; accuracy?: number; address?: string } | null>(null);
  const [currentLocationLabel, setCurrentLocationLabel] = useState('My current location');
  const [isResolvingCurrentLocation, setIsResolvingCurrentLocation] = useState(false);
  const [elevated, setElevated] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showDestModal, setShowDestModal] = useState(false);
  const [activeDestIdx, setActiveDestIdx] = useState(1);
  const [partnerDistances, setPartnerDistances] = useState<Record<string, DistanceMatrixResult>>({});
  const [hasSearchedPassengers, setHasSearchedPassengers] = useState(false);

  // ── New Google API state
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const [trafficLabel, setTrafficLabel] = useState<string | null>(null);
  const [customFareInput, setCustomFareInput] = useState('');
  const [vehicleOpen, setVehicleOpen] = useState(false);

  const [pendingPartner, setPendingPartner] = useState<VisiblePartner | null>(null);
  const [frequentPickups, setFrequentPickups] = useState<PickupHistoryEntry[]>([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 60], outputRange: [1, 0.85], extrapolate: 'clamp' });

  const selectedPickup = pickupPoint ?? '';
  const selectedPickupDetails = useMemo(() => {
    if (selectedPickup === MY_LOCATION_PICKUP_ID) {
      return currentLocation
        ? {
          id: MY_LOCATION_PICKUP_ID,
          name: currentLocationLabel,
          nameBn: 'Live location',
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        }
        : null;
    }
    if (!selectedPickup) return null;
    return getPickupPointById(selectedPickup) ?? null;
  }, [currentLocation, currentLocationLabel, selectedPickup]);
  const selectedPickupLabel = useMemo(
    () =>
      selectedPickup === MY_LOCATION_PICKUP_ID
        ? currentLocationLabel
        : selectedPickupDetails?.name ?? '',
    [currentLocationLabel, selectedPickup, selectedPickupDetails]
  );
  const selectedDestDetails = useMemo(
    () =>
      customDestination
        ? {
          id: customDestination.id,
          name: customDestination.name,
          lat: customDestination.lat,
          lng: customDestination.lng,
          baseFare: 0,
          estimatedTime: 0,
        }
        : DESTINATIONS.find(d => d.id === destination),
    [customDestination, destination]
  );

  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  useEffect(() => {
    // Refresh immediately on mount in case state init ran at different time
    setCurrentHour(new Date().getHours());
    const msUntilNextHour = (60 - new Date().getMinutes()) * 60 * 1000 - new Date().getSeconds() * 1000;
    const timer = setTimeout(() => {
      setCurrentHour(new Date().getHours());
    }, msUntilNextHour);
    return () => clearTimeout(timer);
  }, []);
  const timeCtx = useMemo(() => getTimeContext(currentHour), [currentHour]);
  const greeting = useMemo(() => getGreeting(currentHour), [currentHour]);
  useNearbyRiders(destination, LIVE_PARTNER_FEED_ENABLED && !!destination);
  const { nearbyRiders } = useRideStore();

  // Sync route card FROM label — only when user has explicitly chosen a pickup
  useEffect(() => {
    if (!selectedPickup) return;
    setWaypoints(prev => {
      const copy = [...prev];
      copy[0] = { ...copy[0], label: selectedPickupLabel };
      return copy;
    });
  }, [selectedPickup, selectedPickupLabel]);

  // Sync TO label from store
  useEffect(() => {
    if (selectedDestDetails) {
      setWaypoints(prev => {
        const copy = [...prev];
        const toIdx = copy.findIndex(w => w.type === 'destination');
        if (toIdx !== -1) copy[toIdx] = { ...copy[toIdx], label: selectedDestDetails.name };
        return copy;
      });
    }
  }, [selectedDestDetails]);

  useEffect(() => {
    setHasSearchedPassengers(false);
  }, [selectedPickupDetails, selectedDestDetails]);

  // ── Google Routes API: fetch optimised route when pickup + destination set ──
  useEffect(() => {
    const origin =
      selectedPickup === MY_LOCATION_PICKUP_ID
        ? currentLocation
          ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
          : null
        : selectedPickupDetails;

    if (!origin || !selectedDestDetails) {
      setRouteInfo(null);
      return;
    }
    let cancelled = false;
    const fetchRoute = async () => {
      try {
        setIsFetchingRoute(true);
        // Routes API — preferred over Directions for richer traffic + polyline data
        const result = await routesService.computeRoute({
          origin: {
            location: {
              latLng: {
                latitude: origin.lat,
                longitude: origin.lng,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: selectedDestDetails.lat,
                longitude: selectedDestDetails.lng,
              },
            },
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: false,
          extraComputations: ['TRAFFIC_ON_POLYLINE'],
        });
        if (!cancelled && result) {
          setRouteInfo({
            distanceMeters: result.distanceMeters,
            durationSeconds: result.duration,
            polyline: result.polyline?.encodedPolyline,
            trafficCondition: result.travelAdvisory?.speedReadingIntervals?.[0]?.speed ?? 'NORMAL',
          });
          const trafficSpeed = result.travelAdvisory?.speedReadingIntervals?.[0]?.speed;
          if (trafficSpeed === 'TRAFFIC_JAM') setTrafficLabel('Heavy traffic');
          else if (trafficSpeed === 'SLOW') setTrafficLabel('Slow traffic');
          else setTrafficLabel(null);
        }
      } catch (e) {
        // Fallback: Directions API
        try {
          const directions = await directionsService.getDirections({
            origin: `${origin.lat},${origin.lng}`,
            destination: `${selectedDestDetails.lat},${selectedDestDetails.lng}`,
            mode: 'driving',
            departureTime: 'now',
            trafficModel: 'best_guess',
          });
          if (!cancelled && directions?.routes?.[0]) {
            const leg = directions.routes[0].legs[0];
            setRouteInfo({
              distanceMeters: leg.distance.value,
              durationSeconds: leg.duration.value,
              steps: leg.steps.map((s: any) => ({
                instruction: s.html_instructions.replace(/<[^>]+>/g, ''),
                distanceMeters: s.distance.value,
                durationSeconds: s.duration.value,
              })),
            });
          }
        } catch (_) {
          setRouteInfo(null);
        }
      } finally {
        if (!cancelled) setIsFetchingRoute(false);
      }
    };
    fetchRoute();
    return () => { cancelled = true; };
  }, [currentLocation, selectedPickup, selectedPickupDetails, selectedDestDetails]);

  // ── Distance Matrix API: batch compute distances for all visible partners ──
  useEffect(() => {
    if (!currentLocation || !destination || nearbyRiders.length === 0) return;
    let cancelled = false;

    const fetchDistances = async () => {
      try {
        const origins = [`${currentLocation.latitude},${currentLocation.longitude}`];

        // Only include riders that have valid GPS coordinates.
        // Previously, missing lat/lng fell back to the user's own pickup coords,
        // giving wrong distances — e.g. a rider 500m away appearing as 0m.
        const validRiders = nearbyRiders
          .filter(r => r.lat && r.lng)
          .slice(0, 10);

        if (validRiders.length === 0) return;

        const destinations = validRiders.map(r => `${r.lat},${r.lng}`);

        // Distance Matrix API — get walking distances from current user to each rider
        const matrix = await distanceMatrixService.getMatrix({
          origins,
          destinations,
          mode: 'walking',
          units: 'metric',
          departureTime: 'now',
          trafficModel: 'pessimistic',
        });

        const elements = matrix?.rows?.[0]?.elements ?? [];

        if (!cancelled && elements.length > 0) {
          const updates: Record<string, DistanceMatrixResult> = {};
          elements.forEach((el: any, i: number) => {
            const rider = validRiders[i];
            if (!rider || el.status !== 'OK') return;
            updates[rider.uid] = {
              distanceMeters: el.distance?.value ?? 0,
              durationSeconds: el.duration?.value ?? 0,
              durationInTrafficSeconds: el.duration_in_traffic?.value,
            };
          });
          setPartnerDistances(prev => ({ ...prev, ...updates }));
        }
      } catch (_) {
        return;
      }
    };

    fetchDistances();
    return () => { cancelled = true; };
  }, [currentLocation, destination, nearbyRiders, selectedPickupDetails]);

  const visiblePartners = useMemo(() => {
    if (!destination) return [];
    const base = nearbyRiders.length > 0 ? nearbyRiders : [];
    return base
      .filter(r =>
        // isMatch already guarantees: same destination + within radius
        // r.destination === destination alone is NOT enough — pickup point must also match
        // otherwise riders from different pickup points appear as valid partners
        r.isMatch || r.destination === destination
      )
      .map((r): VisiblePartner => {
        const api = partnerDistances[r.uid];
        return {
          id: r.uid,
          name: r.name,
          rating: r.rating,
          badge: r.badge,
          destination: r.destination,
          destinationName: DESTINATIONS.find(d => d.id === r.destination)?.name ?? r.destination,
          pickupPoint: r.pickupPoint,
          splitFare: Math.ceil(getFare(selectedPickup, r.destination) / 2),
          distanceMeters: api?.distanceMeters ?? r.distance ?? 0,
          etaMinutes: api?.durationInTrafficSeconds
            ? Math.max(1, Math.round(api.durationInTrafficSeconds / 60))
            : api?.durationSeconds
              ? Math.max(1, Math.round(api.durationSeconds / 60))
              : 2,
          matchScore: Math.min(100, Math.max(0, Math.round(
            70 +
            (r.rating - 3) * 10 +
            (r.isMatch ? 20 : 0) +
            (r.pickupPoint === selectedPickupLabel ? 10 : 0)
          ))),
          lat: r.lat,
          lng: r.lng,
          isMatch: r.isMatch,
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [destination, nearbyRiders, partnerDistances, selectedPickup, selectedPickupLabel]);

  const refreshExactCurrentLocation = useCallback(async () => {
    setIsResolvingCurrentLocation(true);
    try {
      const ok = await locationService.requestPermissions();
      if (!ok) {
        Alert.alert('Location permission needed', 'Allow location access so we can map your exact current route.');
        return null;
      }

      const loc = await locationService.getFreshCurrentLocation({
        maxAccuracyMeters: 50,
        timeoutMs: 6000,
      });

      if (!loc) {
        Alert.alert('Location unavailable', 'We could not get your live location. Please turn on GPS and try again.');
        return null;
      }

      setCurrentLocation(loc);
      setLocation(
        loc.latitude,
        loc.longitude,
        loc.accuracy,
        sanitizeSpeedKmh(loc.speedMps, loc.accuracy)
      );

      const address = await locationService.reverseGeocode(loc.latitude, loc.longitude);
      if (address?.trim()) {
        setCurrentLocationLabel(address);
        loc.address = address;
      } else {
        loc.address = 'My current location';
        setCurrentLocationLabel('My current location');
      }

      // Low accuracy is silently accepted on background load — only warn when user explicitly taps GPS

      return loc;
    } catch {
      Alert.alert('Location error', 'We could not refresh your exact location right now. Please try again.');
      return null;
    } finally {
      setIsResolvingCurrentLocation(false);
    }
  }, [setLocation]);

  // Derive user name — rerun whenever store or auth user updates
  // Hide if it looks like a student ID / number-only string (data quality fallback)
  const userName = useMemo(() => {
    const raw = storeUser?.name?.trim() || auth.currentUser?.displayName?.trim() || '';
    if (!raw) return '';
    // If "name" looks like an ID (digits + dashes only), don't show it
    if (/^[\d\s-]+$/.test(raw)) return '';
    return raw.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }, [storeUser?.name, auth.currentUser?.displayName]);

  useEffect(() => {

    // Smart FROM default: most-used pickup point (AIUB campus points only, not GPS)
    getMostUsedPickup().then((top) => {
      if (top && !pickupPoint && top.id !== MY_LOCATION_PICKUP_ID) {
        setPickupPoint(top.id);
        setWaypoints(prev => {
          const copy = [...prev];
          copy[0] = { ...copy[0], label: top.name };
          return copy;
        });
      }
    }).catch(() => { });

    // Smart TO default: intentionally disabled — user must pick destination each session

    // Load frequent pickups for PickupModal suggestion list
    getFrequentPickups(5).then(setFrequentPickups).catch(() => { });

    // GPS runs silently in background — does NOT auto-set FROM
    void refreshExactCurrentLocation().catch(() => setCurrentLocation(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshExactCurrentLocation]);

  // Real-time notifications subscription
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, type: '', read: false, ...d.data() } as AppNotification));
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.read).length);
    }, () => { });
    return unsub;
  }, []);

  // Handlers
  const handleSwap = () => {
    setWaypoints(prev => {
      const copy = [...prev];
      const tmp = copy[0].label;
      copy[0] = { ...copy[0], label: copy[copy.length - 1].label };
      copy[copy.length - 1] = { ...copy[copy.length - 1], label: tmp };
      return copy;
    });
  };

  const handleAddStop = () => {
    setWaypoints(prev => {
      const last = prev[prev.length - 1];
      const stops = prev.slice(1, -1);
      return [
        prev[0],
        ...stops,
        { id: `stop_${Date.now()}`, label: '', type: 'stop' },
        last,
      ];
    });
  };

  const handleRemoveStop = (idx: number) => {
    setWaypoints(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDestSelect = (item: RouteDestination) => {
    setCustomDestination(null);
    setDestination(item.id);
    setWaypoints(prev => {
      const copy = [...prev];
      copy[activeDestIdx] = { ...copy[activeDestIdx], label: item.name };
      return copy;
    });
    recordSearch({ id: item.id, name: item.name }).catch(() => { });
  };

  const handleCustomHistorySelect = (entry: SearchEntry) => {
    const customId = entry.id.startsWith('custom_') ? entry.id : `custom_${entry.id}`;
    setCustomDestination({
      id: customId,
      name: entry.name,
      lat: entry.lat!,
      lng: entry.lng!,
      placeId: entry.placeId,
    });
    setDestination(customId);
    setWaypoints(prev => {
      const copy = [...prev];
      copy[activeDestIdx] = { ...copy[activeDestIdx], label: entry.name };
      return copy;
    });
  };

  const handleUseAsAddress = async (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;
    try {
      const result = await geocodingService.geocode(text);
      if (!result) {
        Alert.alert('Address not found', `Could not locate "${text}". Please check spelling.`);
        return;
      }
      const customId = `geo_${result.placeId || Date.now()}`;
      setCustomDestination({
        id: customId,
        name: text,
        lat: result.latitude,
        lng: result.longitude,
        placeId: result.placeId,
        address: result.formattedAddress,
      });
      setDestination(customId);
      setWaypoints(prev => {
        const copy = [...prev];
        copy[activeDestIdx] = { ...copy[activeDestIdx], label: text };
        return copy;
      });
      recordSearch({
        id: customId,
        name: text,
        lat: result.latitude,
        lng: result.longitude,
        placeId: result.placeId,
      }).catch(() => { });
    } catch {
      Alert.alert('Geocoding failed', 'Could not look up that address. Try again.');
    }
  };

  const handleSuggestionSelect = async (item: PlaceSuggestion) => {
    try {
      const details = await placesService.getPlaceDetails({ placeId: item.placeId });
      const customId = `custom_${details.placeId}`;

      setCustomDestination({
        id: customId,
        name: details.name,
        lat: details.latitude,
        lng: details.longitude,
        placeId: details.placeId,
        address: details.address,
      });
      setDestination(customId);
      setWaypoints(prev => {
        const copy = [...prev];
        copy[activeDestIdx] = { ...copy[activeDestIdx], label: details.name };
        return copy;
      });
      recordSearch({
        id: customId,
        name: details.name,
        lat: details.latitude,
        lng: details.longitude,
        placeId: details.placeId,
      }).catch(() => { });
    } catch {
      Alert.alert('Destination error', 'We could not lock the exact destination point. Please choose again.');
    }
  };

  const handlePassengerSearch = async () => {
    let livePickupDetails = selectedPickupDetails;

    if (selectedPickup === MY_LOCATION_PICKUP_ID) {
      const freshLocation = await refreshExactCurrentLocation();
      if (!freshLocation) {
        return;
      }

      livePickupDetails = {
        id: MY_LOCATION_PICKUP_ID,
        name: freshLocation.address ?? currentLocationLabel,
        nameBn: 'Live location',
        lat: freshLocation.latitude,
        lng: freshLocation.longitude,
      };
    }

    if (!livePickupDetails) {
      Alert.alert('Select pickup point', 'Tap the FROM field to choose where you\'re boarding from.');
      return;
    }
    if (!selectedDestDetails) {
      Alert.alert('Select destination', 'Tap the TO field to choose where you\'re going.');
      return;
    }

    setPickupPoint(selectedPickup);
    setDestination(selectedDestDetails.id);
    setVehicleType(vehicleType);
    triggerRouteSearch();
    setHasSearchedPassengers(true);
    navigation.navigate('Map');
  };

  const handlePostLater = () => {
    navigation.navigate('Board');
  };

  const buildRiderPayload = (partner: VisiblePartner): import('@/types/ride.types').NearbyRider => ({
    uid: partner.id,
    name: partner.name,
    distance: partner.distanceMeters,
    destination: partner.destination,
    pickupPoint: selectedPickupLabel,
    rating: partner.rating,
    badge: partner.badge,
    lat: partner.lat ?? currentLocation?.latitude ?? selectedPickupDetails?.lat ?? 23.7749,
    lng: partner.lng ?? currentLocation?.longitude ?? selectedPickupDetails?.lng ?? 90.3990,
    isMatch: destination === partner.destination,
  });

  const handleRequest = (partner: VisiblePartner) => {
    setPartner(buildRiderPayload(partner));
    setStatus('waiting');
    setRequestState(partner.id, 'pending');
    setPendingPartner(partner);
  };

  const handleChat = (partner: VisiblePartner) => {
    setPartner(buildRiderPayload(partner));
    setStatus('matched');
    setRequestState(partner.id, 'confirmed');
    setPendingPartner(null);
    navigation.navigate('Chat', { rider: buildRiderPayload(partner), partnerName: partner.name });
  };

  // ── Route info strip label
  const routeEtaLabel = routeInfo
    ? `${Math.max(1, Math.round(routeInfo.durationSeconds / 60))} min | ${(routeInfo.distanceMeters / 1000).toFixed(1)} km`
    : null;

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={D.bg} />

      {/* Top route strip removed — same ETA is already shown in the middle
          route card (line ~SearchBar area) and the bottom "Live map" button
          covers the navigation case. Duplicate was confusing in screenshots. */}

      <ScrollView
        style={S.scroll}
        contentContainerStyle={[S.scrollContent, { paddingBottom: 180 }]}
        showsVerticalScrollIndicator={false}
        onScroll={e => setElevated(e.nativeEvent.contentOffset.y > 8)}
        scrollEventThrottle={16}
      >
        {/* Header greeting */}
        <Animated.View style={[S.header, { opacity: headerOpacity }]}>
          {/* Left — greeting block */}
          <View style={{ flex: 1 }}>
            {/* Row 1: "Good morning 👋" — big */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={S.greetingLine}>{greeting}</Text>
              <IconWave size={20} />
            </View>
            {/* Row 2: Name — small muted */}
            <Text style={S.greetingName}>{userName}</Text>
            {/* Row 3: Time context label only — no sub */}
            <View style={S.timeCtxRow}>
              <View style={S.timeCtxIconSm}>{timeCtx.icon}</View>
              <Text style={S.timeCtxText}>{timeCtx.label}</Text>
            </View>
          </View>

          {/* Right — bell + LIVE below */}
          <View style={S.headerRight}>
            <TouchableOpacity
              style={S.bellBtn}
              activeOpacity={0.8}
              onPress={() => {
                setShowNotifModal(true);
                notifications.filter((n) => !n.read).forEach((n) => {
                  updateDoc(doc(db, 'notifications', n.id), { read: true }).catch(() => { });
                });
                setUnreadCount(0);
              }}
            >
              <IconBell size={20} />
              {unreadCount > 0 && (
                <View style={S.notifBadge}>
                  <Text style={S.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={S.livePillInline}>
              <LiveDot />
              <Text style={S.liveTextInline}>LIVE</Text>
            </View>
          </View>
        </Animated.View>

        <RouteCard
          waypoints={waypoints}
          elevated={elevated}
          onFromPress={() => setShowPickupModal(true)}
          onToPress={(idx) => { setActiveDestIdx(idx); setShowDestModal(true); }}
          onAddStop={handleAddStop}
          onSwap={handleSwap}
          onRemoveStop={handleRemoveStop}
        />

        {/* ── ETA strip — only when destination selected ── */}
        {selectedDestDetails && routeInfo && (
          <View style={S.etaStrip}>
            <MaterialCommunityIcons name="clock-fast" size={15} color="#14B8A6" />
            <Text style={S.etaText}>
              {Math.max(1, Math.round(routeInfo.durationSeconds / 60))} min
              {' · '}
              {(routeInfo.distanceMeters / 1000).toFixed(1)} km
            </Text>
            {trafficLabel && (
              <View style={S.trafficBadge}>
                <Text style={S.trafficBadgeText}>{trafficLabel}</Text>
              </View>
            )}
            {isFetchingRoute && <ActivityIndicator size={12} color="#14B8A6" style={{ marginLeft: 4 }} />}
          </View>
        )}

        {/* ── Vehicle + Fare + Search ── */}
        {(() => {
          const cfg = VEHICLE_CONFIG[vehicleType];
          const baseFare = selectedDestDetails
            ? getFare(selectedPickup, selectedDestDetails.id)
            : null;
          const suggestedTotal = baseFare
            ? Math.ceil(baseFare * cfg.fareMultiplier)
            : null;
          const splitFare = customFareInput
            ? Math.ceil(parseInt(customFareInput, 10) / 2)
            : suggestedTotal ? Math.ceil(suggestedTotal / 2) : null;

          return (
            <View style={S.bottomFlow}>
              {/* Vehicle selector pill */}
              <TouchableOpacity
                style={S.vehicleSelectedPill}
                activeOpacity={0.85}
                onPress={() => setVehicleOpen(o => !o)}
              >
                <View style={S.vehicleSelectedLeft}>
                  <View style={S.vehicleIconWrap}>
                    <PremiumVehicleArt type={vehicleType} size={36} active />
                  </View>
                  <View>
                    <Text style={S.vehicleSelectedName}>{cfg.label}</Text>
                    <Text style={S.vehicleSelectedDesc}>{cfg.description}</Text>
                  </View>
                </View>
                <View style={S.vehicleSelectedRight}>
                  {splitFare && (
                    <Text style={S.vehicleSelectedFare}>৳{splitFare}/person</Text>
                  )}
                  <MaterialCommunityIcons
                    name={vehicleOpen ? 'chevron-up' : 'chevron-down'}
                    size={20} color="#555"
                  />
                </View>
              </TouchableOpacity>

              {/* Expanded vehicle options */}
              {vehicleOpen && (
                <View style={S.vehicleOptionList}>
                  {(Object.keys(VEHICLE_CONFIG) as VehicleType[]).filter(v => v !== vehicleType).map((v) => {
                    const vc = VEHICLE_CONFIG[v];
                    const active = vehicleType === v;
                    const optTotal = baseFare ? Math.ceil(baseFare * vc.fareMultiplier) : null;
                    return (
                      <TouchableOpacity
                        key={v}
                        style={[S.vehicleOptionRow, active && S.vehicleOptionRowActive]}
                        activeOpacity={0.8}
                        onPress={() => { setVehicleType(v); setVehicleOpen(false); setCustomFareInput(''); }}
                      >
                        <View style={S.vehicleOptionIconWrap}>
                          <PremiumVehicleArt type={v} size={40} active={active} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[S.vehicleOptionName, active && { color: '#6366F1' }]}>{vc.label}</Text>
                          <Text style={S.vehicleOptionDesc}>{vc.description}</Text>
                        </View>
                        {optTotal ? (
                          <View>
                            <Text style={[S.vehicleOptionFare, active && { color: '#6366F1' }]}>
                              ৳{Math.ceil(optTotal / 2)}
                            </Text>
                            <Text style={S.vehicleOptionFareSub}>per person</Text>
                          </View>
                        ) : null}
                        {active && (
                          <MaterialCommunityIcons name="check-circle" size={20} color="#6366F1" style={{ marginLeft: 10 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Fare input — only when destination selected */}
              {selectedDestDetails ? (
                <View style={S.fareInputWrap}>
                  <Text style={S.farePrefix}>৳</Text>
                  <TextInput
                    style={S.fareInput}
                    value={customFareInput}
                    onChangeText={(t) => setCustomFareInput(t.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    placeholder={suggestedTotal ? String(suggestedTotal) : '0'}
                    placeholderTextColor="#B0AACC"
                    maxLength={4}
                    returnKeyType="done"
                  />
                  <Text style={S.fareSuffix}>total</Text>
                  {splitFare ? (
                    <View style={S.farePill}>
                      <Text style={S.farePillText}>৳{splitFare} split</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                /* No destination — show prompt instead of empty fare box */
                <View style={S.fareEmptyHint}>
                  <MaterialCommunityIcons name="map-marker-outline" size={16} color="#9896A8" />
                  <Text style={S.fareEmptyHintText}>Select a destination to set fare</Text>
                </View>
              )}

              {/* Find riders button */}
              <TouchableOpacity
                style={S.searchPassengersBtn}
                activeOpacity={0.88}
                onPress={() => { void handlePassengerSearch(); }}
              >
                <MaterialCommunityIcons name="account-search-outline" size={20} color="#FFF" />
                <Text style={S.searchPassengersText}>Find riders going my way</Text>
              </TouchableOpacity>

              {/* Secondary actions */}
              <View style={S.secondaryRow}>
                <TouchableOpacity style={S.secondaryBtn} activeOpacity={0.8} onPress={handlePostLater}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color="#1A1A2E" />
                  <Text style={S.secondaryBtnText}>Post for later</Text>
                </TouchableOpacity>
                <View style={S.secondaryDivider} />
                <TouchableOpacity style={S.secondaryBtn} activeOpacity={0.8} onPress={() => navigation.navigate('Map')}>
                  <MaterialCommunityIcons name="map-outline" size={16} color="#1A1A2E" />
                  <Text style={S.secondaryBtnText}>Live map</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}




        {/* Live partner feed — show as soon as destination selected */}
        {LIVE_PARTNER_FEED_ENABLED && selectedDestDetails ? (
          <View style={S.section}>
            <View style={S.sectionHeader}>
              <View>
                <Text style={S.sectionTitle}>People on this route</Text>
                <Text style={S.sectionSub}>
                  From {selectedPickupLabel} to {selectedDestDetails.name}
                </Text>
              </View>
              <View style={S.liveCountBadge}>
                <LiveDot />
                <Text style={S.liveCountText}>{visiblePartners.length} live</Text>
              </View>
            </View>

            {visiblePartners.length === 0 ? (
              <View style={S.emptyState}>
                <MaterialCommunityIcons name="account-search-outline" size={40} color={D.border} />
                <Text style={S.emptyTitle}>No one found on this route yet</Text>
                <Text style={S.emptySub}>When someone is going from this pickup to this destination, you can request or chat here.</Text>
              </View>
            ) : (
              visiblePartners.map(p => (
                <PartnerCard
                  key={p.id}
                  partner={p}
                  requestState={requestStates[p.id] ?? 'idle'}
                  onRequest={() =>
                    (requestStates[p.id] ?? 'idle') === 'confirmed'
                      ? handleChat(p)
                      : handleRequest(p)
                  }
                  onChat={() => handleChat(p)}
                />
              ))
            )}

            <TouchableOpacity
              style={S.postRideBtn}
              activeOpacity={0.82}
              onPress={handlePostLater}
            >
              <MaterialCommunityIcons name="plus" size={18} color={D.primary} />
              <Text style={S.postRideText}>Post for 20/30 minutes later</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Modals */}
      <PickupModal
        visible={showPickupModal}
        selected={selectedPickup}
        currentLocation={currentLocation ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude } : null}
        currentLocationLabel={currentLocationLabel}
        frequentPickups={frequentPickups}
        onSelect={(id) => {
          setPickupPoint(id);
          const pt = getPickupPointById(id);
          const label = id === MY_LOCATION_PICKUP_ID ? currentLocationLabel : pt?.name ?? '';
          setWaypoints(prev => {
            const copy = [...prev];
            copy[0] = { ...copy[0], label };
            return copy;
          });
          // Only record fixed AIUB pickup points — never save GPS location to history
          if (id !== MY_LOCATION_PICKUP_ID && pt) {
            recordPickupUsage({
              id,
              name: pt.name,
              nameBn: pt.nameBn,
              lat: pt.lat,
              lng: pt.lng,
            }).then(() => getFrequentPickups(5).then(setFrequentPickups)).catch(() => { });
          }
        }}
        onSelectGPS={async () => {
          // Fresh GPS fetch — runs when user taps "My current location"
          const loc = await refreshExactCurrentLocation();
          if (!loc) return;
          const freshLabel = loc.address ?? currentLocationLabel;
          setPickupPoint(MY_LOCATION_PICKUP_ID);
          setWaypoints(prev => {
            const copy = [...prev];
            copy[0] = { ...copy[0], label: freshLabel };
            return copy;
          });
        }}
        onClose={() => setShowPickupModal(false)}
      />

      <DestinationModal
        visible={showDestModal}
        onClose={() => setShowDestModal(false)}
        onSelect={handleDestSelect}
        onSelectSuggestion={handleSuggestionSelect}
        onSelectCustomHistory={handleCustomHistorySelect}
        onUseAsAddress={handleUseAsAddress}
        currentLocation={currentLocation}
      />

      {/* Request confirmation sheet */}
      <Modal
        visible={!!pendingPartner}
        transparent
        animationType="slide"
        onRequestClose={() => { if (pendingPartner) clearRequestState(pendingPartner.id); setPendingPartner(null); }}
      >
        <View style={S.modalOverlay}>
          <TouchableOpacity
            style={S.modalBackdrop}
            activeOpacity={1}
            onPress={() => { if (pendingPartner) clearRequestState(pendingPartner.id); setPendingPartner(null); }}
          />
          <View style={S.modalSheet}>
            <View style={S.modalHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <View style={[S.partnerAvatar, { width: 52, height: 52, borderRadius: 26 }]}>
                <Text style={[S.partnerAvatarText, { fontSize: 22 }]}>{pendingPartner?.name?.charAt(0)}</Text>
              </View>
              <View>
                <Text style={S.modalTitle}>{pendingPartner?.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <IconStar size={11} />
                  <Text style={S.modalSub}> {pendingPartner?.rating?.toFixed(1)}</Text>
                </View>
              </View>
            </View>

            <View style={S.confirmCard}>
              <View style={S.confirmRow}>
                <IconNavigation size={15} />
                <Text style={S.confirmLabel}>Going to</Text>
                <Text style={S.confirmVal}>{pendingPartner?.destinationName ?? 'Route'}</Text>
              </View>
              <View style={S.confirmRow}>
                <IconClock size={15} />
                <Text style={S.confirmLabel}>ETA meetup</Text>
                <Text style={S.confirmVal}>{pendingPartner?.etaMinutes ?? '--'} min</Text>
              </View>
              {routeInfo && (
                <View style={S.confirmRow}>
                  <MaterialCommunityIcons name="road-variant" size={15} color={D.primary} />
                  <Text style={S.confirmLabel}>Route ETA</Text>
                  <Text style={S.confirmVal}>
                    {Math.max(1, Math.round(routeInfo.durationSeconds / 60))} min · {(routeInfo.distanceMeters / 1000).toFixed(1)} km
                  </Text>
                </View>
              )}
              <View style={S.confirmRow}>
                <IconCash size={15} />
                <Text style={S.confirmLabel}>Split fare</Text>
                <Text style={[S.confirmVal, { color: D.green }]}>
                  BDT {pendingPartner ? getSplitFare(selectedPickup, pendingPartner.destination, 2) : '--'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={S.primaryBtn}
              activeOpacity={0.85}
              onPress={() => pendingPartner && handleChat(pendingPartner)}
            >
              <MaterialCommunityIcons name="message-text-outline" size={18} color="#FFF" />
              <Text style={S.primaryBtnText}>Continue to chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={S.modalSecondaryBtn}
              activeOpacity={0.85}
              onPress={() => { setPendingPartner(null); navigation.navigate('Map'); }}
            >
              <MaterialCommunityIcons name="map-outline" size={18} color={D.text} />
              <Text style={S.modalSecondaryBtnText}>Open live map</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Notifications sheet ── */}
      <Modal visible={showNotifModal} transparent animationType="slide" onRequestClose={() => setShowNotifModal(false)}>
        <View style={S.modalOverlay}>
          <TouchableOpacity style={S.modalBackdrop} activeOpacity={1} onPress={() => setShowNotifModal(false)} />
          <View style={[S.modalSheet, { backgroundColor: '#0C1128', maxHeight: '80%' }]}>
            <View style={[S.modalHandle, { backgroundColor: 'rgba(192,132,252,0.3)' }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#EEF2FF', letterSpacing: -0.3 }}>Notifications</Text>
              {notifications.length > 0 && (
                <TouchableOpacity onPress={() => {
                  notifications.forEach((n) => updateDoc(doc(db, 'notifications', n.id), { read: true }).catch(() => { }));
                }} activeOpacity={0.7}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#C084FC' }}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>
            {notifications.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <PremiumIcon name="bell-ring-outline" size={22} tone="violet" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#EEF2FF', marginTop: 12 }}>No notifications yet</Text>
                <Text style={{ fontSize: 12, color: '#6B7A99', marginTop: 6, textAlign: 'center' }}>
                  You'll get notified when someone joins your ride post
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {notifications.map((n) => (
                  <View key={n.id} style={{
                    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                    backgroundColor: n.read ? 'rgba(255,255,255,0.03)' : 'rgba(192,132,252,0.08)',
                    borderRadius: 14, padding: 14, marginBottom: 8,
                    borderWidth: 1, borderColor: n.read ? 'rgba(255,255,255,0.06)' : 'rgba(192,132,252,0.2)',
                  }}>
                    <PremiumIcon
                      name={n.type === 'post_matched' ? 'party-popper' : n.type === 'post_joined' ? 'hand-wave-outline' : 'bell-ring-outline'}
                      size={14}
                      tone={n.type === 'post_matched' ? 'green' : n.type === 'post_joined' ? 'amber' : 'violet'}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#EEF2FF', lineHeight: 18 }}>
                        {n.message ?? 'New notification'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#6B7A99', marginTop: 4 }}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </Text>
                    </View>
                    {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#C084FC', marginTop: 4 }} />}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // ── Colors (light warm theme) ──
  // BG: #FAF8FF  Card: #FFFFFF  Border: #EDE8F5  Text: #1A1A2E  Sub: #7C7A8E

  safe: { flex: 1, backgroundColor: '#FAF8FF' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  // ── Header ──
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginTop: 8, marginBottom: 20,
  },
  greetingLine: { fontSize: 28, fontWeight: '900', color: '#1A1A2E', letterSpacing: -0.8, lineHeight: 32 },
  greetingName: { fontSize: 13, fontWeight: '500', color: '#9896A8', letterSpacing: 0.1, marginTop: 2 },
  greetingSub: { fontSize: 13, color: '#9896A8', marginTop: 3, fontWeight: '500' },

  livePillInline: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(13,148,136,0.08)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(13,148,136,0.25)',
  },
  liveTextInline: { fontSize: 9, fontWeight: '900', color: '#0D9488', letterSpacing: 1.5 },

  timeCtxRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  timeCtxIconSm: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  timeCtxText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  timeCtxDot: { fontSize: 12, color: '#C4BFDA', fontWeight: '500' },
  timeCtxSub: { fontSize: 12, color: '#9896A8', fontWeight: '400', flex: 1 },

  headerRight: { alignItems: 'center', gap: 6, marginLeft: 12 },
  bellBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#EDE8F5',
    elevation: 3,
    shadowColor: '#6366F1', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  timeCtxIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F3F0FF',
    borderWidth: 1, borderColor: '#EDE8F5',
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#EF4444', borderRadius: 9, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: '#FAF8FF',
  },
  notifBadgeText: { fontSize: 9, fontWeight: '900', color: '#FFFFFF' },

  // ── Route card ──
  routeCard: {
    marginHorizontal: 0, marginVertical: 0, marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14, paddingTop: 6, paddingBottom: 6,
    borderWidth: 1.5, borderColor: '#E8E4F8',
    elevation: 4,
    shadowColor: '#6366F1', shadowOpacity: 0.10, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  routeCardElevated: { borderColor: '#6366F1', borderWidth: 2 },
  routeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 4, gap: 12,
  },
  routeIconWrapFrom: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  routeIconWrapTo: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },
  routeIconWrapStop: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#FFFBEB',
    alignItems: 'center', justifyContent: 'center',
  },
  routeChevronWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#F8F7FF',
    alignItems: 'center', justifyContent: 'center',
  },
  routeTextWrap: { flex: 1 },
  routeLabelFrom: {
    fontSize: 10, fontWeight: '800', color: '#6366F1',
    letterSpacing: 1.4, marginBottom: 2,
  },
  routeLabelTo: {
    fontSize: 10, fontWeight: '800', color: '#EF4444',
    letterSpacing: 1.4, marginBottom: 2,
  },
  routeLabelStop: {
    fontSize: 10, fontWeight: '800', color: '#F59E0B',
    letterSpacing: 1.4, marginBottom: 2,
  },
  routeRowValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  routeRowPlaceholder: { color: '#9CA3AF', fontWeight: '500', fontSize: 14 },
  routeDividerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, marginVertical: 0, gap: 10,
  },
  routeDividerLine: {
    flex: 1, height: 1,
    backgroundColor: '#F0EDF8',
    marginLeft: 50,
  },
  routeInnerDivider: {
    height: 1, backgroundColor: '#F9F8FF', marginHorizontal: 50,
  },
  swapBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#EEF2FF', borderWidth: 1.5, borderColor: '#C7D2FE',
    alignItems: 'center', justifyContent: 'center',
  },
  addStopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 11, paddingHorizontal: 6,
    borderTopWidth: 1, borderTopColor: '#F3F0FC', marginTop: 2,
  },
  addStopText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
  searchBadge: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FECACA',
  },

  // ── Route API strip ──
  routeStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 10, backgroundColor: 'rgba(20,184,166,0.07)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.2)',
  },
  routeStripText: { fontSize: 12, fontWeight: '700', color: '#0D9488' },
  trafficBadge: {
    backgroundColor: 'rgba(244,63,94,0.1)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(244,63,94,0.2)',
  },
  trafficBadgeText: { fontSize: 11, fontWeight: '700', color: '#E11D48' },
  mapPreviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EEF0FF', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: '#D4D7FF',
  },
  mapPreviewText: { fontSize: 11, fontWeight: '700', color: '#6366F1' },

  // ── Context strip ──
  contextStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#EDE8F5',
    elevation: 2, shadowColor: '#6366F1', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  contextLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  contextSub: { fontSize: 12, color: '#9896A8', marginTop: 1 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveText: { fontSize: 10, fontWeight: '900', color: '#0D9488', letterSpacing: 1.2 },

  // ── (compat stubs) ──
  searchFlowCard: { marginBottom: 0 },
  searchFlowGlow: {}, searchFlowHeader: {}, searchFlowEyebrow: {},
  searchFlowEyebrowText: {}, searchFlowStatus: {}, searchFlowStatusText: {},
  searchFlowTitle: {}, searchFlowSub: {}, searchActionRow: {},
  postLaterBtn: {}, postLaterText: {},

  // ── Vehicle selector ──
  vehicleSelectedPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#EDE8F5',
    paddingHorizontal: 16, paddingVertical: 14,
    elevation: 2, shadowColor: '#6366F1', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  vehicleSelectedLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vehicleSelectedEmoji: { fontSize: 28 },
  vehicleIconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  vehicleSelectedName: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  vehicleSelectedDesc: { fontSize: 12, color: '#9896A8', marginTop: 2 },
  vehicleSelectedRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vehicleSelectedFare: { fontSize: 14, fontWeight: '700', color: '#6366F1' },
  vehicleOptionList: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EDE8F5',
    backgroundColor: '#FFFFFF',
    elevation: 3, shadowColor: '#6366F1', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  vehicleOptionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: '#F5F2FC',
  },
  vehicleOptionRowActive: { backgroundColor: '#F3F0FC' },
  vehicleOptionEmoji: { fontSize: 24, width: 30, textAlign: 'center' },
  vehicleOptionIconWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  vehicleOptionName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  vehicleOptionDesc: { fontSize: 12, color: '#B0AACC', marginTop: 2 },
  vehicleOptionFare: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },

  // ── Fare input ──
  fareInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#EDE8F5', paddingHorizontal: 16, height: 58,
    elevation: 2, shadowColor: '#6366F1', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  farePrefix: { fontSize: 22, fontWeight: '700', color: '#6366F1' },
  fareInput: { flex: 1, fontSize: 26, fontWeight: '800', color: '#1A1A2E' },
  fareSuffix: { fontSize: 13, color: '#B0AACC', fontWeight: '600' },
  farePill: {
    backgroundColor: '#EEF0FF', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#D4D7FF',
  },
  farePillText: { fontSize: 12, fontWeight: '700', color: '#6366F1' },
  fareHint: { fontSize: 12, color: '#0D9488', fontWeight: '600' },
  fareEmptyHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F2FC', borderRadius: 14,
    borderWidth: 1, borderColor: '#EDE8F5', paddingHorizontal: 16, height: 48,
  },
  fareEmptyHintText: { fontSize: 13, color: '#B0AACC', fontWeight: '600' },
  vehicleOptionFareSub: { fontSize: 10, color: '#B0AACC', textAlign: 'right', marginTop: 1 },

  // ── ETA strip ──
  etaStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(20,184,166,0.07)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.2)',
  },
  etaText: { fontSize: 13, fontWeight: '700', color: '#0D9488', flex: 1 },

  // ── Bottom flow ──
  bottomFlow: { gap: 10, marginBottom: 16 },
  searchPassengersBtn: {
    height: 58, backgroundColor: '#6366F1', borderRadius: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    elevation: 6, shadowColor: '#6366F1', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  searchPassengersText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  secondaryRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#EDE8F5', overflow: 'hidden',
    elevation: 1, shadowColor: '#6366F1', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  secondaryDivider: { width: 1, height: 22, backgroundColor: '#EDE8F5' },

  // ── Sections ──
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 6, letterSpacing: -0.2 },
  sectionSub: { fontSize: 13, color: '#9896A8', fontWeight: '600', letterSpacing: 0.1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  liveCountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(20,184,166,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.25)',
  },
  liveCountText: { fontSize: 12, fontWeight: '800', color: '#0D9488', letterSpacing: 0.3 },

  // ── Destination chips ──
  destChipRow: { paddingTop: 10, paddingBottom: 6, gap: 10, flexDirection: 'row', paddingHorizontal: 0 },
  destChip: {
    flexDirection: 'column', alignItems: 'flex-start',
    backgroundColor: '#FFFFFF', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#EDE8F5', minWidth: 130,
    elevation: 2, shadowColor: '#6366F1', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  destChipSelected: { borderColor: '#6366F1', backgroundColor: '#F3F0FC' },
  destChipInner: { gap: 1 },
  destChipName: { fontSize: 14, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.2 },
  destChipNameSelected: { color: '#6366F1' },
  destChipFare: { fontSize: 12, fontWeight: '700', color: '#0D9488', marginTop: 6 },
  destChipFareSelected: { color: '#6366F1' },

  // ── Partner card ──
  partnerCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#EDE8F5',
    elevation: 3, shadowColor: '#6366F1', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  partnerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  partnerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#EEF0FF', borderWidth: 2, borderColor: '#D4D7FF',
    alignItems: 'center', justifyContent: 'center',
  },
  partnerAvatarText: { fontSize: 20, fontWeight: '900', color: '#6366F1' },
  partnerName: { fontSize: 17, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.2 },
  partnerMeta: { fontSize: 12, color: '#9896A8', marginTop: 2, fontWeight: '600' },

  partnerInfoRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAF8FF', borderRadius: 14,
    padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#EDE8F5',
  },
  partnerInfoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  partnerInfoVal: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', letterSpacing: 0.2 },
  partnerInfoDivider: { width: 1, height: 18, backgroundColor: '#EDE8F5' },

  partnerDest: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FAF8FF', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12,
  },
  partnerDestText: { fontSize: 13, fontWeight: '600', color: '#4A4860' },

  partnerActions: {
    flexDirection: 'row', gap: 8,
    borderTopWidth: 1, borderTopColor: '#F3F0FC',
    paddingTop: 12, marginTop: 12,
  },
  btnRequest: {
    flex: 1, height: 44, borderRadius: 14, backgroundColor: '#6366F1',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  btnRequestText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  btnChat: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#F3F0FC', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E0D8F8',
  },
  btnChatText: { color: '#6366F1', fontSize: 12, fontWeight: '700' },

  // ── Match score badge ──
  matchBadge: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2.5, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FAF8FF',
  },
  matchNum: { fontSize: 14, fontWeight: '900', letterSpacing: -0.3 },
  matchLbl: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },

  // ── Badge chips ──
  badgeChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 4 },
  badgeElite: { backgroundColor: '#F3EEFF', borderWidth: 0.5, borderColor: '#D4B8FF' },
  badgeTrusted: { backgroundColor: '#E6FAF8', borderWidth: 0.5, borderColor: '#99E6DF' },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  badgeEliteText: { color: '#7C3AED' },
  badgeTrustedText: { color: '#0D9488' },

  // ── Modal styles ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26,26,46,0.4)', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1 },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, maxHeight: '90%',
    borderWidth: 1, borderColor: '#EDE8F5', borderBottomWidth: 0,
  },
  modalHandle: {
    width: 48, height: 5, borderRadius: 2.5,
    backgroundColor: '#E0D8F8', alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1A1A2E', marginBottom: 4, letterSpacing: -0.3 },
  modalSub: { fontSize: 13, color: '#9896A8', marginBottom: 16, fontWeight: '500' },

  // ── Pickup / Destination items ──
  pickupItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAF8FF', borderRadius: 16,
    padding: 14, marginBottom: 10, borderWidth: 1.2,
    borderColor: '#EDE8F5',
  },
  pickupItemSelected: {
    borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(99,102,241,0.08)',
  },
  pickupIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.12)', alignItems: 'center', justifyContent: 'center',
    marginRight: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
  },
  pickupName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  pickupNameBn: { fontSize: 12, color: '#9896A8', fontWeight: '500' },
  pickupItemFrequent: { borderColor: 'rgba(99,102,241,0.15)' },
  pickupSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 2, paddingBottom: 8, paddingTop: 14,
  },
  pickupSectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#9896A8', letterSpacing: 0.6, textTransform: 'uppercase',
  },
  pickupCountBadge: {
    backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
  },
  pickupCountText: { fontSize: 11, fontWeight: '800', color: '#6366F1' },

  // ── Search modal ──
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F3F4F8', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#E0D8F8',
  },
  searchInput: {
    flex: 1, color: '#1A1A2E', fontSize: 15, fontWeight: '500',
    marginHorizontal: 8, paddingVertical: 0,
  },
  modalSection: {
    fontSize: 12, fontWeight: '800', color: '#9896A8', marginBottom: 10, marginTop: 14, letterSpacing: 0.4,
  },
  destSearchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F7FC', borderRadius: 14,
    padding: 14, marginBottom: 8, borderWidth: 1,
    borderColor: '#EDE8F5',
  },
  destSearchIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.1)', alignItems: 'center', justifyContent: 'center',
    marginRight: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.18)',
  },
  destSearchTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  destSearchMeta: { fontSize: 12, color: '#6E7E99', marginTop: 2, fontWeight: '500' },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 32, marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E', marginTop: 12, letterSpacing: -0.2 },
  emptySubtitle: { fontSize: 13, color: '#6E7E99', marginTop: 4, textAlign: 'center', fontWeight: '500' },
  emptySub: { fontSize: 12, color: '#6E7E99', marginTop: 8, textAlign: 'center', fontWeight: '400', lineHeight: 18 },

  // ── Post ride button ──
  postRideBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 8, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: '#6366F1', borderRadius: 14, paddingVertical: 15,
  },
  postRideText: { fontSize: 14, fontWeight: '600', color: '#6366F1' },

  // ── Confirm card ──
  confirmCard: {
    backgroundColor: '#FAF8FF', borderRadius: 16,
    padding: 14, marginBottom: 14, gap: 10,
    borderWidth: 1, borderColor: '#EDE8F5',
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  confirmLabel: { fontSize: 13, color: '#9896A8', flex: 1, fontWeight: '500' },
  confirmVal: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },

  // ── Buttons ──
  primaryBtn: {
    height: 52, backgroundColor: '#6366F1', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 10, borderWidth: 1.5, borderColor: '#6366F1',
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  modalSecondaryBtn: {
    height: 52, backgroundColor: '#F3F4F8', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderColor: '#EDE8F5',
  },
  modalSecondaryBtnText: { color: '#1A1A2E', fontSize: 15, fontWeight: '700' },
});
