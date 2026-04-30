/**
 * Google Sign-In Authentication Service
 * Handles Google OAuth integration with Firebase
 */

import {
    signInWithCredential,
    GoogleAuthProvider,
    signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import Constants from 'expo-constants';
import { auth, db } from '@/config/firebase.config';
import { User } from '@/types/auth.types';
import { isValidEmail } from '@/utils/validators';

const extraConfig =
    (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined) ??
    ((Constants as any).manifest?.extra as Record<string, string | undefined> | undefined) ??
    {};
const GOOGLE_WEB_CLIENT_ID: string = extraConfig.GOOGLE_WEB_CLIENT_ID ?? '';

// For development: use GoogleSignin library
// In production/EAS builds: use platform-specific implementations
let GoogleSignin: any = null;

// Attempt to load Google Sign-In library
try {
    // This will be available in development builds, not in Expo Go
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (e) {
    console.warn('Google Sign-In library not available in current environment');
}

class GoogleAuthService {
    /**
     * Initialize Google Sign-In
     * Should be called once on app startup
     */
    async initialize() {
        if (!GoogleSignin) {
            throw new Error('Google Sign-In library not available. Please build the app with development build.');
        }

        try {
            // Configure Google Sign-In
            GoogleSignin.configure({
                webClientId: GOOGLE_WEB_CLIENT_ID,
                // Optional: include offline access
                offlineAccess: true,
                scopes: ['email', 'profile'],
            });

            console.log('✓ Google Sign-In initialized');
        } catch (error: any) {
            console.error('Failed to initialize Google Sign-In:', error);
            throw error;
        }
    }

    /**
     * Perform Google Sign-In
     * Returns user data and creates/updates Firestore user document
     */
    async signInWithGoogle(): Promise<User> {
        if (!GoogleSignin) {
            throw new Error(
                'Google Sign-In not available. Please use development build (not Expo Go) for this feature.'
            );
        }

        try {
            // Step 1: Sign in with Google — returns { idToken, user, ... } in v6+
            const signInResult = await GoogleSignin.signIn();

            // Step 2: Extract idToken and user info
            // Library v6+: result has idToken at top level; v5 wraps in .data
            const idToken: string | null =
                signInResult?.idToken ??
                signInResult?.data?.idToken ??
                null;
            const googleUser =
                signInResult?.user ??
                signInResult?.data?.user ??
                null;

            if (!idToken || !googleUser) {
                throw new Error('Failed to get Google credentials');
            }

            // Step 3: Validate email is a valid address (any provider accepted)
            if (!googleUser.email || !googleUser.email.includes('@')) {
                await this.signOut();
                throw new Error('Could not get a valid email from your Google account');
            }

            // Step 4: Create Firebase credential and sign in
            const credential = GoogleAuthProvider.credential(idToken);
            const firebaseUser = await signInWithCredential(auth, credential);

            console.log('✓ Google Sign-In successful:', firebaseUser.user.email);

            // Step 5: Get or create user in Firestore
            const userRef = doc(db, 'users', firebaseUser.user.uid);
            const userDoc = await getDoc(userRef);

            let userData: User;

            if (userDoc.exists()) {
                // User already exists, update last login
                userData = this.mapFirestoreDocToUser(userDoc.data(), firebaseUser.user.uid);
            } else {
                // Create new user document
                userData = {
                    uid: firebaseUser.user.uid,
                    email: googleUser.email,
                    name: googleUser.name || googleUser.email.split('@')[0],
                    phoneNumber: googleUser.phoneNumber || '',
                    studentId: '',
                    department: '',
                    photoURL: googleUser.photo || firebaseUser.user.photoURL || '',
                    rating: 5.0,
                    ratingCount: 0,
                    totalRides: 0,
                    totalSaved: 0,
                    completionRate: 100,
                    badge: 'New Rider',
                    strikes: 0,
                    isSuspended: false,
                    suspendedUntil: undefined,
                    trustScore: 100,
                    createdAt: new Date().toISOString(),
                    profileStatus: 'live',
                };

                // Save to Firestore
                await setDoc(userRef, userData);
                console.log('✓ User document created in Firestore');
            }

            return userData;
        } catch (error: any) {
            const message = error?.message || 'Google Sign-In failed';

            if (message.includes('Only Gmail')) {
                throw new Error('Only Gmail addresses are supported for Google Sign-In');
            }

            if (message.includes('User cancelled')) {
                throw new Error('Sign-in was cancelled');
            }

            throw new Error(message);
        }
    }

    /**
     * Sign out current Google user
     */
    async signOut(): Promise<void> {
        try {
            if (GoogleSignin) {
                await GoogleSignin.signOut();
            }
            await signOut(auth);
            console.log('✓ Signed out successfully');
        } catch (error: any) {
            console.error('Sign-out error:', error);
            throw error;
        }
    }

    /**
     * Check if device has Google Sign-In available
     */
    isAvailable(): boolean {
        return !!GoogleSignin;
    }

    /**
     * Map Firestore document to User type
     */
    private mapFirestoreDocToUser(data: any, uid: string): User {
        return {
            uid,
            email: data.email || '',
            name: data.name || '',
            phoneNumber: data.phoneNumber || '',
            studentId: data.studentId || '',
            department: data.department || '',
            rating: data.rating || 5.0,
            ratingCount: data.ratingCount || 0,
            totalRides: data.totalRides || 0,
            totalSaved: data.totalSaved || 0,
            completionRate: data.completionRate || 100,
            badge: data.badge || 'New Rider',
            strikes: data.strikes || 0,
            isSuspended: data.isSuspended || false,
            suspendedUntil: data.suspendedUntil,
            trustScore: data.trustScore || 100,
            createdAt: data.createdAt,
            photoURL: data.photoURL || data.profilePicture || '',
        };
    }
}

export default new GoogleAuthService();
