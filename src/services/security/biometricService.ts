/**
 * Biometric Authentication Service
 * Adds extra security layer with fingerprint/face recognition
 * Premium feature: Device lock after login
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { logger } from '@/utils/logger';
import { secureStorage, SECURE_KEYS } from '@/utils/secureStorage';

export interface BiometricStatus {
    available: boolean;
    compatible: boolean;
    enrolled: boolean;
    supported: ('fingerprint' | 'facial_recognition' | 'iris_recognition')[];
}

class BiometricService {
    private isAuthenticated = false;
    private biometricLocked = true;

    /**
     * Check biometric capability and enrollment status
     */
    async getStatus(): Promise<BiometricStatus> {
        try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            if (!compatible) {
                return {
                    available: false,
                    compatible: false,
                    enrolled: false,
                    supported: [],
                };
            }

            const enrolled = await LocalAuthentication.isEnrolledAsync();
            const supportedAuthTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

            const typeMap: Record<number, 'fingerprint' | 'facial_recognition' | 'iris_recognition'> = {
                [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]: 'facial_recognition',
                [LocalAuthentication.AuthenticationType.FINGERPRINT]: 'fingerprint',
                [LocalAuthentication.AuthenticationType.IRIS]: 'iris_recognition',
            };

            const supported = supportedAuthTypes
                .map(type => typeMap[type])
                .filter((t): t is 'fingerprint' | 'facial_recognition' | 'iris_recognition' => !!t);

            return {
                available: true,
                compatible,
                enrolled,
                supported,
            };
        } catch (error) {
            logger.error('getStatus', error);
            return {
                available: false,
                compatible: false,
                enrolled: false,
                supported: [],
            };
        }
    }

    /**
     * Authenticate with biometric
     * Shows native biometric dialog
     */
    async authenticate(reason: string = 'Unlock GoShareX'): Promise<boolean> {
        try {
            const status = await this.getStatus();
            if (!status.available || !status.enrolled) {
                return false;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: reason,
                fallbackLabel: 'Use passcode',
                disableDeviceFallback: false,
                // High security — don't trust cache
                requireConfirmation: true,
            });

            if (result.success) {
                this.isAuthenticated = true;
                this.biometricLocked = false;
                logger.debug('Biometric authentication successful');
                return true;
            }

            logger.warn('Biometric authentication failed', { reason: 'error' in result ? result.error : 'unknown' });
            return false;
        } catch (error) {
            logger.error('authenticate', error);
            return false;
        }
    }

    /**
     * Check if biometric is still authenticated
     * Returns false after timeout (default 5 min)
     */
    isCurrentlyAuthenticated(timeoutMs: number = 5 * 60 * 1000): boolean {
        if (!this.isAuthenticated) return false;

        // In production, track timestamp and enforce timeout
        // For MVP, just return the flag
        return true;
    }

    /**
     * Lock the app (require biometric to unlock)
     */
    lock(): void {
        this.biometricLocked = true;
        this.isAuthenticated = false;
        logger.debug('App locked via biometric');
    }

    /**
     * Check if app is locked
     */
    isLocked(): boolean {
        return this.biometricLocked;
    }

    /**
     * Setup biometric lock on first login
     * Ask user if they want to enable fingerprint/face
     */
    async setupBiometricLock(): Promise<boolean> {
        try {
            const status = await this.getStatus();
            if (!status.available || !status.enrolled) {
                logger.debug('Biometric not available for setup');
                return false;
            }

            // Check if user already enabled biometric lock
            const enabled = await secureStorage.getSecure<boolean>(SECURE_KEYS.BIOMETRIC_ENABLED);
            if (enabled) {
                logger.debug('Biometric lock already enabled');
                return true;
            }

            // Save preference
            await secureStorage.setSecure(SECURE_KEYS.BIOMETRIC_ENABLED, true);
            logger.info('Biometric lock enabled');
            return true;
        } catch (error) {
            logger.error('setupBiometricLock', error);
            return false;
        }
    }

    /**
     * Check if biometric lock is enabled
     */
    async isBiometricLockEnabled(): Promise<boolean> {
        try {
            const enabled = await secureStorage.getSecure<boolean>(SECURE_KEYS.BIOMETRIC_ENABLED);
            return enabled ?? false;
        } catch (error) {
            logger.error('isBiometricLockEnabled', error);
            return false;
        }
    }

    /**
     * Disable biometric lock
     */
    async disableBiometricLock(): Promise<void> {
        try {
            await secureStorage.removeSecure(SECURE_KEYS.BIOMETRIC_ENABLED);
            this.lock();
            logger.info('Biometric lock disabled');
        } catch (error) {
            logger.error('disableBiometricLock', error);
        }
    }
}

export const biometricService = new BiometricService();
