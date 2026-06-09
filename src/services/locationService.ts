// ============================================================
// Location Service Router (Map screen-এর জন্য)
//
// Firebase locationService-এর সব method দেয়, কিন্তু presence-সম্পর্কিত
// (startWatching/stopWatching/watchNearbyRiders) Supabase mode-এ Supabase
// presence service থেকে নেয় — যাতে presence Supabase active_riders-এ
// লেখা/পড়া হয় (Firebase RTDB-তে না)।
//
// GPS/geocode/permission method গুলো backend-নিরপেক্ষ (Google Maps API,
// auth লাগে না) — তাই Firebase version-ই ব্যবহার করি।
// ============================================================
import { FEATURE_FLAGS } from '@/config/featureFlags';
import firebaseLocationService from '@/services/firebase/locationService';
import { supabasePresenceService } from '@/services/supabase/presenceService';

const useSupabase = FEATURE_FLAGS.USE_SUPABASE_PRESENCE;

// একটা proxy অবজেক্ট: presence method Supabase, বাকি Firebase
const locationService = {
  // GPS / permission / geocode — Firebase (backend-নিরপেক্ষ)
  requestPermissions: firebaseLocationService.requestPermissions.bind(firebaseLocationService),
  hasPermission: firebaseLocationService.hasPermission.bind(firebaseLocationService),
  getCurrentLocation: firebaseLocationService.getCurrentLocation.bind(firebaseLocationService),
  getFreshCurrentLocation: firebaseLocationService.getFreshCurrentLocation.bind(firebaseLocationService),
  reverseGeocode: firebaseLocationService.reverseGeocode.bind(firebaseLocationService),

  // presence — Supabase mode হলে Supabase, নাহলে Firebase
  startWatching: useSupabase
    ? supabasePresenceService.startWatching.bind(supabasePresenceService)
    : firebaseLocationService.startWatching.bind(firebaseLocationService),
  stopWatching: useSupabase
    ? supabasePresenceService.stopWatching.bind(supabasePresenceService)
    : firebaseLocationService.stopWatching.bind(firebaseLocationService),
  watchNearbyRiders: useSupabase
    ? supabasePresenceService.watchNearbyRiders.bind(supabasePresenceService)
    : firebaseLocationService.watchNearbyRiders.bind(firebaseLocationService),
};

export default locationService;
