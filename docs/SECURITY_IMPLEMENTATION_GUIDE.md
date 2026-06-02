/**
 * EXAMPLE USAGE: How to Integrate Security Features
 * 
 * Copy these patterns into your service files
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1️⃣ RIDE SERVICE - With Rate Limiting & Audit Logging
// ═══════════════════════════════════════════════════════════════════════════

import { withRideLimitCheck } from '@/utils/rateLimitEnforcer';
import { logRideCreated } from '@/utils/auditLogger';

export async function createRide(rideData: RideData): Promise<string> {
  // Check rate limit BEFORE processing
  return withRideLimitCheck(async () => {
    // Your existing ride creation logic
    const rideId = await rideService.create(rideData);

    // Log for audit trail
    await logRideCreated(auth.currentUser!.uid, rideId, {
      origin: rideData.pickup,
      destination: rideData.destination,
      fare: rideData.fare,
      participants: rideData.participantCount,
    });

    return rideId;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 2️⃣ MESSAGE SERVICE - With Rate Limiting
// ═══════════════════════════════════════════════════════════════════════════

import { withMessageLimitCheck } from '@/utils/rateLimitEnforcer';

export async function sendMessage(chatId: string, message: string): Promise<void> {
  return withMessageLimitCheck(async () => {
    // Your existing send logic
    await messageService.send(chatId, message);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 3️⃣ AUTH SERVICE - With Secure Storage & Audit Logging
// ═══════════════════════════════════════════════════════════════════════════

import { secureStorage, SECURE_KEYS } from '@/utils/secureStorage';
import { logLogin, logLogout, logPasswordChange } from '@/utils/auditLogger';

export async function login(email: string, password: string): Promise<User> {
  // Your existing Firebase login
  const user = await signInWithEmailAndPassword(auth, email, password);

  // Store token securely
  const token = await user.getIdToken();
  await secureStorage.setSecure(SECURE_KEYS.AUTH_TOKEN, {
    token,
    expiresAt: Date.now() + 3600000, // 1 hour
  });

  // Log login event
  await logLogin(user.uid, email);

  return user;
}

export async function logout(): Promise<void> {
  const userId = auth.currentUser?.uid;

  // Clear secure storage
  await secureStorage.removeSecure(SECURE_KEYS.AUTH_TOKEN);
  await secureStorage.removeSecure(SECURE_KEYS.FCM_TOKEN);

  // Firebase logout
  await signOut(auth);

  // Audit log
  if (userId) {
    await logLogout(userId);
  }
}

export async function changePassword(newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('No user logged in');

  // Update password
  await updatePassword(user, newPassword);

  // Log for security audit
  await logPasswordChange(user.uid);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4️⃣ NOTIFICATION SERVICE - Using FCM Token from Secure Storage
// ═══════════════════════════════════════════════════════════════════════════

import { secureStorage, SECURE_KEYS, StoredFCMToken } from '@/utils/secureStorage';

export async function storeFCMToken(token: string): Promise<void> {
  // Store securely instead of AsyncStorage
  const fcmData: StoredFCMToken = {
    token,
    createdAt: Date.now(),
    platform: Platform.OS as 'ios' | 'android',
  };

  await secureStorage.setSecure(SECURE_KEYS.FCM_TOKEN, fcmData);

  // Also save to Firestore for server-side notifications
  // But with secure access control (only owner can read)
  const db = getFirestore();
  await setDoc(doc(db, 'fcm_tokens', auth.currentUser!.uid), {
    token,
    platform: Platform.OS,
    updatedAt: serverTimestamp(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 5️⃣ LOCATION SERVICE - With Secure Storage & Audit Logging
// ═══════════════════════════════════════════════════════════════════════════

import { secureStorage, SECURE_KEYS, StoredLocation } from '@/utils/secureStorage';

export async function updateLocation(latitude: number, longitude: number): Promise<void> {
  // Store location locally (secure)
  const location: StoredLocation = {
    latitude,
    longitude,
    timestamp: Date.now(),
    accuracy: 30, // meters
  };

  await secureStorage.setSecure(SECURE_KEYS.LAST_KNOWN_LOCATION, location);

  // Upload to Firestore active_riders collection (only owner can read)
  const db = getFirestore();
  const auth = getAuth();

  await setDoc(
    doc(db, 'active_riders', auth.currentUser!.uid),
    {
      latitude,
      longitude,
      timestamp: serverTimestamp(),
    },
    { merge: true }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6️⃣ RATING SERVICE - With Rate Limiting & Audit Logging
// ═══════════════════════════════════════════════════════════════════════════

import { withRatingLimitCheck } from '@/utils/rateLimitEnforcer';
import { logRatingGiven } from '@/utils/auditLogger';

export async function rateUser(
  rideId: string,
  targetUserId: string,
  rating: number,
  comment: string
): Promise<void> {
  return withRatingLimitCheck(async () => {
    // Your existing rating logic
    const ratingId = await ratingService.create({
      rideId,
      targetUserId,
      rating,
      comment,
    });

    // Audit log
    await logRatingGiven(auth.currentUser!.uid, rideId, targetUserId, rating);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 7️⃣ MAPS SERVICE - Using API Proxy (Server-Side)
// ═══════════════════════════════════════════════════════════════════════════

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase.config';

export async function searchPlaces(input: string): Promise<any[]> {
  try {
    // Call server-side proxy instead of directly to Google API
    const placesAutocompleteFn = httpsCallable(functions, 'placesAutocomplete');

    const result = await placesAutocompleteFn({
      input,
      sessionToken: generateSessionToken(), // Required for billing
    });

    return (result.data as any)?.predictions || [];
  } catch (error) {
    logger.error('Places search failed:', error);
    return [];
  }
}

export async function getDistances(
  origins: Array<{ lat: number; lng: number }>,
  destinations: Array<{ lat: number; lng: number }>
): Promise<any> {
  try {
    // Use server proxy instead of client API call
    const distanceMatrixFn = httpsCallable(functions, 'distanceMatrix');

    const result = await distanceMatrixFn({
      origins,
      destinations,
    });

    return result.data;
  } catch (error) {
    logger.error('Distance calculation failed:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8️⃣ USER REPORT SERVICE - With Audit Logging
// ═══════════════════════════════════════════════════════════════════════════

import { logUserReported } from '@/utils/auditLogger';

export async function reportUser(targetUserId: string, reason: string, details: Record<string, any>): Promise<void> {
  const db = getFirestore();

  // Create report in Firestore
  const reportRef = await addDoc(collection(db, 'reports'), {
    reporterId: auth.currentUser!.uid,
    targetUserId,
    reason,
    details,
    createdAt: serverTimestamp(),
    status: 'pending', // Will be reviewed by admin
  });

  // Audit log (with warning severity for potential abuse)
  await logUserReported(auth.currentUser!.uid, targetUserId, reason, details);
}

// ═══════════════════════════════════════════════════════════════════════════
// SETUP: Initialize Secure Storage on App Start
// ═══════════════════════════════════════════════════════════════════════════

import { secureStorage } from '@/utils/secureStorage';

export async function initializeApp(): Promise<void> {
  // Initialize encryption key (runs once, on first app launch)
  // This is automatic with expo-secure-store, but you can verify:

  const hasEncryptionKey = await secureStorage.has(SECURE_KEYS.FCM_TOKEN);

  if (!hasEncryptionKey) {
    logger.info('First app launch - initializing secure storage');
    // Secure store will automatically create encryption key
  }

  // Rest of your initialization...
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTING: Rate Limiting & Audit Logs
// ═══════════════════════════════════════════════════════════════════════════

// Test rate limiting
export async function testRateLimit(): Promise<void> {
  try {
    // Try to create rides rapidly
    for (let i = 0; i < 5; i++) {
      await createRide({ /* data */ });
      console.log(`Ride ${i + 1} created`);
    }

    // Should succeed for first 2, then rate limited
  } catch (error: any) {
    if (error.message.includes('rate limit')) {
      console.log('✅ Rate limiting working correctly');
    }
  }
}

// Test audit logging
export async function testAuditLogging(): Promise<void> {
  // After performing actions, check Firestore
  const db = getFirestore();
  const logs = await getDocs(
    query(collection(db, 'audit_logs'), where('userId', '==', auth.currentUser!.uid), limit(10))
  );

  logs.forEach((doc) => {
    console.log('Audit Event:', doc.data());
  });

  // Should show your login, ride creation, etc.
}

// Test secure storage
export async function testSecureStorage(): Promise<void> {
  const testToken = 'test_token_12345';

  // Store
  await secureStorage.setSecure(SECURE_KEYS.FCM_TOKEN, {
    token: testToken,
    createdAt: Date.now(),
    platform: 'android' as const,
  });

  // Retrieve
  const retrieved = await secureStorage.getSecure(SECURE_KEYS.FCM_TOKEN);
  console.log('Secure storage test:', retrieved);
  // Should show: { token: 'test_token_12345', ... }
}
