import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Avatar } from 'react-native-paper';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle as SvgCircle, G } from 'react-native-svg';

import { getDestinationById } from '@/constants/destinations';
import { getPickupPointById } from '@/constants/pickupPoints';
import directionsService from '@/services/google/directionsService';
import routesService from '@/services/google/routesService';
import { useAuthStore } from '@/store/authStore';
import { useLocationStore } from '@/store/locationStore';
import { useRideStore, VEHICLE_CONFIG, VehicleType } from '@/store/rideStore';
import locationService from '@/services/locationService';
import { RiderMatch, getSearchRadius, SAME_DESTINATION_RADIUS_M } from '@/services/firebase/matchingService';
import { calculateDistance } from '@/utils/haversine';
import { sanitizeSpeedKmh } from '@/utils/locationSpeed';

import { IconBack, IconCenter } from './components/MapIcons';
import { Speedometer } from './components/Speedometer';
import { LiveBadge } from './components/LiveBadge';
import { RiderCard } from './components/RiderCard';
import PulseRing from './components/PulseRing';
import RiderMarker from './components/RiderMarker';
import { SelectedSheet } from './components/SelectedSheet';
import { NoRidersSheet } from './components/NoRidersSheet';
import {
  safeDecodePolyline,
  matchesPickup,
  distanceToRoute,
  ZONE_LEVELS,
} from './utils/mapHelpers';
import { useScreenFocusTracking } from '@/hooks/useScreenTracking';
import { useSnappedLocation } from '@/hooks/useSnappedLocation';
import { useUIStore } from '@/store/uiStore';
import { MAP_STYLES } from '@/config/mapStyles';

const { width: SW } = Dimensions.get('window');
const MY_LOCATION_PICKUP_ID = 'current_location';

