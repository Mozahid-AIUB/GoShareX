/**
 * RideShare AIUB — Typed AsyncStorage Wrappers
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

/** Enumeration of all keys used across the app */
export enum STORAGE_KEYS {
  USER_PROFILE = '@rideshare/user_profile',
  FCM_TOKEN = '@rideshare/fcm_token',
  DEFAULT_PICKUP = '@rideshare/default_pickup',
  NOTIFICATION_PREFS = '@rideshare/notification_prefs',
  ONBOARDING_COMPLETE = '@rideshare/onboarding_complete',
  LAST_KNOWN_LOCATION = '@rideshare/last_known_location',
}

/**
 * Retrieve and deserialize a JSON value from AsyncStorage.
 * Returns null when the key does not exist or on parse error.
 */
async function get<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.error('storage.get', err, { key });
    return null;
  }
}

/**
 * Serialize and persist a value to AsyncStorage.
 */
async function set(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    logger.error('storage.set', err, { key });
  }
}

/**
 * Remove a single key from AsyncStorage.
 */
async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (err) {
    logger.error('storage.remove', err, { key });
  }
}

/**
 * Wipe all app data from AsyncStorage.
 * Use with caution — intended for logout / reset flows.
 */
async function clear(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (err) {
    logger.error('storage.clear', err);
  }
}

export const storage = { get, set, remove, clear };
