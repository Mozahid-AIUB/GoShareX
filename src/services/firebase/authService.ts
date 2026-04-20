import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase.config';
import { User, LoginCredentials, RegisterData, ProfileSetupData } from '@/types/auth.types';
import { isValidAIUBEmail } from '@/utils/validators';
import APP_CONFIG from '@/config/appConfig';

/**
 * Authentication Service
 * Handles all authentication related operations
 */
class AuthService {
  /**
   * Register new user with AIUB email
   */
  async register(data: RegisterData): Promise<User> {
    try {
      // Validate AIUB email
      if (!isValidAIUBEmail(data.email)) {
        throw new Error('শুধু AIUB email দিয়ে register করা যাবে (@aiub.edu.bd)');
      }

      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // Create user document in Firestore
      const userData: User = {
        uid: userCredential.user.uid,
        email: data.email,
        name: data.name,
        studentId: data.studentId,
        department: data.department,
        phoneNumber: data.phoneNumber,
        rating: 5.0,
        totalRides: 0,
        totalSaved: 0,
        completionRate: 100,
        badge: 'New Rider',
        strikes: 0,
        isSuspended: false,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);

      return userData;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      if (!isValidAIUBEmail(credentials.email)) {
        throw new Error('শুধু AIUB email দিয়ে login করা যাবে');
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }

      return userDoc.data() as User;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error(error.message || 'Logout failed');
    }
  }

  /**
   * Complete profile setup
   */
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

  /**
   * Get current user data
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return null;

      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) return null;

      return userDoc.data() as User;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<void> {
    try {
      if (!isValidAIUBEmail(email)) {
        throw new Error('Invalid AIUB email');
      }
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.message || 'Password reset failed');
    }
  }
}

export default new AuthService();
