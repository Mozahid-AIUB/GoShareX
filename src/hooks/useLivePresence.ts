import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import locationService from '@/services/locationService';
import { useAuthStore } from '@/store/authStore';
import { useRideStore } from '@/store/rideStore';
import { useLocationStore } from '@/store/locationStore';
import { DESTINATIONS } from '@/constants/locations';
import { sanitizeSpeedKmh } from '@/utils/locationSpeed';
import { logger } from '@/utils/logger';

/**
 * useLivePresence — "Go Live" presence broadcaster (GLOBAL, single owner).
 *
 * আগে নিজের presence (active_riders-এ লেখা) হত শুধু LiveMapScreen খোলা থাকলে।
 * ফলে দুজন মানুষ Home-এ থাকলে কেউ কাউকে খুঁজে পেত না (discovery অর্ধেক)।
 * এই hook AppNavigator-এ একবার mount হয় আর নিচের সব শর্ত সত্যি হলে যেকোনো
 * screen থেকে presence broadcast করে — তাই ইউজার সব জায়গায় discoverable:
 *   logged in  +  presenceEnabled ("Go Live" on)  +  গন্তব্য সেট  +  app foreground
 *
 * গুরুত্বপূর্ণ: `supabasePresenceService` একটাই GPS subscription রাখে
 * (this.watchSub), তাই broadcast-এর একটাই মালিক থাকতে হয়। এই hook সেই একমাত্র
 * caller — LiveMapScreen আর নিজে startWatching/stopWatching ডাকে না।
 */
export function useLivePresence(): void {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const presenceEnabled = useRideStore((s) => s.presenceEnabled);
  const destination = useRideStore((s) => s.destination);
  const customDestination = useRideStore((s) => s.customDestination);
  const pickupPoint = useRideStore((s) => s.pickupPoint);
  const vehicleType = useRideStore((s) => s.vehicleType);

  // app foreground কিনা — background-এ গেলে broadcast বন্ধ (privacy + battery)।
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      setForeground(s === 'active');
    });
    return () => sub.remove();
  }, []);

  // গন্তব্যের নাম + coordinate বের করি (custom হলে সেটা, নাহলে preset DESTINATIONS)।
  let destName: string | undefined;
  let destLat: number | undefined;
  let destLng: number | undefined;
  if (customDestination) {
    destName = customDestination.name;
    destLat = customDestination.lat;
    destLng = customDestination.lng;
  } else if (destination) {
    const d = DESTINATIONS.find((x) => x.id === destination);
    if (d) {
      destName = d.label;
      destLat = d.coordinates.lat;
      destLng = d.coordinates.lng;
    }
  }

  // 0,0 / NaN গন্তব্য (GPS fail) বাদ — ভুল match এড়াতে।
  const validDest =
    destLat != null && destLng != null &&
    Number.isFinite(destLat) && Number.isFinite(destLng) &&
    !(destLat === 0 && destLng === 0);

  const uid = user?.uid;
  const shouldBroadcast = isAuthenticated && !!uid && presenceEnabled && foreground && validDest;

  // রাইডার-মেটা (payload-এ যায়) — primitive deps যাতে object reference বদলে
  // অযথা restart না হয়।
  const rating = user?.rating ?? 5;
  const badge = user?.badge ?? 'New Rider';
  const name = user?.name ?? 'Active Rider';

  useEffect(() => {
    if (!shouldBroadcast || !uid || !destName || destLat == null || destLng == null) return;

    let active = true;
    const { setLocation, setTracking } = useLocationStore.getState();

    void (async () => {
      try {
        await locationService.startWatching(
          uid,
          destName,
          pickupPoint ?? 'Main Gate',
          (loc: { latitude: number; longitude: number; accuracy: number; speedMps: number | null }) => {
            if (!active) return;
            setLocation(loc.latitude, loc.longitude, loc.accuracy, sanitizeSpeedKmh(loc.speedMps, loc.accuracy));
          },
          rating,
          badge,
          vehicleType ?? 'rickshaw',
          name,
          destLat,
          destLng,
        );
        if (active) setTracking(true);
      } catch (e) {
        logger.warn('useLivePresence', `broadcast start failed: ${String(e)}`);
      }
    })();

    // শর্ত বদলালে / unmount-এ presence সরিয়ে দিই (active_riders row মুছে যায়)।
    return () => {
      active = false;
      void locationService.stopWatching();
      useLocationStore.getState().setTracking(false);
    };
  }, [shouldBroadcast, uid, destName, destLat, destLng, pickupPoint, vehicleType, rating, badge, name]);
}
