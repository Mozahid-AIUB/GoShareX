// ============================================================
// Supabase Badge Service — badge tier + strike/suspension tracking
// Firebase badgeService-এর সমতুল্য। users টেবিলের
// badge/strikes/is_suspended/suspended_until কলাম ব্যবহার করে।
//
// নোট: strikes/is_suspended/suspended_until কলাম RLS+trigger দিয়ে
// সুরক্ষিত — ইউজার নিজে বদলাতে পারে না। তাই write গুলো (recordCancellation,
// reducePenalty, clearAllPenalties, updateUserBadge) RPC (security definer)
// দিয়ে করা উচিত যদি কখনো ব্যবহার হয়। আপাতত screens শুধু checkSuspension
// ডাকে (read-only), যেটা সরাসরি select দিয়েই চলে।
// ============================================================
import { supabase } from '@/config/supabase.config';
import type { UserBadge } from '@/types/auth.types';
import { logger } from '@/utils/logger';

/**
 * Calculate badge tier based on ride count (pure — backend-agnostic)
 */
export function calculateBadge(totalRides: number): UserBadge {
  if (totalRides >= 50) return 'Elite Rider';
  if (totalRides >= 21) return 'Trusted';
  if (totalRides >= 6) return 'Regular';
  return 'New Rider';
}

/**
 * Update user's badge based on ride count.
 * badge কলাম protected — server RPC (apply_ride_completion/recalc_user_trust)
 * নিজেই badge সেট করে। তাই client-side update আর দরকার নেই (no-op রাখা হলো
 * যাতে পুরনো caller না ভাঙে)।
 */
export async function updateUserBadge(_uid: string, _totalRides: number): Promise<void> {
  // server-side (RPC) handles badge — intentionally no-op.
}

/**
 * Record a confirmed ride cancellation → +1 strike, suspend at threshold.
 * নিজের জন্যই (RPC auth.uid() ব্যবহার করে — uid param আর লাগে না, কিন্তু
 * signature রাখা হলো backward-compat-এ)। strike/suspend cheat-proof server-এ।
 * Returns true if the user is now suspended.
 */
export async function recordCancellation(_uid?: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('record_my_cancellation');
  if (error) {
    logger.warn('badgeService', `recordCancellation failed: ${error.message}`);
    return false;
  }
  return Boolean(data);
}

/**
 * Check if a user is currently suspended; clear it if expired.
 */
export async function checkSuspension(
  uid: string
): Promise<{ suspended: boolean; reason?: string }> {
  const { data, error } = await supabase
    .from('users')
    .select('is_suspended, suspended_until, suspension_reason')
    .eq('id', uid)
    .single();

  if (error || !data) return { suspended: false };

  const isSuspended = data.is_suspended;
  const suspendedUntil = data.suspended_until ? new Date(data.suspended_until).getTime() : null;

  if (!isSuspended || !suspendedUntil) return { suspended: false };

  if (Date.now() >= suspendedUntil) {
    // expired → server-side clear (protected কলাম, RPC দিয়ে; নিজের জন্যই)
    const { error: upErr } = await supabase.rpc('clear_expired_suspension');
    if (upErr) logger.warn('badgeService', `clear suspension failed: ${upErr.message}`);
    return { suspended: false };
  }

  return { suspended: true, reason: data.suspension_reason ?? undefined };
}

/**
 * Reduce strikes by 1 (called after successful rides).
 * strike-reduce এখন apply_ride_completion RPC নিজে করে (ride শেষ হলে)।
 * তাই client-side আলাদা update আর দরকার নেই — no-op (caller না ভাঙতে রাখা)।
 */
export async function reducePenalty(_uid: string): Promise<void> {
  // server-side (apply_ride_completion) handles strike reduction — no-op.
}

/**
 * Clear all penalties (admin only).
 * এটা admin action — server-side Edge Function/service_role দিয়ে করা উচিত।
 * client থেকে protected কলাম বদলানো guard আটকাবে, তাই no-op রাখা হলো।
 */
export async function clearAllPenalties(_uid: string): Promise<void> {
  // admin-only; must run server-side with service_role — no-op on client.
}
