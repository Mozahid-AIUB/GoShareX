// ============================================================
// Ride Request Service — "Request → accept → chat" handshake।
//
// A request পাঠায় → B realtime দেখে → accept করলে chat তৈরি হয় (chat_id),
// দুজনেই chat-এ ঢোকে → decline করলে শেষ।
// ============================================================
import { supabase } from '@/config/supabase.config';
import { logger } from '@/utils/logger';

export interface RideRequest {
  id: string;
  fromUser: string;
  toUser: string;
  fromName: string;
  destination: string;
  destLat?: number;
  destLng?: number;
  fare: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  chatId?: string;
  createdAt: number;
  // sender info (banner premium card)
  fromRating?: number;
  fromBadge?: string;
  fromVehicle?: 'rickshaw' | 'cng' | 'bike';
  fromLat?: number;
  fromLng?: number;
}

function rowToRequest(r: any): RideRequest {
  return {
    id: r.id,
    fromUser: r.from_user,
    toUser: r.to_user,
    fromName: r.from_name ?? '',
    destination: r.destination ?? '',
    destLat: r.dest_lat != null ? Number(r.dest_lat) : undefined,
    destLng: r.dest_lng != null ? Number(r.dest_lng) : undefined,
    fare: Number(r.fare ?? 0),
    status: r.status,
    chatId: r.chat_id ?? undefined,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    fromRating: r.from_rating != null ? Number(r.from_rating) : undefined,
    fromBadge: r.from_badge ?? undefined,
    fromVehicle: r.from_vehicle ?? undefined,
    fromLat: r.from_lat != null ? Number(r.from_lat) : undefined,
    fromLng: r.from_lng != null ? Number(r.from_lng) : undefined,
  };
}

class RideRequestService {
  /** নিজের ride_status (free/reserved/in_ride) — request পাঠানোর আগে গার্ড। */
  async getMyRideStatus(userId: string): Promise<'free' | 'reserved' | 'in_ride'> {
    const { data } = await supabase.from('users').select('ride_status').eq('id', userId).single();
    return (data?.ride_status as any) ?? 'free';
  }

  /** ride শেষ/cancel — দুজনকে free করি (RPC)। */
  async releaseRideStatus(uids: string[]): Promise<void> {
    const { error } = await supabase.rpc('release_ride_status', { p_uids: uids });
    if (error) logger.warn('rideRequest.release', error.message);
  }

  /** deal confirm — reserved → in_ride (lock দৃঢ়)। */
  async setRidersInRide(uids: string[]): Promise<void> {
    const { error } = await supabase.rpc('set_riders_in_ride', { p_uids: uids });
    if (error) logger.warn('rideRequest.setInRide', error.message);
  }

