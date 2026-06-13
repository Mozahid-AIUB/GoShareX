// ============================================================
// Badge Service Router — flag অনুযায়ী Firebase বা Supabase।
// calculateBadge pure (দুই backend-এ এক), বাকিগুলো backend-নির্ভর।
// ============================================================
import { FEATURE_FLAGS } from '@/config/featureFlags';
import * as fb from '@/services/firebase/badgeService';
import * as sb from '@/services/supabase/badgeService';

const impl = FEATURE_FLAGS.USE_SUPABASE_BADGE ? sb : fb;

export const calculateBadge = impl.calculateBadge;
export const updateUserBadge = impl.updateUserBadge;
export const recordCancellation = impl.recordCancellation;
export const checkSuspension = impl.checkSuspension;
export const reducePenalty = impl.reducePenalty;
export const clearAllPenalties = impl.clearAllPenalties;
