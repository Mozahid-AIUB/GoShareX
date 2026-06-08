export { useLocation } from './useLocation';
export { useNearbyRiders } from './useNearbyRiders';
export { useRideStatus } from './useRideStatus';
// useChat: feature flag অনুযায়ী Supabase Realtime বা Firebase।
// দুটোর interface এক, তাই screen-এর কোড বদলাতে হয় না।
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { useChat as useFirebaseChat } from './useChat';
import { useSupabaseChat } from './useSupabaseChat';
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