// ─── Design tokens — matches HomeScreen premium theme ─────────────────────────
const C = {
  bg: '#050816',
  card: 'rgba(12,18,38,0.96)',
  cardSolid: '#0A1022',
  cardBorder: 'rgba(255,255,255,0.07)',
  primary: '#C084FC',
  primaryLight: 'rgba(192,132,252,0.16)',
  teal: '#34D399',
  amber: '#F59E0B',
  green: '#34D399',
  red: '#FB7185',
  text: '#EEF2FF',
  textSub: '#8892A4',
  textMuted: '#4A5568',
  white: '#FFFFFF',
  routeBlue: '#818CF8',
  matchGreen: '#34D399',
  nearbyOrange: '#FB923C',
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LiveMapScreen() {
  useScreenFocusTracking('LiveMap');
  const route = useRoute<any>();
  const routeParams = route?.params as { destination?: string; pickup?: string } | undefined;
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuthStore();
  const mapStyle = useUIStore((s) => s.mapStyle);
  const rawLatitude = useLocationStore((s) => s.latitude);
  const rawLongitude = useLocationStore((s) => s.longitude);
  const accuracy = useLocationStore((s) => s.accuracy);
  const speedKmh = useLocationStore((s) => s.speedKmh);

  // Snap raw GPS to nearest road for smooth marker movement (Roads API)
  const snapped = useSnappedLocation(rawLatitude, rawLongitude);
  const latitude = snapped?.latitude ?? rawLatitude;
  const longitude = snapped?.longitude ?? rawLongitude;
  const setLocation = useLocationStore((s) => s.setLocation);
  const setTracking = useLocationStore((s) => s.setTracking);
  const { destination: storeDestination, customDestination, pickupPoint: storePickupPoint, routeSearchNonce, requestStates, vehicleType, setPartner, setStatus, setRequestState, setPresenceEnabled } = useRideStore();

  const destination = routeParams?.destination ?? storeDestination;
  const pickupPoint = routeParams?.pickup ?? storePickupPoint;

  // raw = Supabase থেকে আসা filter-না-করা rider তালিকা।
  // nearbyRiders (filter করা) এর থেকে useMemo দিয়ে বের হয় — তাই zone radius
  // বা গন্তব্য বদলালে subscription আবার না করেই list real-time re-filter হয়।
  const [rawRiders, setRawRiders] = useState<any[]>([]);
  const [selectedRider, setSelectedRider] = useState<RiderMatch | null>(null);
  const lastOfferTimeRef = useRef<Record<string, number>>({});

  // ── Smart "no riders" state
  const isFocused = useIsFocused();
  const [scanSecs, setScanSecs] = useState(0);
  const [zoneIdx, setZoneIdx] = useState(0);
  const [showNoRidersSheet, setShowNoRidersSheet] = useState(false);
  // জোন radius — Home ও Map শেয়ার করা store state।
  const zoneRadius = useRideStore(s => s.zoneRadius);
  const setZoneRadius = useRideStore(s => s.setZoneRadius);
  const [dismissed, setDismissed] = useState(false);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [selectedRiderRouteCoordinates, setSelectedRiderRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [routeSummary, setRouteSummary] = useState<{ distanceText: string; durationText: string } | null>(null);
  const [meetupRoute, setMeetupRoute] = useState<{ distanceText: string; durationText: string; summary: string } | null>(null);
  // route process (search) শেষ হলে true → map + rider list/card একসাথে দেখাই।
  // গন্তব্য না থাকলে gate লাগে না (true)। গন্তব্য থাকলে route compute শেষ না
  // হওয়া পর্যন্ত list চাপা থাকে → "আগেই list দেখাচ্ছে" সমস্যা শেষ।
  const [routeReady, setRouteReady] = useState(false);
  const mapRef = useRef<MapView>(null);
  // প্রথম GPS fix-এ একবারই center করি — পরে user যেভাবে zoom/pan করে রাখে
  // সেভাবেই থাকে (প্রতি GPS tick-এ map লাফায় না)। rider select করলেও map
  // নড়ে না — দুটোই premium/professional behaviour।
  const didInitialCenter = useRef(false);
  // user নিজে pin tap করলে true → map ওই rider-এ আলতো focus (premium zoom in)।
  // auto-select (list বদলে প্রথম rider) হলে false → map নড়ে না (লাফায় না)।
  const userTappedRider = useRef(false);
  const scanAnim = useRef(new Animated.Value(0)).current;
  // map wide (দূর থেকে) শুরু হয় → intro effect-এ smooth zoom in হয়ে user-এর
  // location-এ settle করে (cinematic establishing shot)।
  const initialRegion = useRef({
    latitude: latitude ?? 23.7749, longitude: longitude ?? 90.3990,
    latitudeDelta: 0.025, longitudeDelta: 0.025,
  }).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── Scan timer — pauses when unfocused, resumes without resetting
  useEffect(() => {
    if (!destination || dismissed || !isFocused) return;
    const interval = setInterval(() => setScanSecs(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [destination, dismissed, isFocused]);

  // Reset zone ONLY when destination value actually changes (not on remount)
  const prevDestRef = useRef<string | null>(null);
  useEffect(() => {
    if (!destination) return;
    if (destination === prevDestRef.current) return; // same dest — tab switch, do nothing
    prevDestRef.current = destination;
    setScanSecs(0);
    setZoneIdx(0);
    // zoneRadius reset করি না — ইউজারের পছন্দ (Home-এর সাথে শেয়ার) রাখি।
    setShowNoRidersSheet(false);
    setDismissed(false);
  }, [destination]);


  const hasLoc = latitude != null && longitude != null;
  const pickupDetails = pickupPoint ? getPickupPointById(pickupPoint) : null;
  const destinationDetails = useMemo(() => {
    if (customDestination) return { id: customDestination.id, name: customDestination.name, lat: customDestination.lat, lng: customDestination.lng };
    return destination ? getDestinationById(destination) : null;
  }, [customDestination, destination]);

  const routeOrigin = useMemo(() => {
    if (pickupPoint === MY_LOCATION_PICKUP_ID && hasLoc) return { lat: latitude!, lng: longitude!, label: 'My location' };
    if (pickupDetails) return { lat: pickupDetails.lat, lng: pickupDetails.lng, label: pickupDetails.name };
    if (hasLoc) return { lat: latitude!, lng: longitude!, label: 'My location' };
    return null;
  }, [hasLoc, latitude, longitude, pickupDetails, pickupPoint]);

  const mapCenter = useMemo(() => ({
    latitude: latitude ?? routeOrigin?.lat ?? 23.7749,
    longitude: longitude ?? routeOrigin?.lng ?? 90.3990,
  }), [latitude, longitude, routeOrigin?.lat, routeOrigin?.lng]);
  const gpsTier = useMemo(() => getSearchRadius(accuracy), [accuracy]);
  // জোন radius = ইউজার-নির্বাচিত (store, Home-এর সাথে শেয়ার)।
  const userAccuracyRadius = zoneRadius;
  // rider active হলে এই নামটাই DB-তে যায় (presence) → অন্যদের map-এ
  // pin-এর নিচে দেখায়। আগে এটা ছিল `customDestination?.name ?? destination`
  // — preset গন্তব্যে `destination` একটা ID (যেমন "kuril_flyover"), নাম নয়,
  // তাই preset rider-দের label খালি/অপাঠ্য থাকত (শুধু custom-search rider-দের
  // নাম দেখাত)। এখন destinationDetails.name ব্যবহার করি — custom ও preset
  // দুটোতেই পাঠযোগ্য নাম দেয়।
  const routeDestinationKey = destinationDetails?.name ?? customDestination?.name ?? destination ?? '';

  // rawRiders এখন server (PostGIS RPC) থেকে আসে — distanceM (server-হিসাবকৃত)
  // + isMatchDest (গন্তব্য ≤500m) সহ। এখানে শুধু RiderMatch shape-এ map করি
  // আর জোন চেক যোগ করি: MATCH (সবুজ) = একই গন্তব্য AND জোনের ভিতরে — দুটোই।
  // server distance ব্যবহার → Map ও Home একই সংখ্যা (125m/135m অসঙ্গতি শেষ)।
  // rawRiders/জোন বদলালে এটা আবার চলে → list real-time।
  const nearbyRiders = useMemo<RiderMatch[]>(() => {
    return rawRiders
      // valid coordinate ছাড়া rider বাদ (null/0/NaN হলে pin (0,0)-তে চলে যেত →
      // map-এ দেখা যেত না, কিন্তু count-এ থাকত → "3 match, 2 icon" সমস্যা)।
      .filter((r: any) =>
        typeof r.lat === 'number' && typeof r.lng === 'number' &&
        !Number.isNaN(r.lat) && !Number.isNaN(r.lng) &&
        Math.abs(r.lat) > 0.0001 && Math.abs(r.lng) > 0.0001)
      .map((r: any) => ({
      userId: r.id,
      name: (r.name && r.name.trim()) || 'Rider',
      distance: r.distanceM ?? 0,
      destination: (r.destination && r.destination.trim()) || '',
      pickupPoint: r.pickupPoint ?? '',
      rating: r.rating ?? 5,
      badge: r.badge ?? 'New Rider',
      vehicleType: r.vehicleType ?? 'rickshaw',
      lat: r.lat,
      lng: r.lng,
      // সবুজ MATCH = গন্তব্য মেলে (server) AND জোনের ভিতরে।
      isMatch: !!r.isMatchDest && (r.distanceM ?? 0) <= userAccuracyRadius,
    }))
    .sort((a, b) => {
      if (a.isMatch !== b.isMatch) return a.isMatch ? -1 : 1;
      return a.distance - b.distance;
    });
  }, [rawRiders, userAccuracyRadius]);

  // scan টাইমার চলাকালে rider না পেলে প্রতি 3s-এ zone বাড়াই, 15s-এ sheet দেখাই।
  useEffect(() => {
    if (dismissed || nearbyRiders.length > 0 || !destination || scanSecs === 0) return;
    if (scanSecs % 3 === 0 && zoneIdx < ZONE_LEVELS.length - 1) {
      // setZoneRadius (store) updater-এর বাইরে ডাকি — React state updater
      // function-এর ভিতরে অন্য store update করা "Cannot update component while
      // rendering" warning দেয়। তাই zoneIdx আর store দুটো আলাদা set করি।
      const next = zoneIdx + 1;
      setZoneIdx(next);
      setZoneRadius(ZONE_LEVELS[next]);
    }
    if (scanSecs >= 15) setShowNoRidersSheet(true);
  }, [scanSecs, nearbyRiders.length, destination, dismissed, zoneIdx, setZoneRadius]);

  // rider পাওয়া গেলে "no riders" sheet লুকাই।
  useEffect(() => {
    if (nearbyRiders.length > 0) setShowNoRidersSheet(false);
  }, [nearbyRiders.length]);

  // selected rider যদি আর match না করে (জোন কমালে বাইরে চলে গেছে, বা গন্তব্য
  // বদলেছে), তাহলে কার্ড বন্ধ করি — নাহলে জোনের বাইরের rider-এর কার্ড আটকে থাকে।
  useEffect(() => {
    if (!selectedRider) return;
    const fresh = nearbyRiders.find((r) => r.userId === selectedRider.userId);
    if (!fresh || !fresh.isMatch) setSelectedRider(null);
  }, [nearbyRiders, selectedRider]);

  const routeRiders = useMemo(() => nearbyRiders.filter((r) => {
    const sp = matchesPickup(r.pickupPoint, pickupPoint, routeOrigin?.label);
    const nr = routeCoordinates.length > 1 && distanceToRoute({ latitude: r.lat, longitude: r.lng }, routeCoordinates) <= 120;
    // same-destination = geo-match (r.isMatch, matchingService-এ coordinate
    // দিয়ে হিসাব করা)। আগে text compare ছিল — তাই "Merul Badda Bridge" vs
    // "Merul Badda" stats-এ 0 Match দেখাত যদিও কার্ডে MATCH ছিল।
    const sd = !destination || r.isMatch;
    return sp && (nr || sd);
  }), [destination, nearbyRiders, pickupPoint, routeCoordinates, routeOrigin?.label]);

  const sortedRiders = useMemo(() => [...nearbyRiders].sort((a, b) => {
    if (a.isMatch !== b.isMatch) return a.isMatch ? -1 : 1;
    return a.distance - b.distance;
  }), [nearbyRiders]);

  // Match = একই গন্তব্য (geo-match, ≤700m) + nearby radius-এর ভিতরে।
  // pickup point মেলার দরকার নেই — দুজন তো ইতিমধ্যে কাছাকাছি, হেঁটে মিলে
  // একসাথে যেতে পারে। তাই পুরো nearbyRiders-এর isMatch গুনি (routeRiders না,
  // কারণ routeRiders-এ pickup filter আছে → আগে count 0 দেখাত যদিও badge ছিল)।
  const matchCount = useMemo(() => nearbyRiders.filter((r) => r.isMatch).length, [nearbyRiders]);

  const prioritizedRiders = useMemo(() => {
    const ids = new Set(routeRiders.map((r) => r.userId));
    return [...routeRiders, ...sortedRiders.filter((r) => !ids.has(r.userId))];
  }, [routeRiders, sortedRiders]);

  // Location + RTDB watching
  // routeOrigin ref — getLocation fallback-এ fresh মান পড়তে। dependency-তে
  // routeOrigin?.lat/lng রাখা যাবে না: ওটা live GPS থেকে আসে, প্রতি GPS tick-এ
  // বদলায় → effect restart → GPS watch বন্ধ-চালু loop (location icon on/off
  // ঝিকঝিক করত)। ref রাখলে effect স্থির থাকে, মান তাজা থাকে।
  const routeOriginRef = useRef(routeOrigin);
  useEffect(() => { routeOriginRef.current = routeOrigin; }, [routeOrigin]);

  useEffect(() => {
    if (!user?.uid || !destination) return;
    let stopWatching: (() => void) | null = null;
    let mounted = true;

    (async () => {
      try {
        const ok = await locationService.requestPermissions();
        if (!ok) throw new Error('Permission denied');
        const cur = await locationService.getCurrentLocation();
        if (cur) {
          setLocation(
            cur.latitude,
            cur.longitude,
            cur.accuracy,
            sanitizeSpeedKmh(cur.speedMps, cur.accuracy)
          );
        }
        // গন্তব্যের lat/lng — nearby query-র getLocation closure-এ লাগে।
        const destLat = destinationDetails?.lat;
        const destLng = destinationDetails?.lng;
        // presence broadcast (active_riders-এ নিজেকে লেখা) এখন GLOBAL
        // useLivePresence hook চালায় — single owner (singleton GPS sub একটাই)।
        // Map খুললে শুধু "Go Live" on নিশ্চিত করি; broadcast + map dot-এর live
        // GPS তখন global hook থেকে useLocationStore-এ আসে।
        setPresenceEnabled(true);
        if (!mounted) return;
        setTracking(true);
        stopWatching = locationService.watchNearbyRiders(
          // getLocation — প্রতি load-এ সর্বশেষ GPS+গন্তব্য দেয় (নড়লে নতুন query)।
          () => {
            const s = useLocationStore.getState();
            const lat = s.latitude ?? routeOriginRef.current?.lat;
            const lng = s.longitude ?? routeOriginRef.current?.lng;
            if (lat == null || lng == null) return null;
            return { lat, lng, destLat, destLng };
          },
          (all) => {
            if (!mounted) return;
            // server (RPC) থেকে distance+isMatchDest সহ আসে; নিজেকে বাদ দিই।
            // জোন চেক + map useMemo-তে হয় → radius বদলালে real-time।
            setRawRiders(all.filter((r: any) => r.id !== user.uid));
          },
          1000,                          // visible radius (map খালি না)
          SAME_DESTINATION_RADIUS_M,     // একই গন্তব্য সীমা (500m)
        );
      } catch {
        if (!mounted) return;
        setTracking(false);
        Alert.alert('Location error', 'Could not start live location. Check permissions and try again.');
      }
    })();

    return () => {
      mounted = false;
      // NOTE: presence broadcast আর এখানে বন্ধ করি না — global useLivePresence
      // hook সেটার মালিক (Map ছাড়লেও discoverable থাকা = আসল fix)। এখানে শুধু
      // এই screen-এর nearby-read subscription বন্ধ করি।
      stopWatching?.();
      if (waitTimerRef.current) { clearTimeout(waitTimerRef.current); waitTimerRef.current = null; }
    };
  }, [destination, pickupPoint, routeDestinationKey, destinationDetails?.lat, destinationDetails?.lng, routeSearchNonce, vehicleType, setLocation, setTracking, setPresenceEnabled, user?.uid]);

  // Meetup route for selected rider
  useEffect(() => {
    if (!selectedRider) { setMeetupRoute(null); setSelectedRiderRouteCoordinates([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await directionsService.getRoute({ origin: { latitude: latitude ?? routeOrigin?.lat ?? 23.7749, longitude: longitude ?? routeOrigin?.lng ?? 90.3990 }, destination: { latitude: selectedRider.lat, longitude: selectedRider.lng }, mode: 'walking' });
        if (!cancelled) { setSelectedRiderRouteCoordinates(safeDecodePolyline(r.polyline)); setMeetupRoute({ distanceText: r.distanceText, durationText: r.durationText, summary: r.summary }); }
      } catch { if (!cancelled) { setSelectedRiderRouteCoordinates([]); setMeetupRoute(null); } }
    })();
    return () => { cancelled = true; };
  }, [selectedRider, latitude, longitude, routeOrigin?.lat, routeOrigin?.lng]);

  // Auto-select first rider — শুধু route process শেষ হলে (routeReady)। এতে
  // map + rider list/card একসাথে দেখায় (search চলাকালীন "আগেই list" আসে না)।
  useEffect(() => {
    if (!routeReady) return;
    if (!prioritizedRiders.length) { setSelectedRider(null); return; }
    setSelectedRider((cur) => cur && prioritizedRiders.some((r) => r.userId === cur.userId) ? cur : prioritizedRiders[0]);
  }, [prioritizedRiders, routeReady]);

  // rider-এ focus — শুধু user নিজে pin tap করলে (auto-select-এ নয়)। আগে
  // fitToCoordinates দিয়ে origin+rider+dest সব দেখাতে map zoom OUT করত →
  // প্রতি tap-এ লাফাত। এখন শুধু ওই rider-এ আলতো center + হালকা zoom IN
  // (smooth glide, ~0.0045 delta) → premium focus feel, লাফ নয়।
  useEffect(() => {
    if (!selectedRider || !userTappedRider.current) return;
    userTappedRider.current = false;
    mapRef.current?.animateToRegion(
      {
        latitude: selectedRider.lat,
        longitude: selectedRider.lng,
        latitudeDelta: 0.0045,
        longitudeDelta: 0.0045,
      },
      500,
    );
  }, [selectedRider]);

  // Cinematic intro — একবারই (didInitialCenter ref)। map wide (দূর থেকে,
  // initialRegion delta 0.025 ≈ 2.5km) শুরু হয় → সব rider এক পলক দেখা যায় →
  // GPS fix এলে animated হয়ে user-এর location-এ একদম কাছে (~450m view,
  // delta 0.0045) zoom IN হয় → কাছের round pin স্পষ্ট।
  //
  // গন্তব্য থাকুক বা না থাকুক — সবসময় এই কাছের zoom-ই establishing shot।
  // route-এর fitToCoordinates (যা পুরো রুট দেখাতে zoom OUT করত) আর camera
  // নাড়ায় না; route শুধু polyline + destination marker হিসেবে আঁকে।
  useEffect(() => {
    if (!hasLoc || didInitialCenter.current) return;
    didInitialCenter.current = true;
    // Cinematic intro:
    //  • destination থাকলে → আগে গন্তব্য একপলক (establishing, ~1s) দেখাই →
    //    তারপর smooth glide করে my-location-এ কাছে zoom IN (আশেপাশের match/
    //    unmatch pin স্পষ্ট)। দুই ধাপ animated → premium feel।
    //  • destination না থাকলে → সরাসরি my-location-এ zoom (আগের behaviour)।
    // BUG (আগে): dependency-তে lat/lng থাকায় প্রতি GPS tick-এ re-run হয়ে timer
    // বাতিল হত → zoom হত না। তাই dependency শুধু hasLoc, lat/lng fire-এ fresh পড়ি।
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    const dest = destinationDetails;
    if (dest) {
      // ধাপ ১: গন্তব্যে আলতো center (একপলক দেখাই)
      timers.push(setTimeout(() => {
        mapRef.current?.animateToRegion(
          { latitude: dest.lat, longitude: dest.lng, latitudeDelta: 0.012, longitudeDelta: 0.012 },
          900,
        );
      }, 400));
      // ধাপ ২: তারপর my-location-এ কাছে glide (close zoom)
      timers.push(setTimeout(() => {
        const loc = useLocationStore.getState();
        if (loc.latitude == null || loc.longitude == null) return;
        mapRef.current?.animateToRegion(
          { latitude: loc.latitude, longitude: loc.longitude, latitudeDelta: 0.0045, longitudeDelta: 0.0045 },
          1100,
        );
      }, 1700));
    } else {
      timers.push(setTimeout(() => {
        const loc = useLocationStore.getState();
        if (loc.latitude == null || loc.longitude == null) return;
        mapRef.current?.animateToRegion(
          { latitude: loc.latitude, longitude: loc.longitude, latitudeDelta: 0.0045, longitudeDelta: 0.0045 },
          1100,
        );
      }, 600));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoc]);

  // Route polyline
  useEffect(() => {
    // গন্তব্য নেই → route gate লাগে না, list সরাসরি দেখাই।
    if (!routeOrigin || !destinationDetails) { setRouteCoordinates([]); setRouteSummary(null); setRouteReady(true); return; }
    let cancelled = false;
    setRouteReady(false); // নতুন গন্তব্য → route compute শেষ না হওয়া পর্যন্ত list চাপা।
    (async () => {
      try {
        const r = await routesService.computeRoute({ origin: { location: { latLng: { latitude: routeOrigin.lat, longitude: routeOrigin.lng } } }, destination: { location: { latLng: { latitude: destinationDetails.lat, longitude: destinationDetails.lng } } }, travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE', computeAlternativeRoutes: false });
        if (cancelled) return;
        const pts = safeDecodePolyline(r?.polyline?.encodedPolyline);
        setRouteCoordinates(pts);
        setRouteSummary({ distanceText: r?.distanceMeters ? `${(r.distanceMeters / 1000).toFixed(1)} km` : '', durationText: r?.duration ? `${Math.max(1, Math.round(r.duration / 60))} min` : '' });
        // route শুধু polyline + destination marker হিসেবে আঁকা হয়; camera
        // নাড়ানো হয় না। establishing shot হলো intro-র কাছের zoom (~450m)।
        // আগে এখানে fitToCoordinates ছিল যা পুরো রুট দেখাতে zoom OUT করত —
        // user-এর "কাছে দেখাও" চাওয়ার বিপরীত, তাই সরানো হলো।
      } catch {
        try {
          const fb = await directionsService.getRoute({ origin: { latitude: routeOrigin.lat, longitude: routeOrigin.lng }, destination: { latitude: destinationDetails.lat, longitude: destinationDetails.lng }, mode: 'driving' });
          if (cancelled) return;
          const pts = safeDecodePolyline(fb.polyline);
          setRouteCoordinates(pts);
          setRouteSummary({ distanceText: fb.distanceText, durationText: fb.durationText });
        } catch { if (!cancelled) { setRouteCoordinates([]); setRouteSummary(null); } }
      } finally {
        // route compute শেষ (সফল/ব্যর্থ যাই হোক) → list+card দেখানোর gate খুলি।
        if (!cancelled) setRouteReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [destinationDetails, routeOrigin, routeSearchNonce]);

  const centerMap = useCallback(async () => {
    // location আগে থেকে থাকলে — সরাসরি সেখানে যাই।
    if (hasLoc) {
      mapRef.current?.animateToRegion(
        { latitude: latitude!, longitude: longitude!, latitudeDelta: 0.002, longitudeDelta: 0.002 },
        500,
      );
      return;
    }
    // নাহলে — এখানেই (ইউজার ট্যাপ করায়) permission চাই + GPS নিই
    // (contextual permission — অ্যাপ খোলার সময় নয়, এই ট্যাপে)।
    try {
      const ok = await locationService.requestPermissions();
      if (!ok) {
        Alert.alert(
          'Location needed',
          'Allow location access so we can show your position and find nearby riders.',
        );
        return;
      }
      const cur = await locationService.getCurrentLocation();
      if (cur) {
        setLocation(cur.latitude, cur.longitude, cur.accuracy ?? undefined);
        mapRef.current?.animateToRegion(
          { latitude: cur.latitude, longitude: cur.longitude, latitudeDelta: 0.002, longitudeDelta: 0.002 },
          600,
        );
      } else {
        Alert.alert('Location unavailable', 'Please turn on GPS and try again.');
      }
    } catch {
      Alert.alert('Location error', 'Could not get your location. Please try again.');
    }
  }, [hasLoc, latitude, longitude, setLocation]);


  const openChat = useCallback((rider: RiderMatch) => {
    navigation.navigate('Chat', { rider, partnerName: rider.name });
  }, [navigation]);

  // Map একটা tab হতে পারে (back করার আগের screen নেই) — তখন goBack()
  // "GO_BACK was not handled" error দেয়। তাই canGoBack চেক করি, না পারলে
  // Home-এ navigate করি। LiveMapScreen দুই জায়গায় চলে: Tab "Map" (Home একই
  // tab navigator-এ) ও Stack "LiveMap" (Home nested MainApp-এর ভিতরে)। তাই
  // আগে সরাসরি 'Home' চেষ্টা করি, ব্যর্থ হলে nested MainApp→Home target দিই।
  const goBackSafe = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    try {
      navigation.navigate('Home' as never);
    } catch {
      navigation.navigate('MainApp' as never, { screen: 'Home' } as never);
    }
  }, [navigation]);

  const handleExpandZone = useCallback(() => {
    // At max zone — cycle back to 150m and restart scan
    if (zoneIdx >= ZONE_LEVELS.length - 1) {
      setZoneIdx(0);
      setZoneRadius(ZONE_LEVELS[0]);
      setScanSecs(0);
      setShowNoRidersSheet(false);
      setDismissed(false);
      return;
    }
    const nextIdx = zoneIdx + 1;
    setZoneIdx(nextIdx);
    setZoneRadius(ZONE_LEVELS[nextIdx]);
    setShowNoRidersSheet(false);
  }, [zoneIdx, setZoneRadius]);

  const handlePostForLater = useCallback(() => {
    setShowNoRidersSheet(false);
    setDismissed(true);
    navigation.navigate('CreatePost', { destination: destinationDetails?.name ?? destination ?? '' });
  }, [navigation, destinationDetails?.name, destination]);

  const handleKeepWaiting = useCallback(() => {
    setShowNoRidersSheet(false);
    setDismissed(true);
    setScanSecs(0); // reset so sheet doesn't instantly re-appear after 30s
    if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    waitTimerRef.current = setTimeout(() => {
      setDismissed(false);
      waitTimerRef.current = null;
    }, 30000);
  }, []);

  const handleOffer = useCallback((rider: RiderMatch) => {
    if (requestStates[rider.userId] === 'confirmed') { openChat(rider); return; }
    const now = Date.now();
    const last = lastOfferTimeRef.current[rider.userId] ?? 0;
    if (now - last < 30000) {
      Alert.alert('Please wait', 'You already sent a request to this rider. Wait 30 seconds before trying again.');
      return;
    }
    lastOfferTimeRef.current[rider.userId] = now;
    const nearbyRider = { ...rider, uid: rider.userId };
    setPartner(nearbyRider); setStatus('waiting'); setRequestState(rider.userId, 'pending');
  }, [openChat, requestStates, setPartner, setRequestState, setStatus]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        customMapStyle={MAP_STYLES[mapStyle] as never[]}

        showsUserLocation={false}
        showsMyLocationButton={false}
        mapPadding={{ top: 0, right: 0, bottom: tabBarHeight + 20, left: 0 }}
      >
        {routeOrigin && (
          <Marker coordinate={{ latitude: routeOrigin.lat, longitude: routeOrigin.lng }} pinColor={C.primary} title={routeOrigin.label} description="Pickup" />
        )}
        {destinationDetails && (
          <Marker coordinate={{ latitude: destinationDetails.lat, longitude: destinationDetails.lng }} pinColor="#A855F7" title={destinationDetails.name} description="Destination" />
        )}
        {routeCoordinates.length > 1 && (
          <Polyline coordinates={routeCoordinates} strokeColor="#818CF8" strokeWidth={5} lineCap="round" lineJoin="round" />
        )}
        {selectedRiderRouteCoordinates.length > 1 && (
          // হাঁটার পথ — teal ডটেড (card-এর "walk" pill-এর রঙের সাথে মেলে;
          // কমলা pin-এর সাথে মেশে না)। কঠিন লাইন = গাড়ির route, ডটেড = হাঁটা।
          <Polyline coordinates={selectedRiderRouteCoordinates} strokeColor={C.teal} strokeWidth={3} lineDashPattern={[8, 5]} lineCap="round" />
        )}
        {hasLoc && (
          <>
            <Circle
              center={{ latitude: latitude!, longitude: longitude! }}
              radius={userAccuracyRadius}
              strokeColor="rgba(192,132,252,0.45)"
              strokeWidth={1.5}
              fillColor="rgba(192,132,252,0.07)"
            />
            <Marker
              coordinate={{ latitude: latitude!, longitude: longitude! }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={userDot.wrap}>
                {/* radar wave — অ্যাপ আশেপাশে "খুঁজছে" এই অনুভূতি দেয় */}
                <PulseRing color={C.primary} size={100} />
                <View style={userDot.ring} />
                <View style={userDot.core} />
                {/* নিজের নাম dot-এর নিচে — absolute, যাতে dot center-এ থাকে। */}
                <View style={userDot.nameChip}>
                  <RNText style={userDot.nameText} numberOfLines={1}>
                    {(user?.name && user.name.trim()) || 'You'}
                  </RNText>
                </View>
              </View>
            </Marker>
          </>
        )}
        {/* render order: কমলা আগে, সবুজ (match) পরে, selected সবার শেষে →
            শেষে আঁকা pin উপরে থাকে (Android-এ zIndex অনির্ভরযোগ্য, তাই render
            order দিয়েই stacking ঠিক করি)। প্রতিটা RiderMarker নিজে নিজে
            tracksViewChanges manage করে → icon ছোট/hide হওয়ার সমস্যা শেষ। */}
        {(routeReady ? [...prioritizedRiders] : [])
          .sort((a, b) => {
            const rank = (r: RiderMatch) =>
              selectedRider?.userId === r.userId ? 2 : r.isMatch ? 1 : 0;
            return rank(a) - rank(b);
          })
          .map((rider) => (
            <RiderMarker
              key={rider.userId}
              rider={rider}
              isSelected={selectedRider?.userId === rider.userId}
              matchColor={C.matchGreen}
              nearbyColor={C.nearbyOrange}
              // শুধু MATCH (সবুজ) rider tap করা যাবে → কার্ড আসবে। কমলা marker
              // আশেপাশে কে আছে দেখায়, কিন্তু tap-এ কার্ড আসে না।
              // user নিজে tap করল → flag on (পরের effect ওই rider-এ আলতো focus
              // করবে — premium feel)। auto-select-এ map নড়ে না।
              onPress={(r) => {
                if (!r.isMatch) return;
                userTappedRider.current = true;
                setSelectedRider(r as RiderMatch);
              }}
            />
          ))}
      </MapView>

      {/* ── Top bar — single row: back | destination+meta | live | center ── */}
      <View style={[s.topBar, { top: insets.top + 8 }]}>
        <TouchableOpacity style={s.iconBtn} onPress={goBackSafe} activeOpacity={0.8}>
          <IconBack />
        </TouchableOpacity>

        {/* ট্যাপ করলে Home-এ ফিরে যায় — সেখানে destination সেট করা যায়
            (Map screen-এ সরাসরি সেট করার ইনপুট নেই)। */}
        <TouchableOpacity
          style={s.routeBar}
          activeOpacity={0.85}
          onPress={goBackSafe}
        >
          <View style={s.routeInfo}>
            {destinationDetails ? (
              <View style={s.routeBlock}>
                <RNText style={s.routeToVal} numberOfLines={1} ellipsizeMode="tail">{destinationDetails.name}</RNText>
                {routeSummary && (
                  <View style={s.routeMetaRow}>
                    <View style={[s.routeDot, { backgroundColor: '#34D399' }]} />
                    <RNText style={s.routeMetaText}>{routeSummary.durationText}</RNText>
                    <RNText style={s.routeMetaDivider}>·</RNText>
                    <RNText style={s.routeMetaText}>{routeSummary.distanceText}</RNText>
                  </View>
                )}
              </View>
            ) : (
              <RNText style={s.routePlaceholder}>Where are you going?</RNText>
            )}
          </View>
          <LiveBadge />
        </TouchableOpacity>

        <TouchableOpacity style={s.iconBtn} onPress={centerMap} activeOpacity={0.8}>
          <IconCenter />
        </TouchableOpacity>
      </View>

      {/* ── Stats row — single compact bar below top bar ── */}
      <View style={[s.statsRow, { top: insets.top + 58 }]}>
        <View style={s.statPill}>
          <RNText style={s.statPillNum}>{prioritizedRiders.length}</RNText>
          <RNText style={s.statPillLbl}> Nearby</RNText>
        </View>
        <View style={[s.statPill, matchCount > 0 && s.statPillGreen]}>
          <RNText style={[s.statPillNum, matchCount > 0 && { color: C.matchGreen }]}>{matchCount}</RNText>
          <RNText style={s.statPillLbl}> Match</RNText>
        </View>
        {routeRiders.length > 0 ? (
          <View style={s.statPill}>
            <RNText style={s.statPillNum}>{routeRiders.length}</RNText>
            <RNText style={s.statPillLbl}> On Route</RNText>
          </View>
        ) : null}
        <TouchableOpacity style={[s.statPill, s.statPillGps]} onPress={handleExpandZone} activeOpacity={0.75}>
          <RNText style={[s.statPillNum, { fontSize: 13, color: C.amber }]}>
            {hasLoc ? `${userAccuracyRadius}m` : '…'}
          </RNText>
          <RNText style={s.statPillLbl}>{zoneIdx >= ZONE_LEVELS.length - 1 ? ' ↺' : ' ↑'}</RNText>
        </TouchableOpacity>
        {/* Legend inline — 3 tiny dots */}
        <View style={s.legendInline}>
          {[{ color: C.routeBlue, label: 'R' }, { color: C.matchGreen, label: 'M' }, { color: C.nearbyOrange, label: 'N' }].map(item => (
            <View key={item.color} style={s.legendDotWrap}>
              <View style={[s.legendDot, { backgroundColor: item.color }]} />
            </View>
          ))}
        </View>
      </View>

      {!showNoRidersSheet ? (
        <View style={[s.scanChip, { bottom: selectedRider ? 165 : 8 }]}>
          <Animated.View style={[s.scanDot, {
            opacity: scanAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.2, 1] }),
            transform: [{ scale: scanAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.6, 1] }) }],
          }]} />
          <RNText style={s.scanText}>
            {hasLoc
              ? matchCount > 0
                ? `${matchCount} rider match found nearby`
                : `Searching within ${userAccuracyRadius}m…`
              : 'Getting your location…'}
          </RNText>
        </View>
      ) : null}

      <View style={{ position: 'absolute', bottom: selectedRider ? 210 : 8, right: 12, zIndex: 10 }}>
        <Speedometer speedKmh={hasLoc ? (speedKmh ?? 0) : null} />
      </View>

      {selectedRider ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 8 }}>
          <SelectedSheet
            rider={selectedRider}
            meetupRoute={meetupRoute}
            requestState={requestStates[selectedRider.userId] ?? 'idle'}
            onOffer={handleOffer}
            onClose={() => setSelectedRider(null)}
          />
        </View>
      ) : null}

      {showNoRidersSheet && !selectedRider ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 12, zIndex: 50, elevation: 50 }}>
          <NoRidersSheet
            scanSecs={scanSecs}
            zoneIdx={zoneIdx}
            onExpandZone={handleExpandZone}
            onPostForLater={handlePostForLater}
            onKeepWaiting={handleKeepWaiting}
            destination={destinationDetails?.name ?? (destination?.startsWith('custom_') ? 'Selected location' : destination) ?? 'your destination'}
          />
        </View>
      ) : null}

    </View>
  );
}

