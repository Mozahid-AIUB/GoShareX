// ============================================================
// Rating Service Router — flag অনুযায়ী Firebase বা Supabase।
// RATING_CATEGORIES + types দুই backend-এ একই (Firebase থেকে re-export)।
// ============================================================
import { FEATURE_FLAGS } from '@/config/featureFlags';
import * as fb from '@/services/firebase/ratingService';
import * as sb from '@/services/supabase/ratingService';

export {
  RATING_CATEGORIES,
  type CategoryId,
  type RatingPayload,
  type TrustBreakdown,
} from '@/services/firebase/ratingService';

const impl = FEATURE_FLAGS.USE_SUPABASE_AUTH ? sb : fb;

export const submitRating = impl.submitRating;
export const getTrustBreakdown = impl.getTrustBreakdown;
export const hasRated = impl.hasRated;
