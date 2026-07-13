import { useEffect } from 'react';
import { subscribeToNearbyRiders } from '@/services/ride/matchingService';
import { useRideStore, useAuthStore } from '@/store';
import { useLocationStore } from '@/store';

export function useNearbyRiders(
  destination: string | null,
  enabled: boolean = true,
  destLat?: number,   // নিজের গন্তব্যের lat (geo-match — text না, coordinate মেলাই)
  destLng?: number,
) {
  const { latitude, longitude } = useLocationStore();
  const gpsReady = latitude != null && longitude != null;
  const { setNearbyRiders } = useRideStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!enabled) {
      setNearbyRiders([]);
      return;
    }

    if (!gpsReady || !destination || !user?.uid) return;
    const { latitude: lat, longitude: lng } = useLocationStore.getState();
    if (lat == null || lng == null) return;
    const unsubscribe = subscribeToNearbyRiders(
      {
        uid: user.uid, lat, lng, destination, destLat, destLng,
        // প্রতি RPC call-এ সর্বশেষ GPS (Map-এর মতো) → দুই screen একই distance।
        getLatest: () => {
          const s = useLocationStore.getState();
          if (s.latitude == null || s.longitude == null) return null;
          return { lat: s.latitude, lng: s.longitude, destLat, destLng };
        },
      },
      setNearbyRiders
    );
    return unsubscribe;
    // gpsReady (true/false) dependency-তে — raw latitude/longitude না।
    // GPS প্রথমবার পাওয়ার মুহূর্তে (null → set) একবারই re-run হবে, তারপর
    // GPS-এর প্রতিটা tick-এ আর subscription tear-down + recreate হবে না
    // (fresh coordinate প্রতি RPC call-এ getLatest() থেকেই আসে, উপরে)।
    // আগে raw latitude/longitude dependency-তে থাকায় প্রতিটা GPS tick-এ
    // subscription রিস্টার্ট হতো — Home tab lazy-mount এর পর কখনো unmount
    // হয় না বলে এই churn ব্যাকগ্রাউন্ডে সারাক্ষণ চলত এবং অন্য tab-এ
    // switch করার সময় JS thread-এর সময় কেড়ে নিত।
  }, [destination, enabled, gpsReady, destLat, destLng, setNearbyRiders, user?.uid]);
}