  /** A → B request পাঠায় (বা বিদ্যমান pending থাকলে সেটাই)। request id ফেরত। */
  async sendRequest(args: {
    fromUser: string; fromName: string; toUser: string;
    destination: string; destLat?: number; destLng?: number; fare?: number;
    fromRating?: number; fromBadge?: string; fromVehicle?: string;
    fromLat?: number; fromLng?: number;
  }): Promise<string> {
    // গার্ড: নিজে free না হলে (একটা ride চলছে) নতুন request পাঠাতে পারবে না
    const myStatus = await this.getMyRideStatus(args.fromUser);
    if (myStatus !== 'free') {
      throw new Error('Finish your current ride before requesting another.');
    }
    // বিদ্যমান pending থাকলে সেটাই (partial unique index ডুপ্লিকেট আটকায়)
    const { data: existing } = await supabase
      .from('ride_requests')
      .select('id')
      .eq('from_user', args.fromUser)
      .eq('to_user', args.toUser)
      .eq('status', 'pending')
      .maybeSingle();
    if (existing?.id) return existing.id;

    const { data, error } = await supabase
      .from('ride_requests')
      .insert({
        from_user: args.fromUser,
        to_user: args.toUser,
        from_name: args.fromName,
        destination: args.destination,
        dest_lat: args.destLat ?? null,
        dest_lng: args.destLng ?? null,
        fare: args.fare ?? 0,
        from_rating: args.fromRating ?? null,
        from_badge: args.fromBadge ?? null,
        from_vehicle: args.fromVehicle ?? null,
        from_lat: args.fromLat ?? null,
        from_lng: args.fromLng ?? null,
        status: 'pending',
      })
      .select('id')
      .single();
    if (error || !data) {
      logger.warn('rideRequest.send', error?.message);
      // duplicate key (23505) = ইতিমধ্যে একটা pending request আছে (race বা
      // RLS-এ existing চেক miss)। fail না করে বিদ্যমানটাই খুঁজে ফেরত দিই।
      if (error?.code === '23505') {
        const { data: dup } = await supabase
          .from('ride_requests')
          .select('id')
          .eq('from_user', args.fromUser)
          .eq('to_user', args.toUser)
          .eq('status', 'pending')
          .limit(1)
          .maybeSingle();
        if (dup?.id) return dup.id;
      }
      // FK violation (23503) = receiver আসল user না (যেমন fake/test rider)।
      if (error?.code === '23503') {
        throw new Error('This rider is not available to request right now.');
      }
      throw new Error('Could not send request. Please try again.');
    }
    return data.id;
  }

  /**
   * B request accept করে — ATOMIC RPC (race-safe)। ভিতরে: দুজন free কিনা
   * চেক + lock (reserved) + chat তৈরি + এই দুজনের বাকি pending request expire।
   * concurrent accept হলে DB একটাকেই জিততে দেয়। chatId ফেরত।
   */
  async acceptRequest(req: RideRequest, receiverName: string): Promise<string> {
    const { data, error } = await supabase.rpc('accept_ride_request', {
      p_request_id: req.id,
      p_receiver_name: receiverName,
    });
    if (error || !data) {
      logger.warn('rideRequest.accept', error?.message);
      // RPC-র raise message ইউজারকে দেখাই (already in ride / no longer available)
      const msg = error?.message ?? '';
      if (msg.includes('already in a ride')) throw new Error('You already have an active ride.');
      if (msg.includes('no longer available') || msg.includes('no longer pending'))
        throw new Error('This request is no longer available.');
      throw new Error('Could not accept request. Please try again.');
    }
    return data as string;
  }

  /** B decline করে। */
  async declineRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('ride_requests')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', requestId);
    if (error) logger.warn('rideRequest.decline', error.message);
  }

  /** A নিজের pending request cancel করে। */
  async cancelRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('ride_requests')
      .update({ status: 'cancelled', responded_at: new Date().toISOString() })
      .eq('id', requestId);
    if (error) logger.warn('rideRequest.cancel', error.message);
  }

  /**
   * B-এর incoming pending request live শোনে (Home banner)। unsubscribe ফেরত।
   */
  listenToIncoming(userId: string, cb: (requests: RideRequest[]) => void): () => void {
    const load = async () => {
      const { data } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('to_user', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      cb((data ?? []).map(rowToRequest));
    };
    void load();
    const channel = supabase
      .channel(`ride_req_in:${userId}:${Date.now()}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ride_requests', filter: `to_user=eq.${userId}` },
        () => void load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }

  /**
   * A-এর outgoing request live শোনে — accept হলে chat_id পায় (chat-এ navigate)।
   */
  listenToOutgoing(userId: string, cb: (requests: RideRequest[]) => void): () => void {
    const load = async () => {
      const { data } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('from_user', userId)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false });
      cb((data ?? []).map(rowToRequest));
    };
    void load();
    const channel = supabase
      .channel(`ride_req_out:${userId}:${Date.now()}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ride_requests', filter: `from_user=eq.${userId}` },
        () => void load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }
}

export const rideRequestService = new RideRequestService();
