// ============================================================
// Supabase Ride Service — ride lifecycle
// Firebase rideService এর সমতুল্য (screen যা ডাকে): createRide,
// markReady, startRide, completeRide, cancelRide, getRide।
//
// helper (counter/savings/badge) ছোট, তাই এখানেই সরাসরি Supabase
// update দিয়ে করি (আলাদা service না)। presence cleanup-এ
// supabasePresenceService ব্যবহার করি।
// ============================================================
import { supabase } from '@/config/supabase.config';
import { supabasePresenceService } from '@/services/supabase/presenceService';
import type { RideRoutePreview } from '@/types/ride.types';
import { logger } from '@/utils/logger';

export type RideStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';

export interface Ride {
  id: string;
  rider1: string;
  rider2: string;
  rider1Name: string;
  rider2Name: string;
  destination: string;
  pickupPoint: string;
  fare: number;
  splitAmount: number;
  status: RideStatus;
  routePreview?: RideRoutePreview;
  confirmedAt?: number;
  startedAt?: number;
  completedAt?: number;
  rider1Ready?: boolean;
  rider2Ready?: boolean;
  cancelledAt?: number;
  cancelledBy?: string;
  cancelReason?: string;
}

function rowToRide(row: any): Ride {
  const toMs = (t: string | null) => (t ? new Date(t).getTime() : undefined);
  return {
    id: row.id,
    rider1: row.rider1,
    rider2: row.rider2,
    rider1Name: row.rider1_name ?? '',
    rider2Name: row.rider2_name ?? '',
    destination: row.destination,
    pickupPoint: row.pickup_point,
    fare: Number(row.fare ?? 0),
    splitAmount: Number(row.split_amount ?? 0),
    status: row.status as RideStatus,
    routePreview: row.route_preview ?? undefined,
    confirmedAt: toMs(row.confirmed_at),
    startedAt: toMs(row.started_at),
    completedAt: toMs(row.completed_at),
    rider1Ready: Boolean(row.rider1_ready),
    rider2Ready: Boolean(row.rider2_ready),
    cancelledAt: toMs(row.cancelled_at),
    cancelledBy: row.cancelled_by ?? undefined,
    cancelReason: row.cancel_reason ?? undefined,
  };
}

class SupabaseRideService {
  async getRide(rideId: string): Promise<Ride | null> {
    const { data } = await supabase.from('rides').select('*').eq('id', rideId).single();
    return data ? rowToRide(data) : null;
  }

  /**
   * ইউজারের ride history — rider1 বা rider2 যেকোনো দিকে। Firestore-এ দুই query
   * + client merge লাগত; Supabase-এ `or` দিয়ে এক query (server pagination,
   * range)। page 0-ভিত্তিক, pageSize রিকর্ড করে। hasMore নির্ণয়ে pageSize+1
   * চাই — তাই একটা বেশি এনে শেষেরটা বাদ দিই।
   */
  async getRideHistory(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ rides: Ride[]; hasMore: boolean }> {
    const from = page * pageSize;
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .or(`rider1.eq.${userId},rider2.eq.${userId}`)
      .order('confirmed_at', { ascending: false, nullsFirst: false })
      .range(from, from + pageSize);   // pageSize+1 রিকর্ড (hasMore বুঝতে)
    if (error) {
      logger.warn('rideService.getRideHistory', error.message);
      return { rides: [], hasMore: false };
    }
    const rows = data ?? [];
    const hasMore = rows.length > pageSize;
    const rides = rows.slice(0, pageSize).map(rowToRide);
    return { rides, hasMore };
  }

  async createRide(
    rider1Id: string, rider1Name: string,
    rider2Id: string, rider2Name: string,
    destination: string, pickupPoint: string,
    fare: number,
    routePreview?: RideRoutePreview,
  ): Promise<string> {
    const { data, error } = await supabase
      .from('rides')
      .insert({
        rider1: rider1Id, rider1_name: rider1Name,
        rider2: rider2Id, rider2_name: rider2Name,
        destination, pickup_point: pickupPoint,
        fare,
        split_amount: routePreview?.splitFare ?? Math.ceil(fare / 2),
        route_preview: routePreview ?? null,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        rider1_ready: false,
        rider2_ready: false,
      })
      .select('id')
      .single();
    if (error || !data) {
      logger.error('rideService.createRide', error);
      throw new Error('Could not create ride.');
    }
    return data.id;
  }

  async markReady(rideId: string, userId: string): Promise<void> {
    const ride = await this.getRide(rideId);
    if (!ride) throw new Error('Ride not found');
    const field = ride.rider1 === userId ? 'rider1_ready' : 'rider2_ready';
    await supabase.from('rides').update({ [field]: true }).eq('id', rideId);
  }

  async startRide(rideId: string): Promise<void> {
    const ride = await this.getRide(rideId);
    if (!ride) throw new Error('Ride not found');
    await supabase
      .from('rides')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', rideId);
    // presence status -> riding (non-fatal)
    await Promise.allSettled([
      supabasePresenceService.setRiderStatus(ride.rider1, 'riding'),
      supabasePresenceService.setRiderStatus(ride.rider2, 'riding'),
    ]);
  }

  async completeRide(rideId: string): Promise<void> {
    const ride = await this.getRide(rideId);
    if (!ride) throw new Error('Ride not found');

    await supabase
      .from('rides')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', rideId);

    // presence থেকে দুজনকে সরাই + ride_status free করি (locked থেকে মুক্ত)
    await Promise.allSettled([
      supabasePresenceService.removeActiveRider(ride.rider1),
      supabasePresenceService.removeActiveRider(ride.rider2),
      supabase.rpc('release_ride_status', { p_uids: [ride.rider1, ride.rider2] }),
    ]);

    // total_rides/total_saved/badge cheat-proof RPC-তে — client কোনো সংখ্যা
    // পাঠায় না; RPC নিজে ride.split_amount দেখে গোনে (security definer)।
    // idempotent: rides.counted ফ্ল্যাগে double-count আটকায়।
    await supabase.rpc('apply_ride_completion', { p_ride_id: rideId }).then(({ error }) => {
      if (error) logger.warn('rideService.applyCompletion', error.message);
    });
  }

  async cancelRide(rideId: string, userId: string, reason = 'Cancelled by user'): Promise<void> {
    const ride = await this.getRide(rideId);
    if (!ride) throw new Error('Ride not found');

    await supabase
      .from('rides')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancel_reason: reason,
      })
      .eq('id', rideId);

    await Promise.allSettled([
      supabasePresenceService.removeActiveRider(ride.rider1),
      supabasePresenceService.removeActiveRider(ride.rider2),
      supabase.rpc('release_ride_status', { p_uids: [ride.rider1, ride.rider2] }),
      // যে cancel করছে শুধু তার strike +1 (RPC auth.uid() ব্যবহার করে — cheat-proof)
      supabase.rpc('record_my_cancellation'),
    ]);
  }
}

export default new SupabaseRideService();
