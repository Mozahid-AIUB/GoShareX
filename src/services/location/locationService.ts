import * as ExpoLocation from 'expo-location';
import { ref, set, remove } from 'firebase/database';
import { rtdb } from '@/services/firebase/config';
import { RTDB_PATHS } from '@/constants/firebaseKeys';
import { APP_CONFIG } from '@/constants/config';
import type { ActiveRider } from '@/types';

let watchSubscription: ExpoLocation.LocationSubscription | null = null;

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<ExpoLocation.LocationObject> {
  return ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
}

export async function startBroadcastingLocation(
  riderData: Omit<ActiveRider, 'lat' | 'lng' | 'timestamp'>
): Promise<void> {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) throw new Error('Location permission denied');

  watchSubscription = await ExpoLocation.watchPositionAsync(
    {
      accuracy: ExpoLocation.Accuracy.High,
      timeInterval: APP_CONFIG.LOCATION_UPDATE_INTERVAL_MS,
      distanceInterval: 5,
    },
    async (location) => {
      const payload: ActiveRider = {
        ...riderData,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        timestamp: Date.now(),
      };
      await set(ref(rtdb, RTDB_PATHS.USER_LOCATION(riderData.uid)), payload);
    }
  );
}

export async function stopBroadcastingLocation(uid: string): Promise<void> {
  watchSubscription?.remove();
  watchSubscription = null;
  await remove(ref(rtdb, RTDB_PATHS.USER_LOCATION(uid)));
}
