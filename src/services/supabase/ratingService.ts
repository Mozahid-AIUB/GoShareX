// ============================================================
// Supabase Rating Service
// Firebase ratingService এর সমতুল্য — anonymous category rating +
// trust score recalculation। raterId কখনো UI-তে দেখানো হয় না।
//
// টাইপ/category Firebase থেকে re-export (একই) — screen একই import পায়।
// ============================================================
import { supabase } from '@/config/supabase.config';
import { logger } from '@/utils/logger';
import type { RatingPayload, TrustBreakdown } from '@/services/firebase/ratingService';

export {
  RATING_CATEGORIES,
  type CategoryId,
  type RatingPayload,
  type TrustBreakdown,
} from '@/services/firebase/ratingService';

// ─── trust recalculation — সম্পূর্ণ server-side (cheat-proof) ───
// সব হিসাব (গড় star, trust score, badge) recalc_user_trust RPC ভেতরে হয়।
// client কোনো সংখ্যা পাঠায় না — শুধু "এই user-এর rating বদলেছে" জানায়।
// তাই কেউ নিজের trust/rating/badge fake করতে পারে না।
async function recalculateTrust(userId: string): Promise<void> {
  const { error } = await supabase.rpc('recalc_user_trust', { p_rated_id: userId });
  if (error) logger.warn('ratingService.recalcTrust', error.message);
}

export async function submitRating(payload: RatingPayload): Promise<void> {
  const comment = payload.comment?.trim().slice(0, 200) ?? '';
  try {
    // এক ride-এ এক rater একবারই (unique constraint); upsert ব্যবহার
    const { error: rErr } = await supabase.from('ratings').upsert(
      {
        ride_id: payload.rideId,
        rated_id: payload.rateeId,
        rater_id: payload.raterId,
        stars: payload.stars,
        friendly: payload.categories.includes('friendly'),
        safe_ride: payload.categories.includes('safeRide'),
        comment: comment || null,
      },
      { onConflict: 'ride_id,rater_id' },
    );
    if (rErr) throw rErr;

    // ride-এ "এই rater rate করেছে" ফ্ল্যাগ (rated jsonb)
    const { data: ride } = await supabase
      .from('rides')
      .select('rated')
      .eq('id', payload.rideId)
      .single();
    const rated = { ...(ride?.rated ?? {}), [payload.raterId]: true };
    await supabase.from('rides').update({ rated }).eq('id', payload.rideId);

    await recalculateTrust(payload.rateeId);
  } catch (err) {
    logger.error('supabaseRatingService.submit', err);
    throw new Error('Could not submit rating.');
  }
}

export async function getTrustBreakdown(userId: string): Promise<TrustBreakdown | null> {
  const { data } = await supabase
    .from('users')
    .select('trust_breakdown')
    .eq('id', userId)
    .single();
  return (data?.trust_breakdown as TrustBreakdown) ?? null;
}

export async function hasRated(rideId: string, raterId: string): Promise<boolean> {
  const { data } = await supabase
    .from('ratings')
    .select('id')
    .eq('ride_id', rideId)
    .eq('rater_id', raterId)
    .maybeSingle();
  return !!data;
}
