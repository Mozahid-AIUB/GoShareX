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
import * as ExpoLocation from 'expo-location';
import { supabase } from '@/config/supabase.config';
import type { ActiveRider, NearbyRider } from '@/types';
import { logger } from '@/utils/logger';

// প্রতিটা subscription-এর জন্য unique channel নাম — দ্রুত remount-এ একই নামের
// channel আবার subscribe করলে "callbacks after subscribe()" crash এড়ায়।
const uniq = (base: string) => `${base}:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// দুই গন্তব্য এই দূরত্বের (মিটার) মধ্যে = একই গন্তব্য = match।
// matchingService.SAME_DESTINATION_RADIUS_M এর সমান রাখা — দুই path এক rule।
// (distance/match হিসাব এখন server-side PostGIS RPC nearby_riders-এ হয়।)
const SAME_DESTINATION_RADIUS_M = 500;

// nearby rider কত দূর পর্যন্ত দেখাব (মিটার) — Map ও Home একই।
const HOME_VISIBLE_RADIUS_M = 1000;

class SupabasePresenceService {
  /** presence on/update — নিজের location active_riders-এ লেখে (upsert)।
   *  destLat/destLng (গন্তব্যের coordinate) geo-matching-এর জন্য। */
  async writeActiveRider(
    rider: ActiveRider & { destLat?: number; destLng?: number; vehicleType?: string },
  ): Promise<void> {
    const { error } = await supabase.from('active_riders').upsert({
      user_id: rider.uid,
      name: rider.name,
      lat: rider.lat,
      lng: rider.lng,
      destination: rider.destination,
      dest_lat: rider.destLat ?? null,
      dest_lng: rider.destLng ?? null,
      pickup_point: rider.pickupPoint,
      status: rider.status ?? 'waiting',
      rating: rider.rating,
      badge: rider.badge,
      photo_url: rider.photoURL ?? null,
      vehicle_type: rider.vehicleType ?? 'rickshaw',
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
    currentUser: {
      uid: string; lat: number; lng: number; destination: string;
      destLat?: number; destLng?: number;   // নিজের গন্তব্যের coordinate (geo-match)
      // প্রতি RPC call-এ সর্বশেষ GPS — দিলে closure-এর পুরনো lat/lng-এর বদলে
      // এটা ব্যবহার হয় (Map-এর সাথে একই fresh GPS → distance হুবহু এক)।
      getLatest?: () => { lat: number; lng: number; destLat?: number; destLng?: number } | null;
    },
    onUpdate: (riders: NearbyRider[]) => void,
  ): () => void {
    // server-side PostGIS query (nearby_riders RPC) — পুরো টেবিল client-এ
    // টানে না, শুধু radius-এর ভিতরের rider + distance + is_match দেয়।
    // distance server একবার হিসাব + 5m round করে → Map ও Home একই সংখ্যা।
    const load = async () => {
      const live = currentUser.getLatest?.() ?? null;
      const lat = live?.lat ?? currentUser.lat;
      const lng = live?.lng ?? currentUser.lng;
      const dLat = live?.destLat ?? currentUser.destLat;
      const dLng = live?.destLng ?? currentUser.destLng;
      const { data, error } = await supabase.rpc('nearby_riders', {
        p_lat: lat,
        p_lng: lng,
        p_dest_lat: dLat ?? null,
        p_dest_lng: dLng ?? null,
        p_radius_m: HOME_VISIBLE_RADIUS_M,
        p_same_dest_m: SAME_DESTINATION_RADIUS_M,
      });
      if (error) {
        logger.warn('presence.subscribe.rpc', error.message);
        return;
      }
      const nearby: NearbyRider[] = (data ?? [])
        .filter((row: any) => row.user_id !== currentUser.uid)   // নিজেকে বাদ
        .map((row: any) => ({
          uid: row.user_id,
          name: row.name,
          distance: Math.round(Number(row.distance_m ?? 0)),
          destination: row.destination ?? '',
          pickupPoint: row.pickup_point ?? '',
          rating: Number(row.rating ?? 5),
          badge: row.badge ?? '',
          photoURL: row.photo_url ?? undefined,
          lat: Number(row.lat),
          lng: Number(row.lng),
          vehicleType: row.vehicle_type ?? 'rickshaw',
          isMatch: !!row.is_match,
        } as NearbyRider));
      onUpdate(nearby);
    };
    void load();

    // real-time: active_riders-এ যেকোনো পরিবর্তন হলে RPC আবার চালাই।
    const channel = supabase
      .channel(uniq('active_riders_presence'))
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

  // ---- Map screen-এর জন্য (Firebase locationService এর সমতুল্য) ----
  private watchSub: ExpoLocation.LocationSubscription | null = null;
  private watchUserId: string | null = null;

  /**
   * GPS watch শুরু + প্রতি আপডেটে নিজের presence active_riders-এ লেখা।
   * Firebase locationService.startWatching এর সমতুল্য (একই signature)।
   */
  async startWatching(
    userId: string,
    destination: string,
    pickupPoint: string,
    onUpdate?: (location: { latitude: number; longitude: number; accuracy: number; speedMps: number | null; timestamp: number }) => void,
    userRating = 5,
    userBadge = 'New Rider',
    vehicleType = 'rickshaw',
    userName = 'Active Rider',
    destLat?: number,   // গন্তব্যের lat (geo-matching)
    destLng?: number,
  ): Promise<void> {
    this.watchUserId = userId;
    this.watchSub = await ExpoLocation.watchPositionAsync(
      { accuracy: ExpoLocation.Accuracy.Highest, timeInterval: 5000, distanceInterval: 5 },
      (location) => {
        const lat = location.coords.latitude;
        const lng = location.coords.longitude;
        // নিজের presence Supabase-এ লিখি (upsert) — dest lat/lng সহ
        void this.writeActiveRider({
          uid: userId,
          name: userName,
          lat,
          lng,
          destination,
          destLat,
          destLng,
          pickupPoint,
          status: 'waiting',
          rating: userRating,
          badge: userBadge,
          vehicleType,
          timestamp: location.timestamp,
        } as any);
        onUpdate?.({
          latitude: lat,
          longitude: lng,
          accuracy: location.coords.accuracy ?? 0,
          speedMps: location.coords.speed ?? null,
          timestamp: location.timestamp,
        });
      },
    );
  }

  async stopWatching(): Promise<void> {
    this.watchSub?.remove();
    this.watchSub = null;
    if (this.watchUserId) {
      await this.removeActiveRider(this.watchUserId);
      this.watchUserId = null;
    }
  }

  /**
   * Map screen-এর জন্য — server-side PostGIS (nearby_riders RPC) দিয়ে কাছের
   * rider + distance + is_match real-time দেয়। আগে পুরো টেবিল client-এ টেনে
   * findNearbyRiders করত; এখন server একবার distance হিসাব করে → Map ও Home
   * একই সংখ্যা (125m vs 135m অসঙ্গতি শেষ)। distanceM/isMatch RPC থেকে আসে।
   *
   * getLocation() — প্রতি load-এ caller-এর সর্বশেষ অবস্থান+গন্তব্য দেয় (GPS
   * নড়লে পরের load নতুন অবস্থান দিয়ে query করে)।
   */
  watchNearbyRiders(
    getLocation: () => { lat: number; lng: number; destLat?: number; destLng?: number } | null,
    callback: (riders: any[]) => void,
    radiusM = 1000,
    sameDestM = 500,
  ): () => void {
    const load = async () => {
      const loc = getLocation();
      if (!loc) return;
      const { data, error } = await supabase.rpc('nearby_riders', {
        p_lat: loc.lat,
        p_lng: loc.lng,
        p_dest_lat: loc.destLat ?? null,
        p_dest_lng: loc.destLng ?? null,
        p_radius_m: radiusM,
        p_same_dest_m: sameDestM,
      });
      if (error) {
        logger.warn('presence.watch.rpc', error.message);
        return;
      }
      // ActiveRiderRaw-এর মতো format (id + camelCase) + server distance/isMatch
      const riders = (data ?? []).map((r: any) => ({
        id: r.user_id,
        uid: r.user_id,
        name: r.name,
        lat: Number(r.lat),
        lng: Number(r.lng),
        destination: r.destination ?? '',
        destLat: r.dest_lat != null ? Number(r.dest_lat) : undefined,
        destLng: r.dest_lng != null ? Number(r.dest_lng) : undefined,
        pickupPoint: r.pickup_point ?? '',
        status: r.status ?? 'waiting',
        rating: Number(r.rating ?? 5),
        badge: r.badge ?? '',
        photoURL: r.photo_url ?? undefined,
        vehicleType: r.vehicle_type ?? 'rickshaw',
        distanceM: Math.round(Number(r.distance_m ?? 0)),  // server distance
        isMatchDest: !!r.is_match,                          // server: গন্তব্য মেলে
        timestamp: Date.now(),
      }));
      callback(riders);
    };
    void load();

    const channel = supabase
      .channel(uniq('active_riders_watch'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_riders' }, () => void load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const supabasePresenceService = new SupabasePresenceService();
