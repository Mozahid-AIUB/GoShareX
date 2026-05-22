import * as Location from 'expo-location';
import { ref, set, onValue, off } from 'firebase/database';
import { realtimeDb } from '@/config/firebase.config';
import { auth } from '@/config/firebase.config';
import ENV from '@/config/env';
import type { ActiveRiderRaw } from '@/services/firebase/matchingService';
import { logger } from '@/utils/logger';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speedMps?: number | null;
  timestamp: number;
  address?: string;
}

/**
 * Location Service
 * Handles GPS tracking and real-time location updates
 */
class LocationService {
  private watchSubscription: Location.LocationSubscription | null = null;
  private userId: string | null = null;
  private realtimeWriteDenied = false;
  private readonly targetAccuracyMeters = 20;

  private isPermissionDenied(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.toUpperCase().includes('PERMISSION_DENIED');
  }

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        return false;
      }

      // Foreground permission is enough for showing the live map.
      // Background access can be requested later for ride tracking flows.
      return true;
    } catch (error) {
      logger.error('locationService.permissionRequest', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        speedMps: location.coords.speed ?? null,
        timestamp: location.timestamp,
      };
    } catch (error) {
      logger.error('locationService.getLocation', error);
      return null;
    }
  }

  async getFreshCurrentLocation(options?: {
    maxAccuracyMeters?: number;
    timeoutMs?: number;
  }): Promise<LocationData | null> {
    const maxAccuracyMeters = options?.maxAccuracyMeters ?? this.targetAccuracyMeters;
    const timeoutMs = options?.timeoutMs ?? 12000;
    const startedAt = Date.now();
    let bestLocation: LocationData | null = null;

    while (Date.now() - startedAt < timeoutMs) {
      const current = await this.getCurrentLocation();
      if (current) {
        if (!bestLocation || current.accuracy < bestLocation.accuracy) {
          bestLocation = current;
        }

        if (current.accuracy > 0 && current.accuracy <= maxAccuracyMeters) {
          return current;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    return bestLocation;
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      // Try Google Geocoding API first — gives specific area/road names in Bangladesh
      const apiKey = ENV.googleMapsApiKey;
      if (apiKey) {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&language=en`;
        const resp = await fetch(url);
        const json = await resp.json();

        if (json.status === 'OK' && json.results?.length > 0) {
          const components: Record<string, string> = {};
          for (const result of json.results) {
            for (const c of result.address_components ?? []) {
              for (const t of c.types) {
                if (!components[t]) components[t] = c.long_name;
              }
            }
          }

          const area =
            components['sublocality_level_2'] ??
            components['sublocality_level_1'] ??
            components['sublocality'] ??
            components['neighborhood'] ??
            components['route'] ??
            null;

          const city = components['locality'] ?? null;

          if (area) return city ? `${area}, ${city}` : area;

          // No area found — clean up formatted_address
          const formatted: string = json.results[0]?.formatted_address ?? '';
          const parts = formatted
            .split(',')
            .map((p: string) => p.trim())
            .filter((p: string) =>
              p &&
              !/Bangladesh/i.test(p) &&
              !/District/i.test(p) &&
              !/Division/i.test(p) &&
              !/^\d{4,}$/.test(p) &&
              !/^[A-Z0-9]{4,}\+/.test(p)
            )
            .slice(0, 2);
          if (parts.length) return parts.join(', ');
        }
      }

      // Fallback: expo-location
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      const first = results[0];
      if (!first) return null;

      const isPlusCode = (s?: string | null) => !!s && /^[A-Z0-9]{4,}\+[A-Z0-9]+/.test(s);
      const expoParts = [
        isPlusCode(first.name) ? null : (first.name ?? null),
        first.street ?? null,
        first.subregion ?? null,
        first.city ?? null,
      ].filter((p): p is string => !!p && !isPlusCode(p) && !/District/i.test(p) && !/Division/i.test(p));

      return expoParts.filter((p, i) => i === 0 || p !== expoParts[i - 1]).slice(0, 2).join(', ') || null;
    } catch (error) {
      logger.error('locationService.reverseGeocode', error);
      return null;
    }
  }

  /**
   * Start watching location
   */
  async startWatching(
    userId: string,
    destination: string,
    pickupPoint: string,
    onUpdate?: (location: LocationData) => void,
    userRating: number = 5,
    userBadge: string = 'New Rider',
    vehicleType: string = 'rickshaw',
  ): Promise<void> {
    try {
      this.userId = userId;
      this.realtimeWriteDenied = false;

      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: ENV.locationUpdateInterval,
          distanceInterval: 5,
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
            speedMps: location.coords.speed ?? null,
            timestamp: location.timestamp,
          };

          // Update Firebase Realtime Database
          this.updateLocationInFirebase(userId, locationData, destination, pickupPoint, userRating, userBadge, vehicleType);

          // Callback
          if (onUpdate) {
            onUpdate(locationData);
          }
        }
      );
    } catch (error) {
      logger.error('locationService.startWatching', error);
      throw error;
    }
  }

  /**
   * Stop watching location
   */
  async stopWatching(): Promise<void> {
    try {
      if (this.watchSubscription) {
        this.watchSubscription.remove();
        this.watchSubscription = null;
      }

      // Remove from active riders
      if (this.userId) {
        const userRef = ref(realtimeDb, `active_riders/${this.userId}`);
        if (!this.realtimeWriteDenied) {
          await set(userRef, null);
        }
        this.userId = null;
      }
    } catch (error) {
      if (!this.isPermissionDenied(error)) {
        logger.error('locationService.stopWatching', error);
      }
    }
  }

  /**
   * Update location in Firebase
   */
  private async updateLocationInFirebase(
    userId: string,
    location: LocationData,
    destination: string,
    pickupPoint: string,
    userRating: number = 5,
    userBadge: string = 'New Rider',
    vehicleType: string = 'rickshaw',
  ): Promise<void> {
    try {
      if (this.realtimeWriteDenied) {
        return;
      }

      const userRef = ref(realtimeDb, `active_riders/${userId}`);
      const currentUser = auth.currentUser;
      const fallbackName =
        currentUser?.displayName?.trim() ||
        currentUser?.email?.split('@')[0] ||
        'Active Rider';

      await set(userRef, {
        uid: userId,
        name: fallbackName,
        lat: location.latitude,
        lng: location.longitude,
        speedMps: location.speedMps ?? null,
        destination,
        pickupPoint,
        rating: userRating,
        badge: userBadge,
        vehicleType,
        timestamp: location.timestamp,
        status: 'waiting',
      });
    } catch (error) {
      if (this.isPermissionDenied(error)) {
        this.realtimeWriteDenied = true;
        return;
      }

      logger.error('locationService.updateLocation', error);
    }
  }

  /**
   * Get nearby riders
   */
  watchNearbyRiders(
    callback: (riders: ActiveRiderRaw[]) => void
  ): () => void {
    const ridersRef = ref(realtimeDb, 'active_riders');

    const unsubscribe = onValue(ridersRef, (snapshot) => {
      const data = snapshot.val() as Record<string, Omit<ActiveRiderRaw, 'id'>> | null;
      const riders: ActiveRiderRaw[] = data
        ? Object.entries(data).map(([id, rider]) => ({ id, ...rider }))
        : [];
      callback(riders);
    });

    return () => off(ridersRef, 'value', unsubscribe);
  }
}

export default new LocationService();
