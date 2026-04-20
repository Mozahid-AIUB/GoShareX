import * as Location from 'expo-location';
import { ref, set, onValue, off } from 'firebase/database';
import { realtimeDb } from '@/config/firebase.config';
import ENV from '@/config/env';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

/**
 * Location Service
 * Handles GPS tracking and real-time location updates
 */
class LocationService {
  private watchSubscription: Location.LocationSubscription | null = null;
  private userId: string | null = null;

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      return backgroundStatus === 'granted';
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('Get location error:', error);
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
    onUpdate?: (location: LocationData) => void
  ): Promise<void> {
    try {
      this.userId = userId;

      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: ENV.locationUpdateInterval,
          distanceInterval: 10,
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
            timestamp: location.timestamp,
          };

          // Update Firebase Realtime Database
          this.updateLocationInFirebase(userId, locationData, destination, pickupPoint);

          // Callback
          if (onUpdate) {
            onUpdate(locationData);
          }
        }
      );
    } catch (error) {
      console.error('Start watching error:', error);
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
        await set(userRef, null);
        this.userId = null;
      }
    } catch (error) {
      console.error('Stop watching error:', error);
    }
  }

  /**
   * Update location in Firebase
   */
  private async updateLocationInFirebase(
    userId: string,
    location: LocationData,
    destination: string,
    pickupPoint: string
  ): Promise<void> {
    try {
      const userRef = ref(realtimeDb, `active_riders/${userId}`);
      await set(userRef, {
        lat: location.latitude,
        lng: location.longitude,
        destination,
        pickupPoint,
        timestamp: location.timestamp,
        status: 'waiting',
      });
    } catch (error) {
      console.error('Update location error:', error);
    }
  }

  /**
   * Get nearby riders
   */
  watchNearbyRiders(
    callback: (riders: any[]) => void
  ): () => void {
    const ridersRef = ref(realtimeDb, 'active_riders');
    
    const unsubscribe = onValue(ridersRef, (snapshot) => {
      const data = snapshot.val();
      const riders = data ? Object.entries(data).map(([id, rider]) => ({
        id,
        ...rider as any,
      })) : [];
      
      callback(riders);
    });

    return () => off(ridersRef, 'value', unsubscribe);
  }
}

export default new LocationService();
