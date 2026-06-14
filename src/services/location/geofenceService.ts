import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { DESTINATIONS, getDestinationById, getDestinationByName } from '@/constants/destinations';
import { logger } from '@/utils/logger';

export const GEOFENCE_TASK = 'RIDESHARE_GEOFENCE_TASK';

type GeofenceData = {
  eventType: Location.GeofencingEventType;
  region: { identifier: string; latitude: number; longitude: number; radius: number };
};

export const registerGeofenceTask = (onArrive: (destinationId: string) => void) => {
  TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
    if (error) {
      logger.error('geofenceTask', error);
      return;
    }
    const { eventType, region } = data as GeofenceData;
    if (eventType === Location.GeofencingEventType.Enter) {
      onArrive(region.identifier);
    }
  });
};

/**
 * Uber/Pathao-style auto-complete — গন্তব্যের lat/lng-এর চারপাশে geofence
 * বসায়। যেকোনো গন্তব্যে কাজ করে (preset তালিকায় থাকুক বা custom search করা)।
 * গন্তব্যে ঢুকলে (Enter) registerGeofenceTask-এর callback fire করে।
 *
 * @param identifier   geofence-এর id (যা callback-এ ফেরত আসে)
 * @param latitude     গন্তব্যের অক্ষাংশ
 * @param longitude    গন্তব্যের দ্রাঘিমাংশ
 * @param radius       কত মিটার ভিতরে ঢুকলে "পৌঁছেছে" ধরা হবে (default 100m)
 */
export const startGeofencingAtCoords = async (
  identifier: string,
  latitude: number,
  longitude: number,
  radius = 100,
) => {
  if (
    typeof latitude !== 'number' || typeof longitude !== 'number' ||
    Number.isNaN(latitude) || Number.isNaN(longitude)
  ) {
    logger.warn('geofenceService', 'Invalid destination coordinates for geofence');
    return;
  }

  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    logger.warn('geofenceService', 'Background location permission not granted');
    // Still try — foreground may work for in-app sessions
  }

  await Location.startGeofencingAsync(GEOFENCE_TASK, [
    {
      identifier,
      latitude,
      longitude,
      radius,
      notifyOnEnter: true,
      notifyOnExit: false,
    },
  ]);

  logger.info('geofenceService', `Geofence active at ${latitude},${longitude} (${radius}m)`);
};

/**
 * Start geofencing for a destination. Accepts either:
 * - Destination ID ('kuril')
 * - Destination name ('Kuril' / 'কুড়িল')
 *
 * শুধু preset DESTINATIONS-এর জন্য। custom গন্তব্যে startGeofencingAtCoords
 * ব্যবহার করো।
 */
export const startGeofencingForDestination = async (destinationIdOrName: string) => {
  const dest =
    getDestinationById(destinationIdOrName) ?? getDestinationByName(destinationIdOrName);

  if (!dest) {
    logger.warn(
      'geofenceService',
      `Destination "${destinationIdOrName}" not found in DESTINATIONS`,
    );
    return;
  }

  await startGeofencingAtCoords(dest.id, dest.lat, dest.lng, dest.geofenceRadius ?? 100);
};

export const stopGeofencing = async () => {
  try {
    const hasTask = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
    if (hasTask) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }
  } catch (err) {
    logger.warn('geofenceService.stop', err);
  }
};

/** For testing — list active destinations */
export const getActiveDestinations = () => DESTINATIONS;
