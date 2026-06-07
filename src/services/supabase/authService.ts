// ============================================================
// Supabase Auth Service
// firebase/authService.ts এর যমজ — একই function নাম, একই User ফেরত।
// পার্থক্য: ভেতরে Firebase-এর বদলে Supabase।
//
// Firebase ম্যাপিং:
//   createUserWithEmailAndPassword -> supabase.auth.signUp
//   signInWithEmailAndPassword     -> supabase.auth.signInWithPassword
//   signOut                        -> supabase.auth.signOut
//   sendPasswordResetEmail         -> supabase.auth.resetPasswordForEmail
//   Firestore users/{uid}          -> public.users টেবিল (snake_case কলাম)
// ============================================================
import { supabase } from '@/config/supabase.config';
import {
  User,
  LoginCredentials,
  RegisterData,
  ProfileSetupData,
  UserBadge,
} from '@/types/auth.types';
import { isValidEmail, isValidGmail } from '@/utils/validators';
import { logger } from '@/utils/logger';

class SupabaseAuthService {
  private normalizeEmail(email: string): string {
    return (email ?? '').trim().toLowerCase();
  }

  // SQL টেবিলের snake_case কলাম -> অ্যাপের camelCase User অবজেক্ট
  private rowToUser(row: any): User {
    return {
      uid: row.id,
      email: row.email ?? '',
      name: row.name ?? '',
      studentId: row.student_id ?? '',
      department: row.department ?? '',
      phoneNumber: row.phone_number ?? '',
      photoURL: row.photo_url ?? undefined,
      rating: Number(row.rating ?? 5),
      totalRides: Number(row.total_rides ?? 0),
      totalSaved: Number(row.total_saved ?? 0),
      completionRate: Number(row.completion_rate ?? 100),
      badge: (row.badge ?? 'New Rider') as UserBadge,
      strikes: Number(row.strikes ?? 0),
      isSuspended: Boolean(row.is_suspended ?? false),
      suspendedUntil: row.suspended_until ? new Date(row.suspended_until).getTime() : undefined,
      createdAt: row.created_at ?? new Date().toISOString(),
      lastActive: row.last_active ? new Date(row.last_active).getTime() : undefined,
      profileStatus: 'live',
    };
  }

  // users টেবিল থেকে প্রোফাইল পড়া
  private async getUserDocument(uid: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();

    if (error) {
      // row নেই = নতুন ইউজার, প্রোফাইল এখনো বানানো হয়নি
      if (error.code === 'PGRST116') {
        throw { code: 'PROFILE_NOT_FOUND' };
      }
      throw error;
    }
    return this.rowToUser(data);
  }

  // -------------------- REGISTER --------------------
  async register(data: RegisterData): Promise<User> {
    const normalizedEmail = this.normalizeEmail(data.email);

    try {
      if (!isValidEmail(normalizedEmail)) {
        throw new Error('Please enter a valid email address.');
      }
      if (!isValidGmail(normalizedEmail)) {
        throw new Error('Only Gmail accounts (@gmail.com) are allowed.');
      }

      // 1) Supabase Auth-এ অ্যাকাউন্ট তৈরি (email verification মেইল অটো যায়)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: data.password,
      });
      if (signUpError) throw signUpError;

      const authUser = authData.user;
      if (!authUser) throw new Error('Account creation failed. Please try again.');

      // 2) users টেবিলে প্রোফাইল row বানাই (Firestore setDoc এর সমতুল্য)
      const profileRow = {
        id: authUser.id,
        email: normalizedEmail,
        name: data.name.trim(),
        student_id: (data.studentId ?? '').trim(),
        department: data.department ?? '',
        phone_number: data.phoneNumber ?? '',
        rating: 5.0,
        total_rides: 0,
        total_saved: 0,
        completion_rate: 100,
        badge: 'New Rider',
        strikes: 0,
        is_suspended: false,
      };

