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

const SUSPENSION_THRESHOLD_STRIKES = 3;
const SUSPENSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

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
 * (badge কলাম protected — RPC লাগতে পারে; আপাতত best-effort update)
 */
export async function updateUserBadge(uid: string, totalRides: number): Promise<void> {
  const newBadge = calculateBadge(totalRides);
  const { error } = await supabase.from('users').update({ badge: newBadge }).eq('id', uid);
  if (error) logger.warn('badgeService', `updateUserBadge failed: ${error.message}`);
}

/**
 * Record a confirmed ride cancellation → +1 strike, suspend at threshold.
 * Returns true if the user is now suspended.
 */
export async function recordCancellation(uid: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('strikes')
    .eq('id', uid)
    .single();

  if (error || !data) throw new Error('User not found');

  const currentStrikes = (data.strikes ?? 0) + 1;

  if (currentStrikes >= SUSPENSION_THRESHOLD_STRIKES) {
    const suspendedUntil = Date.now() + SUSPENSION_DURATION_MS;
    const { error: upErr } = await supabase
      .from('users')
      .update({
        strikes: currentStrikes,
        is_suspended: true,
        suspended_until: new Date(suspendedUntil).toISOString(),
        suspension_reason: `Account suspended after ${currentStrikes} ride cancellations. Suspension until ${new Date(suspendedUntil).toLocaleString()}`,
      })
      .eq('id', uid);
    if (upErr) logger.warn('badgeService', `suspend update failed: ${upErr.message}`);
    return true;
  }

  const { error: upErr } = await supabase
    .from('users')
    .update({ strikes: currentStrikes })
    .eq('id', uid);
  if (upErr) logger.warn('badgeService', `strike update failed: ${upErr.message}`);
  return false;
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
    // expired → clear
    const { error: upErr } = await supabase
      .from('users')
      .update({ is_suspended: false, suspended_until: null, suspension_reason: null })
      .eq('id', uid);
    if (upErr) logger.warn('badgeService', `clear suspension failed: ${upErr.message}`);
    return { suspended: false };
  }

  return { suspended: true, reason: data.suspension_reason ?? undefined };
}

/**
 * Reduce strikes by 1 (called after successful rides).
 */
export async function reducePenalty(uid: string): Promise<void> {
  const { data, error } = await supabase
    .from('users')
    .select('strikes')
    .eq('id', uid)
    .single();

  if (error || !data) return;

  const currentStrikes = data.strikes ?? 0;
  if (currentStrikes > 0) {
    const { error: upErr } = await supabase
      .from('users')
      .update({ strikes: Math.max(0, currentStrikes - 1) })
      .eq('id', uid);
    if (upErr) logger.warn('badgeService', `reducePenalty failed: ${upErr.message}`);
  }
}

/**
 * Clear all penalties (admin only).
 */
export async function clearAllPenalties(uid: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ strikes: 0, is_suspended: false, suspended_until: null, suspension_reason: null })
    .eq('id', uid);
  if (error) logger.warn('badgeService', `clearAllPenalties failed: ${error.message}`);
}
