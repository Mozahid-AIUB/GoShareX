import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { DESTINATIONS } from '@constants/destinations';

export const GEOFENCE_TASK = 'RIDESHARE_GEOFENCE_TASK';

export const registerGeofenceTask = (onArrive: (destinationId: string) => void) => {
  TaskManager.defineTask(GEOFENCE_TASK, ({ data, error }: any) => {
    if (error) return;
    const { eventType, region } = data;
    if (eventType === Location.GeofencingEventType.Enter) {
      onArrive(region.identifier);
    }
  });
};

export const startGeofencingForDestination = async (destinationId: string) => {
  const dest = DESTINATIONS.find((d) => d.id === destinationId);
  if (!dest) return;

  await Location.startGeofencingAsync(GEOFENCE_TASK, [
    {
      identifier: dest.id,
      latitude: dest.lat,
      longitude: dest.lng,
      radius: dest.geofenceRadius,
    },
  ]);
};

export const stopGeofencing = () =>
  Location.stopGeofencingAsync(GEOFENCE_TASK);
