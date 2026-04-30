/**
 * Secure Storage Service
 * Premium encryption for sensitive data using expo-secure-store + encryption
 * 
 * Data Classification:
 * - ENCRYPTED (expo-secure-store): FCM tokens, auth tokens, sensitive PII
 * - ENCRYPTED (AsyncStorage + crypto-js): User preferences (non-critical)
 * - PLAIN AsyncStorage: Public data only (destination names, etc)
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import { logger } from './logger';

// ─────────────────────────────────────────────────────────────────────────────
// SENSITIVE DATA — ENCRYPTED IN SECURE STORAGE
// ─────────────────────────────────────────────────────────────────────────────
export enum SECURE_KEYS {
    FCM_TOKEN = 'secure_fcm_token',
    AUTH_TOKEN = 'secure_auth_token',
    REFRESH_TOKEN = 'secure_refresh_token',
    USER_SENSITIVE = 'secure_user_sensitive',  // SSN, ID, etc (future)
    BIOMETRIC_ENABLED = 'secure_biometric_enabled',
    NOTIFICATION_PREFS = '@rideshare/notification_prefs',
    ONBOARDING_COMPLETE = '@rideshare/onboarding_complete',
}

// ─────────────────────────────────────────────────────────────────────────────
// ENCRYPTION KEY (should be device-unique from Secure Store)
// ─────────────────────────────────────────────────────────────────────────────
class SecureStorageService {
    private encryptionKey: string | null = null;
    private encryptionKeyPromise: Promise<string> | null = null;

    /**
     * Get or generate device-unique encryption key
     * Stored in encrypted secure storage (expo-secure-store)
     */
    private async getEncryptionKey(): Promise<string> {
        if (this.encryptionKey) return this.encryptionKey;
        if (this.encryptionKeyPromise) return this.encryptionKeyPromise;

        this.encryptionKeyPromise = (async () => {
            try {
                const stored = await SecureStore.getItemAsync('__encryption_key__');
                if (stored) {
                    this.encryptionKey = stored;
                    return stored;
                }

                // Generate new device-unique key
                const key = `EK_${Math.random().toString(36).slice(2)}${Date.now()}${Math.random().toString(36).slice(2)}`;
                await SecureStore.setItemAsync('__encryption_key__', key);
                this.encryptionKey = key;
                return key;
            } catch (error) {
                logger.error('getEncryptionKey', error);
                throw new Error('Failed to initialize encryption key');
            }
        })();

        return this.encryptionKeyPromise;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SECURE STORAGE (Encrypted via expo-secure-store)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Save sensitive data in encrypted secure storage
     */
    async setSecure(key: string, value: unknown): Promise<void> {
        try {
            const json = JSON.stringify(value);
            await SecureStore.setItemAsync(key, json);
            logger.debug('Secure storage set', { key });
        } catch (error) {
            logger.error('setSecure', error, { key });
            throw new Error(`Failed to save secure data: ${key}`);
        }
    }

    /**
     * Retrieve sensitive data from encrypted secure storage
     */
    async getSecure<T>(key: string): Promise<T | null> {
        try {
            const json = await SecureStore.getItemAsync(key);
            if (!json) return null;
            return JSON.parse(json) as T;
        } catch (error) {
            logger.error('getSecure', error, { key });
            return null;
        }
    }

    /**
     * Remove sensitive data from secure storage
     */
    async removeSecure(key: string): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(key);
            logger.debug('Secure storage removed', { key });
        } catch (error) {
            logger.error('removeSecure', error, { key });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ENCRYPTED ASYNCSTORAGE (For non-critical data that needs encryption)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Save data to AsyncStorage with encryption
     */
    async setEncrypted(key: string, value: unknown): Promise<void> {
        try {
            const json = JSON.stringify(value);
            const encryptionKey = await this.getEncryptionKey();
            const encrypted = CryptoJS.AES.encrypt(json, encryptionKey).toString();
            await AsyncStorage.setItem(`enc_${key}`, encrypted);
            logger.debug('Encrypted AsyncStorage set', { key });
        } catch (error) {
            logger.error('setEncrypted', error, { key });
        }
    }

    /**
     * Retrieve encrypted data from AsyncStorage
     */
    async getEncrypted<T>(key: string): Promise<T | null> {
        try {
            const encrypted = await AsyncStorage.getItem(`enc_${key}`);
            if (!encrypted) return null;

            const encryptionKey = await this.getEncryptionKey();
            const decrypted = CryptoJS.AES.decrypt(encrypted, encryptionKey).toString(CryptoJS.enc.Utf8);

            if (!decrypted) return null;
            return JSON.parse(decrypted) as T;
        } catch (error) {
            logger.error('getEncrypted', error, { key });
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PLAIN ASYNCSTORAGE (For non-sensitive data only)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Save plain (non-sensitive) data to AsyncStorage
     */
    async set<T>(key: string, value: T): Promise<void> {
        try {
            await AsyncStorage.setItem(key, JSON.stringify(value));
            logger.debug('AsyncStorage set', { key });
        } catch (error) {
            logger.error('set', error, { key });
        }
    }

    /**
     * Retrieve plain data from AsyncStorage
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await AsyncStorage.getItem(key);
            if (!value) return null;
            return JSON.parse(value) as T;
        } catch (error) {
            logger.error('get', error, { key });
            return null;
        }
    }

    /**
     * Remove data from AsyncStorage
     */
    async remove(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(key);
            logger.debug('AsyncStorage removed', { key });
        } catch (error) {
            logger.error('remove', error, { key });
        }
    }

    /**
     * Clear all AsyncStorage (use with caution)
     */
    async clear(): Promise<void> {
        try {
            await AsyncStorage.clear();
            logger.info('AsyncStorage cleared');
        } catch (error) {
            logger.error('clear', error);
        }
    }

    /**
     * Clear all data (secure + AsyncStorage) — logout only
     */
    async clearAll(): Promise<void> {
        try {
            // Clear AsyncStorage
            await this.clear();

            // Clear secure storage FCM token & auth tokens
            await Promise.allSettled([
                this.removeSecure(SECURE_KEYS.FCM_TOKEN),
                this.removeSecure(SECURE_KEYS.AUTH_TOKEN),
                this.removeSecure(SECURE_KEYS.REFRESH_TOKEN),
            ]);

            logger.info('All storage cleared');
        } catch (error) {
            logger.error('clearAll', error);
        }
    }
}

export const secureStorage = new SecureStorageService();
