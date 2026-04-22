import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
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
import { isValidAIUBEmail } from '@/utils/validators';

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
    return email.trim().toLowerCase();
  }

  private buildFallbackUser(uid: string, email: string): User {
    const emailPrefix = email.split('@')[0] ?? 'AIUB Student';

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
        console.error('Firestore read error:', firestoreError);
      }

      try {
        const cachedDoc = await getDocFromCache(doc(db, 'users', uid));
        if (cachedDoc.exists()) {
          return cachedDoc.data() as User;
        }
      } catch (cacheError: any) {
        if (!this.isRecoverableFirestoreError(cacheError)) {
          console.error('Firestore cache read error:', cacheError);
        }
      }

      try {
        const restUser = await this.getUserDocumentViaRest(uid);
        if (restUser) {
          return restUser;
        }
      } catch (restError: any) {
        if (!this.isRecoverableFirestoreError(restError)) {
          console.error('Firestore REST fallback error:', restError);
        }
      }

      if (this.isRecoverableFirestoreError(firestoreError)) {
        throw new Error('Server connection is unstable. Please try again in a moment.');
      }

      throw firestoreError;
    }

    throw new Error('User data not found. Please complete registration again.');
  }

  async register(data: RegisterData): Promise<User> {
    const normalizedEmail = this.normalizeEmail(data.email);

    try {
      if (!isValidAIUBEmail(normalizedEmail)) {
        throw new Error('Use your AIUB student email (@student.aiub.edu)');
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        data.password
      );

      const userData: User = {
        uid: userCredential.user.uid,
        email: normalizedEmail,
        name: data.name.trim(),
        studentId: data.studentId.trim(),
        department: data.department ?? '',
        phoneNumber: data.phoneNumber ?? '', // Fix: provide default empty string if undefined
        rating: 5.0,
        totalRides: 0,
        totalSaved: 0,
        completionRate: 100,
        badge: 'New Rider',
        strikes: 0,
        isSuspended: false,
        createdAt: new Date().toISOString(),
        profileStatus: 'live',
      };

      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      } catch (firestoreError: any) {
        console.error('Registration profile save error:', firestoreError);
        await deleteUser(userCredential.user).catch((deleteError) => {
          console.error('Failed to rollback auth user after registration error:', deleteError);
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
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  }

  async login(credentials: LoginCredentials): Promise<User> {
    const normalizedEmail = this.normalizeEmail(credentials.email);

    try {
      if (!isValidAIUBEmail(normalizedEmail)) {
        throw new Error('Use your AIUB student email to login');
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        credentials.password
      );

      try {
        return await this.withTimeout(this.getUserDocument(userCredential.user.uid), 1500);
      } catch (firestoreError: any) {
        if (!this.isRecoverableFirestoreError(firestoreError)) {
          console.error('Firestore error:', firestoreError);
        }
        return this.buildFallbackUser(userCredential.user.uid, normalizedEmail);
      }
    } catch (error: any) {
      console.error('Login error:', error);

      // Provide user-friendly error messages
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password.');
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
      console.error('Logout error:', error);
      throw new Error(error.message || 'Logout failed');
    }
  }

  async completeProfile(userId: string, data: ProfileSetupData): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...data,
        profileCompleted: true,
        updatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Profile setup error:', error);
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
        if (!this.isRecoverableFirestoreError(error)) {
          console.error('Get current user profile fallback:', error);
        }
        return this.buildFallbackUser(
          firebaseUser.uid,
          this.normalizeEmail(firebaseUser.email ?? '')
        );
      }
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async resetPassword(email: string): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);

    try {
      if (!isValidAIUBEmail(normalizedEmail)) {
        throw new Error('Use your AIUB student email');
      }
      await sendPasswordResetEmail(auth, normalizedEmail);
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.message || 'Password reset failed');
    }
  }
}

export default new AuthService();
