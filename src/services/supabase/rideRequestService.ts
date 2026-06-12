// ============================================================
// Ride Request Service — "Request → accept → chat" handshake।
//
// A request পাঠায় → B realtime দেখে → accept করলে chat তৈরি হয় (chat_id),
// দুজনেই chat-এ ঢোকে → decline করলে শেষ।
// ============================================================
import { supabase } from '@/config/supabase.config';
import { logger } from '@/utils/logger';
import supabaseChatService from '@/services/supabase/chat';

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
  /** A → B request পাঠায় (বা বিদ্যমান pending থাকলে সেটাই)। request id ফেরত। */
  async sendRequest(args: {
    fromUser: string; fromName: string; toUser: string;
    destination: string; destLat?: number; destLng?: number; fare?: number;
    fromRating?: number; fromBadge?: string; fromVehicle?: string;
    fromLat?: number; fromLng?: number;
  }): Promise<string> {
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
      throw new Error('Could not send request. Please try again.');
    }
    return data.id;
  }

  /**
   * B request accept করে → chat তৈরি করে chat_id সেট। chatId ফেরত (দুজনেই
   * এই chat-এ ঢুকবে; A realtime-এ chat_id দেখে navigate করতে পারে)।
   */
  async acceptRequest(req: RideRequest, receiverName: string): Promise<string> {
    // chat বানাই (getOrCreateChat — ডুপ্লিকেট হলে বিদ্যমানটাই)
    const chatId = await supabaseChatService.getOrCreateChat(
      req.fromUser, req.fromName,
      req.toUser, receiverName,
      req.destination, req.fare,
    );
    const { error } = await supabase
      .from('ride_requests')
      .update({ status: 'accepted', chat_id: chatId, responded_at: new Date().toISOString() })
      .eq('id', req.id);
    if (error) {
      logger.warn('rideRequest.accept', error.message);
      throw new Error('Could not accept request.');
    }
    return chatId;
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
