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

// ─── trust recalculation (Firebase formula হুবহু) ───
async function recalculateTrust(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('ratings')
    .select('stars, friendly, safe_ride')
    .eq('rated_id', userId);
  if (error || !data || data.length === 0) return;

  const count = data.length;
  let totalStars = 0, friendly = 0, safeRide = 0;
  for (const r of data) {
    totalStars += Number(r.stars ?? 0);
    if (r.friendly) friendly++;
    if (r.safe_ride) safeRide++;
  }
  const avgStars = totalStars / count;
  // 70% star + 30% category (Firebase-এর একই formula)
  const starPoints = (avgStars / 5) * 70;
  const catAvg = (friendly + safeRide) / (count * 2);
  const trustScore = Math.round(starPoints + catAvg * 30);

  const breakdown: TrustBreakdown = {
    totalRatings: count,
    avgStars: Math.round(avgStars * 10) / 10,
    friendlyPct: Math.round((friendly / count) * 100),
    safeRidePct: Math.round((safeRide / count) * 100),
    trustScore,
  };

  // users আপডেট। rating/trust trigger-সুরক্ষিত — তাই service_role/RPC
  // ছাড়া client এটা বদলাতে পারে না। আপাতত client update; পরে Edge
  // Function-এ সরানো হবে (ধাপ ৬) যাতে cheat-proof হয়।
  await supabase
    .from('users')
    .update({
      trust_score: breakdown.trustScore,
      rating: breakdown.avgStars,
      total_ratings: breakdown.totalRatings,
      trust_breakdown: breakdown,
    })
    .eq('id', userId);
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
