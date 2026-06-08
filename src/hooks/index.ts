// Feature-flag routed hooks: Supabase বা Firebase, interface এক — screen
// বদলাতে হয় না। (import উপরে, যাতে নিচে ব্যবহার করা যায়।)
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { useRideStatus as useFirebaseRideStatus } from './useRideStatus';
import { useSupabaseRideStatus } from './useSupabaseRideStatus';
import { useChat as useFirebaseChat } from './useChat';
import { useSupabaseChat } from './useSupabaseChat';

export { useLocation } from './useLocation';
export { useNearbyRiders } from './useNearbyRiders';

export const useRideStatus = FEATURE_FLAGS.USE_SUPABASE_RIDE
  ? useSupabaseRideStatus
  : useFirebaseRideStatus;
export const useChat = FEATURE_FLAGS.USE_SUPABASE_CHAT ? useSupabaseChat : useFirebaseChat;
export { useGeofence } from './useGeofence';
export { useNotification } from './useNotification';
export { useNotifications } from './useNotifications';
export { usePostBoard } from './usePostBoard';
export { useDebounce } from './useDebounce';
export { useInterval } from './useInterval';
export { useAppState } from './useAppState';
export { useNetworkStatus } from './useNetworkStatus';
export { useAuth } from './useAuth';
export { useRating } from './useRating';
export { useScreenTracking, useScreenFocusTracking } from './useScreenTracking';
export { useSnappedLocation } from './useSnappedLocation';
