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
 * Start geofencing for a destination. Accepts either:
 * - Destination ID ('kuril')
 * - Destination name ('Kuril' / 'কুড়িল')
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

  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    logger.warn('geofenceService', 'Background location permission not granted');
    // Still try — foreground may work for in-app sessions
  }

  await Location.startGeofencingAsync(GEOFENCE_TASK, [
    {
      identifier: dest.id,
      latitude: dest.lat,
      longitude: dest.lng,
      radius: dest.geofenceRadius ?? 100,
      notifyOnEnter: true,
      notifyOnExit: false,
    },
  ]);

  logger.info('geofenceService', `Geofence active for ${dest.name} (${dest.geofenceRadius ?? 100}m)`);
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