      const { error: insertError } = await supabase.from('users').insert(profileRow);
      if (insertError) {
        // প্রোফাইল সেভ ব্যর্থ হলে auth অ্যাকাউন্ট orphan থেকে যাবে —
        // Supabase-এ client থেকে নিজের auth user মোছা যায় না, তাই এটা
        // পরে একটা Edge Function/trigger দিয়ে সামলাব (ধাপ ৬)।
        logger.error('supabaseAuth.register.profileSave', insertError);
        throw new Error('Account could not be completed. Please try again.');
      }

      return this.rowToUser(profileRow);
    } catch (error: any) {
      logger.error('supabaseAuth.register', error);
      throw new Error(error.message || 'Registration failed');
    }
  }

  // -------------------- LOGIN --------------------
  async login(credentials: LoginCredentials): Promise<User> {
    const normalizedEmail = this.normalizeEmail(credentials.email);

    try {
      if (!isValidEmail(normalizedEmail)) {
        throw new Error('Please enter a valid email address.');
      }
      if (!isValidGmail(normalizedEmail)) {
        throw new Error('Only Gmail accounts (@gmail.com) are allowed.');
      }

      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: credentials.password,
        });

      if (signInError) {
        // Supabase ভুল পাসওয়ার্ড/ইমেইল একই বার্তা দেয় (security best practice)
        if (signInError.message?.toLowerCase().includes('invalid login')) {
          throw new Error('Incorrect email or password.');
        }
        if (signInError.message?.toLowerCase().includes('email not confirmed')) {
          throw new Error('EMAIL_NOT_VERIFIED');
        }
        throw signInError;
      }

      const authUser = authData.user;
      if (!authUser) throw new Error('Login failed.');

      // প্রোফাইল পড়ি + suspension চেক
      const user = await this.getUserDocument(authUser.id);

      if (user.isSuspended && user.suspendedUntil && Date.now() < user.suspendedUntil) {
        await supabase.auth.signOut();
        throw { code: 'USER_SUSPENDED', suspendedUntil: user.suspendedUntil };
      }

      return user;
    } catch (error: any) {
      if (error?.code === 'USER_SUSPENDED') throw error;
      logger.error('supabaseAuth.login', error);
      throw new Error(error.message || 'Login failed');
    }
  }

  // -------------------- LOGOUT --------------------
  async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      logger.error('supabaseAuth.logout', error);
      throw new Error(error.message || 'Logout failed');
    }
  }

  // -------------------- COMPLETE PROFILE --------------------
  async completeProfile(userId: string, data: ProfileSetupData): Promise<void> {
    try {
      const updateRow: Record<string, any> = {
        name: data.name?.trim() ?? '',
        student_id: data.studentId ?? '',
        department: data.department ?? '',
        phone_number: data.phoneNumber ?? '',
      };
      if (data.photoURL) updateRow.photo_url = data.photoURL;

      // upsert = থাকলে update, না থাকলে insert (Firestore setDoc-merge এর মতো)
      const { error } = await supabase
        .from('users')
        .upsert({ id: userId, ...updateRow });
      if (error) throw error;
    } catch (error: any) {
      logger.error('supabaseAuth.completeProfile', error);
      throw new Error(error.message || 'Profile setup failed');
    }
  }

  // -------------------- GET CURRENT USER --------------------
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;

      try {
        return await this.getUserDocument(authUser.id);
      } catch (error: any) {
        if (error?.code !== 'PROFILE_NOT_FOUND') {
          logger.warn('supabaseAuth.getCurrentUser', error?.message ?? error);
        }
        return null;
      }
    } catch (error) {
      logger.error('supabaseAuth.getCurrentUser', error);
      return null;
    }
  }

  // -------------------- RESET PASSWORD --------------------
  async resetPassword(email: string): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);
    try {
      if (!isValidEmail(normalizedEmail)) {
        throw new Error('Please enter a valid email address.');
      }
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
      if (error) throw error;
    } catch (error: any) {
      logger.error('supabaseAuth.resetPassword', error);
      throw new Error(error.message || 'Password reset failed');
    }
  }
}

export default new SupabaseAuthService();
