import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  deleteUser,
  getIdToken,
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocFromCache, updateDoc } from 'firebase/firestore';
import { app, auth, db } from '@/config/firebase.config';
import {
  User,
  LoginCredentials,
  RegisterData,
  ProfileSetupData,
} from '@/types/auth.types';
import { isValidEmail, isValidGmail } from '@/utils/validators';
import { logger } from '@/utils/logger';

class AuthService {
  private isRecoverableFirestoreError(error: any): boolean {
    const normalizedCode = String(error?.code ?? '').toLowerCase();
    const normalizedMessage = String(error?.message ?? '').toLowerCase();

    return (
      normalizedCode.includes('unavailable') ||
      normalizedCode.includes('deadline-exceeded') ||
      normalizedCode.includes('failed-precondition') ||
      normalizedCode.includes('network-request-failed') ||
      normalizedMessage.includes('offline') ||
      normalizedMessage.includes('network') ||
      normalizedMessage.includes('client is offline') ||
      normalizedMessage.includes('server connection is unstable') ||
      normalizedMessage.includes('request timeout')
    );
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeoutMs);

      promise
        .then((value) => {
          clearTimeout(timeoutId);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private normalizeEmail(email: string): string {
    return (email ?? '').trim().toLowerCase();
  }

  private buildFallbackUser(uid: string, email: string): User {
    const emailPrefix = email.split('@')[0] ?? 'User';

    return {
      uid,
      email,
      name: emailPrefix,
      studentId: '',
      department: '',
      phoneNumber: '',
      rating: 5,
      totalRides: 0,
      totalSaved: 0,
      completionRate: 100,
      badge: 'New Rider',
      strikes: 0,
      isSuspended: false,
      trustScore: 100,
      ratingCount: 0,
      createdAt: new Date().toISOString(),
      profileStatus: 'fallback',
      profileWarning: 'Live profile data is temporarily unavailable. Showing your basic account information.',
    };
  }

  private mapFirestoreDocumentToUser(fields: Record<string, any>, uid: string): User {
    const readString = (key: string, fallback = ''): string =>
      fields?.[key]?.stringValue ?? fallback;
    const readNumber = (key: string, fallback = 0): number => {
      const raw = fields?.[key]?.integerValue ?? fields?.[key]?.doubleValue;
      return raw !== undefined ? Number(raw) : fallback;
    };
    const readBoolean = (key: string, fallback = false): boolean =>
      fields?.[key]?.booleanValue ?? fallback;

    return {
      uid,
      email: readString('email'),
      name: readString('name'),
      studentId: readString('studentId'),
      department: readString('department'),
      phoneNumber: readString('phoneNumber'),
      rating: readNumber('rating', 5),
      totalRides: readNumber('totalRides', 0),
      totalSaved: readNumber('totalSaved', 0),
      completionRate: readNumber('completionRate', 100),
      badge: readString('badge', 'New Rider') as User['badge'],
      strikes: readNumber('strikes', 0),
      isSuspended: readBoolean('isSuspended', false),
      trustScore: readNumber('trustScore', 100),
      ratingCount: readNumber('ratingCount', 0),
      createdAt: readString('createdAt'),
      lastActive: readNumber('lastActive', 0) || undefined,
      suspendedUntil: readNumber('suspendedUntil', 0) || undefined,
      profileStatus: 'live',
    };
  }

  private async getUserDocumentViaRest(uid: string): Promise<User | null> {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    const token = await getIdToken(currentUser);
    const projectId = app.options.projectId;

    if (!projectId) {
      throw new Error('Firebase project is not configured correctly.');
    }

    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firestore REST fallback failed: ${response.status} ${errorText}`);
    }

    const document = await response.json();
    return this.mapFirestoreDocumentToUser(document.fields ?? {}, uid);
  }

  private async getUserDocument(uid: string): Promise<User> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data() as User;
      }
    } catch (firestoreError: any) {
      if (!this.isRecoverableFirestoreError(firestoreError)) {
        logger.error('authService.firestoreRead', firestoreError);
      }

      try {
        const cachedDoc = await getDocFromCache(doc(db, 'users', uid));
        if (cachedDoc.exists()) {
          return cachedDoc.data() as User;
        }
      } catch (cacheError: any) {
        if (!this.isRecoverableFirestoreError(cacheError)) {
          logger.error('authService.firestoreCacheRead', cacheError);
        }
      }

      try {
        const restUser = await this.getUserDocumentViaRest(uid);
        if (restUser) {
          return restUser;
        }
      } catch (restError: any) {
        if (!this.isRecoverableFirestoreError(restError)) {
          logger.error('authService.firestoreRestFallback', restError);
        }
      }

      if (this.isRecoverableFirestoreError(firestoreError)) {
        throw new Error('Server connection is unstable. Please try again in a moment.');
      }

      throw firestoreError;
    }

    // Doc doesn't exist yet — first-time Google Sign-In or incomplete registration.
    // Navigate to ProfileSetup so the user can fill in their name.
    throw { code: 'PROFILE_NOT_FOUND' };
  }

  async register(data: RegisterData): Promise<User> {
    const normalizedEmail = this.normalizeEmail(data.email);

    try {
      if (!isValidEmail(normalizedEmail)) {
        throw new Error('Please enter a valid email address.');
      }
      if (!isValidGmail(normalizedEmail)) {
        throw new Error('Only Gmail accounts (@gmail.com) are allowed.');
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        data.password
      );

      await sendEmailVerification(userCredential.user).catch(() => {});

      const userData: User = {
        uid: userCredential.user.uid,
        email: normalizedEmail,
        name: data.name.trim(),
        studentId: (data.studentId ?? '').trim(),
        department: data.department ?? '',
        phoneNumber: data.phoneNumber ?? '',
        rating: 5.0,
        totalRides: 0,
        totalSaved: 0,
        completionRate: 100,
        badge: 'New Rider',
        strikes: 0,
        isSuspended: false,
        trustScore: 100,
        ratingCount: 0,
        createdAt: new Date().toISOString(),
        profileStatus: 'live',
      };

      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      } catch (firestoreError: any) {
        logger.error('authService.registration.profileSave', firestoreError);
        await deleteUser(userCredential.user).catch((deleteError) => {
          logger.error('authService.registration.rollback', deleteError);
        });

        if (
          firestoreError?.code === 'unavailable' ||
          firestoreError?.code === 'deadline-exceeded' ||
          firestoreError?.message?.toLowerCase?.().includes('offline')
        ) {
          throw new Error('Account created could not be completed because the server is offline. Please try again.');
        }

        throw new Error('Account could not be completed. Please try again.');
      }

      return userData;
    } catch (error: any) {
      logger.error('authService.register', error);
      throw new Error(error.message || 'Registration failed');
    }
  }

  async login(credentials: LoginCredentials): Promise<User> {
    const normalizedEmail = this.normalizeEmail(credentials.email);

    try {
      if (!isValidEmail(normalizedEmail)) {
        throw new Error('Please enter a valid email address.');
      }
      if (!isValidGmail(normalizedEmail)) {
        throw new Error('Only Gmail accounts (@gmail.com) are allowed.');
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        credentials.password
      );

      if (!userCredential.user.emailVerified) {
        await sendEmailVerification(userCredential.user).catch(() => {});
        await signOut(auth);
        throw new Error('EMAIL_NOT_VERIFIED');
      }

      try {
        // 8 seconds — generous enough for BD 4G, still blocks the UI for a definite period
        const user = await this.withTimeout(this.getUserDocument(userCredential.user.uid), 8000);

        if (user.isSuspended && user.suspendedUntil && Date.now() < user.suspendedUntil) {
          await signOut(auth);
          throw { code: 'USER_SUSPENDED', suspendedUntil: user.suspendedUntil };
        }

        return user;
      } catch (firestoreError: any) {
        // never swallow suspension errors into fallback user
        if (firestoreError?.code === 'USER_SUSPENDED') {
          throw firestoreError;
        }
        if (!this.isRecoverableFirestoreError(firestoreError)) {
          logger.error('authService.firestore', firestoreError);
        }

        // Timeout or network error — use fallback but still check suspension via REST
        // A suspended user must never get through, even on a slow connection
        try {
          const restUser = await this.getUserDocumentViaRest(userCredential.user.uid);
          if (restUser?.isSuspended && restUser.suspendedUntil && Date.now() < restUser.suspendedUntil) {
            await signOut(auth);
            throw { code: 'USER_SUSPENDED', suspendedUntil: restUser.suspendedUntil };
          }
        } catch (restError: any) {
          if (restError?.code === 'USER_SUSPENDED') throw restError;
          // REST also failed — fail safe: block login rather than risk letting suspended user through
          if (firestoreError.message === 'Request timeout') {
            await signOut(auth);
            throw new Error('Connection too slow to verify your account. Please try again.');
          }
        }

        return this.buildFallbackUser(userCredential.user.uid, normalizedEmail);
      }
    } catch (error: any) {
      // pass suspension object through untouched
      if (error?.code === 'USER_SUSPENDED') {
        throw error;
      }

      // existing error handling below — don't touch
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email.');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error('Incorrect email or password.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Check your internet connection.');
      }

      throw new Error(error.message || 'Login failed');
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      logger.error('authService.logout', error);
      throw new Error(error.message || 'Logout failed');
    }
  }

  async completeProfile(userId: string, data: ProfileSetupData): Promise<void> {
    try {
      const firebaseUser = auth.currentUser;
      const ref = doc(db, 'users', userId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        await updateDoc(ref, { ...data, profileCompleted: true, updatedAt: new Date().toISOString() });
      } else {
        // New user (e.g. Google Sign-In) — create the full profile doc from scratch
        const newProfile: User = {
          uid: userId,
          email: firebaseUser?.email ?? '',
          name: data.name?.trim() ?? '',
          studentId: '',
          department: '',
          phoneNumber: data.phoneNumber ?? '',
          rating: 5.0,
          totalRides: 0,
          totalSaved: 0,
          completionRate: 100,
          badge: 'New Rider',
          strikes: 0,
          isSuspended: false,
          trustScore: 100,
          ratingCount: 0,
          createdAt: new Date().toISOString(),
          profileStatus: 'live',
        };
        await setDoc(ref, newProfile);
      }
    } catch (error: any) {
      logger.error('authService.profileSetup', error);
      throw new Error(error.message || 'Profile setup failed');
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return null;

      try {
        return await this.getUserDocument(firebaseUser.uid);
      } catch (error: any) {
        // PROFILE_NOT_FOUND = new user, no doc yet — expected, not an error
        if (error?.code !== 'PROFILE_NOT_FOUND' && !this.isRecoverableFirestoreError(error)) {
          logger.warn('authService.getCurrentUser.fallback', error?.message ?? error);
        }
        return this.buildFallbackUser(
          firebaseUser.uid,
          this.normalizeEmail(firebaseUser.email ?? '')
        );
      }
    } catch (error) {
      logger.error('authService.getCurrentUser', error);
      return null;
    }
  }

  async resetPassword(email: string): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);

    try {
      if (!isValidEmail(normalizedEmail)) {
        throw new Error('Please enter a valid email address.');
      }
      await sendPasswordResetEmail(auth, normalizedEmail);
    } catch (error: any) {
      logger.error('authService.resetPassword', error);
      throw new Error(error.message || 'Password reset failed');
    }
  }

  // OTP-based reset শুধু Supabase mode-এ ব্যবহার হয়। Firebase mode-এ
  // password reset হয় email link দিয়ে (resetPassword উপরে)। এই দুইটা
  // method router-এর type মেলাতে আছে — Firebase mode-এ ডাকা হলে error।
  async verifyResetCode(_email: string, _code: string): Promise<void> {
    throw new Error('Code-based reset is not available in this mode.');
  }

  async setNewPassword(_newPassword: string): Promise<void> {
    throw new Error('Code-based reset is not available in this mode.');
  }
}

export default new AuthService();