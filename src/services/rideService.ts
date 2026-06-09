// ============================================================
// Ride Service Router — flag অনুযায়ী Firebase বা Supabase।
// ride screen এখান থেকে rideService নেবে।
// ============================================================
import { FEATURE_FLAGS } from '@/config/featureFlags';
import firebaseRideService from '@/services/firebase/rideService';
import supabaseRideService from '@/services/supabase/rideService';

const rideService = FEATURE_FLAGS.USE_SUPABASE_RIDE
  ? supabaseRideService
  : firebaseRideService;

export default rideService;
