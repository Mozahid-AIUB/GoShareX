// ============================================================
// Supabase Presence Service — live rider presence (active_riders)
//
// Firebase RTDB active_riders -> Supabase active_riders টেবিল +
// Realtime। তিনটা কাজ (Firebase realtimeDb/matchingService এর সমতুল্য):
//   writeActiveRider   — presence on/update (location broadcast)
//   removeActiveRider  — presence off
//   subscribeToNearbyRiders — সব active rider live + distance filter
//
// distance filter (haversine) client-side থাকে (Firebase-এর মতোই) —
// PostGIS ছাড়াই কাজ করে; ইউজার বাড়লে পরে server-side বানানো যাবে।
// ============================================================
import { supabase } from '@/config/supabase.config';
import { haversineDistance } from '@/utils/haversine';
import { PROXIMITY_ZONES } from '@/constants/locations';
import type { ActiveRider, NearbyRider } from '@/types';
import { logger } from '@/utils/logger';

// active_riders row -> ActiveRider-এর মতো object (subscribe-এ ব্যবহার)
function rowToRider(row: any): ActiveRider {
  return {
    uid: row.user_id,
    name: row.name,
    lat: Number(row.lat),
    lng: Number(row.lng),
    destination: row.destination ?? '',
    pickupPoint: row.pickup_point ?? '',
    status: row.status ?? 'waiting',
    rating: Number(row.rating ?? 5),
    badge: row.badge ?? '',
    photoURL: row.photo_url ?? undefined,
    timestamp: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  } as ActiveRider;
}

class SupabasePresenceService {
  /** presence on/update — নিজের location active_riders-এ লেখে (upsert)। */
  async writeActiveRider(rider: ActiveRider): Promise<void> {
    const { error } = await supabase.from('active_riders').upsert({
      user_id: rider.uid,
      name: rider.name,
      lat: rider.lat,
      lng: rider.lng,
      destination: rider.destination,
      pickup_point: rider.pickupPoint,
      status: rider.status ?? 'waiting',
      rating: rider.rating,
      badge: rider.badge,
      photo_url: rider.photoURL ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) logger.warn('presence.writeActiveRider', error.message);
  }

  /** presence off — নিজের row মুছে। */
  async removeActiveRider(uid: string): Promise<void> {
    const { error } = await supabase.from('active_riders').delete().eq('user_id', uid);
    if (error) logger.warn('presence.removeActiveRider', error.message);
  }

  /** নিজের status আপডেট (যেমন riding হলে)। */
  async setRiderStatus(uid: string, status: 'waiting' | 'matched' | 'riding'): Promise<void> {
    await supabase
      .from('active_riders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', uid);
  }

  /**
   * সব active rider live শোনে + distance দিয়ে nearby filter করে।
   * Firebase subscribeToNearbyRiders এর হুবহু behavior।
   * unsubscribe function ফেরত।
   */
  subscribeToNearbyRiders(
    currentUser: { uid: string; lat: number; lng: number; destination: string },
    onUpdate: (riders: NearbyRider[]) => void,
  ): () => void {
    const compute = (rows: any[]) => {
      const nearby: NearbyRider[] = [];
      for (const row of rows) {
        const rider = rowToRider(row);
        if (rider.uid === currentUser.uid) continue;
        if (rider.status === 'riding') continue;

        const distance = haversineDistance(
          currentUser.lat, currentUser.lng, rider.lat, rider.lng,
        );
        if (distance <= PROXIMITY_ZONES.VISIBLE_ONLY) {
          nearby.push({
            uid: rider.uid,
            name: rider.name,
            distance: Math.round(distance),
            destination: rider.destination,
            pickupPoint: rider.pickupPoint,
            rating: rider.rating,
            badge: rider.badge,
            photoURL: rider.photoURL,
            lat: rider.lat,
            lng: rider.lng,
            isMatch: rider.destination === currentUser.destination,
          } as NearbyRider);
        }
      }
      nearby.sort((a, b) => a.distance - b.distance);
      onUpdate(nearby);
    };

    // initial load
    const load = async () => {
      const { data, error } = await supabase.from('active_riders').select('*');
      if (error) {
        logger.warn('presence.subscribe.load', error.message);
        return;
      }
      compute(data ?? []);
    };
    void load();

    // real-time: active_riders-এ যেকোনো পরিবর্তন (insert/update/delete) হলে
    // পুরো তালিকা আবার লোড করি (rider সংখ্যা সাধারণত কম, তাই সহজ ও নির্ভরযোগ্য)।
    const channel = supabase
      .channel('active_riders_presence')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_riders' },
        () => void load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const supabasePresenceService = new SupabasePresenceService();