// ─── Marker styles ─────────────────────────────────────────────────────────────
const userDot = StyleSheet.create({
  wrap: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute', width: 30, height: 30, borderRadius: 15,
    borderWidth: 2.5, borderColor: '#C084FC',
    backgroundColor: 'rgba(192,132,252,0.18)',
  },
  // core = তোমার EXACT GPS পয়েন্ট (circle শুধু search zone, এই dot-ই আসল)।
  core: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#C084FC',
    borderWidth: 2.5, borderColor: '#FFFFFF',
    shadowColor: '#C084FC', shadowOpacity: 0.9, shadowRadius: 7, shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  // নিজের নাম — dot-এর ঠিক নিচে, absolute (dot-এর position না নড়াতে)।
  nameChip: {
    position: 'absolute', top: 32,
    backgroundColor: '#C084FC',
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 9,
    borderWidth: 1.2, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 7,
  },
  nameText: {
    color: '#FFFFFF', fontSize: 11, fontWeight: '800',
    letterSpacing: -0.1, textAlign: 'center',
  },
});

// rider pin-এর style এখন RiderMarker.tsx-এ (self-contained component)।

// ─── Screen styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // ── Top bar
  topBar: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#111827',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  routeBar: {
    flex: 1, backgroundColor: '#111827',
    borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    minWidth: 0,
  },
  routeInfo: { flex: 1, minWidth: 0 },
  routeBlock: { gap: 3 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeDot: { width: 6, height: 6, borderRadius: 3 },
  routeToVal: { fontSize: 11, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  routeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  routeMetaText: { fontSize: 11, color: C.textSub, fontWeight: '500' },
  routeMetaDivider: { fontSize: 11, color: C.textMuted },
  routePlaceholder: { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },
  etaChip: { backgroundColor: 'rgba(192,132,252,0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(192,132,252,0.25)' },
  etaText: { fontSize: 9, color: '#C084FC', fontWeight: '700', letterSpacing: 0.2 },

  // ── Stats — compact pill row, solid readable dark cards
  statsRow: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', gap: 4, zIndex: 9 },
  statPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#111827', borderRadius: 8,
    paddingVertical: 5, paddingHorizontal: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  // Match pill — সবচেয়ে গুরুত্বপূর্ণ signal, একটু জোর দেওয়া
  statPillGreen: { borderColor: 'rgba(52,211,153,0.5)', backgroundColor: '#0d1f18' },
  statPillGps: { borderColor: 'rgba(245,158,11,0.35)', backgroundColor: '#1a1500' },
  statPillNum: { fontSize: 13, fontWeight: '900', color: '#F1F5F9' },
  statPillLbl: { fontSize: 10.5, fontWeight: '600', color: '#94A3B8' },

  // ── Legend inline (inside stats row)
  legendInline: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6 },
  legendDotWrap: { alignItems: 'center', justifyContent: 'center' },
  legendDot: { width: 7, height: 7, borderRadius: 4 },

  // ── Scanning chip
  scanChip: {
    position: 'absolute', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(10,16,34,0.88)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9,
    borderWidth: 1, borderColor: 'rgba(192,132,252,0.35)',
    elevation: 8,
    shadowColor: '#C084FC', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  scanDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#C084FC',
  },
  scanText: {
    fontSize: 12, fontWeight: '700', color: '#E2D9FF', letterSpacing: 0.1,
  },

});
