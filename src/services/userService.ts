// ============================================================
// User Service Router — flag অনুযায়ী Firebase বা Supabase।
// screen এখান থেকে getUser/updateUser নেবে।
// ============================================================
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { getUser as fbGetUser, updateUser as fbUpdateUser } from '@/services/firebase/userService';
import { getSupabaseUser, updateSupabaseUser } from '@/services/supabase/userService';

export const getUser = FEATURE_FLAGS.USE_SUPABASE_AUTH ? getSupabaseUser : fbGetUser;
export const updateUser = FEATURE_FLAGS.USE_SUPABASE_AUTH ? updateSupabaseUser : fbUpdateUser;
