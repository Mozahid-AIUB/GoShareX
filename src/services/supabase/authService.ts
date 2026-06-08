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

      // Supabase Auth-এ অ্যাকাউন্ট তৈরি।
      // নাম/studentId ইত্যাদি `options.data`-তে পাঠাই — database-এর
      // handle_new_user trigger এগুলো দিয়ে অটো users প্রোফাইল বানাবে।
      // (client নিজে users টেবিলে লেখে না — RLS timing সমস্যা এড়াতে)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: data.password,
        options: {
          // verify link-এ click করলে ইউজারকে অ্যাপে ফেরত পাঠাবে
          // (localhost-এর বদলে)। gosharex:// = app.config.js-এর scheme।
          emailRedirectTo: 'gosharex://auth-callback',
          data: {
            name: data.name.trim(),
            student_id: (data.studentId ?? '').trim(),
            department: data.department ?? '',
            phone_number: data.phoneNumber ?? '',
          },
        },
      });
      if (signUpError) throw signUpError;

      const authUser = authData.user;
      if (!authUser) throw new Error('Account creation failed. Please try again.');

      // signUp সফল। Email confirmation চালু থাকলে session আসে না
      // (authData.session == null) — ইউজার এখনো verify করেনি।
      // এই অবস্থাটাই fake email আটকায়: verify link-এ click না করলে
      // account active হয় না।
      //
      // দুই ক্ষেত্রেই RegisterScreen একই "verify email পাঠানো হয়েছে"
      // বার্তা দেখায় + Login-এ পাঠায়, তাই এখানে শুধু একটা User অবজেক্ট
      // ফেরত দিই (error throw করি না — signUp তো সফল)।
      try {
        if (authData.session) {
          return await this.getUserDocument(authUser.id);
        }
      } catch {
        // প্রোফাইল এখনো পড়া যায়নি — নিচের fallback-এ যাই
      }
      return this.rowToUser({
        id: authUser.id,
        email: normalizedEmail,
        name: data.name.trim(),
        student_id: (data.studentId ?? '').trim(),
        department: data.department ?? '',
        phone_number: data.phoneNumber ?? '',
      });
    } catch (error: any) {
      // Supabase rate limit (অল্প সময়ে অনেকবার চেষ্টা)
      if (error?.code === 'over_email_send_rate_limit') {
        throw new Error('Too many attempts. Please wait a few minutes and try again.');
      }
      // email ইতিমধ্যে আছে
      if (error?.code === 'user_already_exists' ||
          error?.message?.toLowerCase().includes('already registered')) {
        throw new Error('email-already-in-use');
      }
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

  // -------------------- PASSWORD RESET (OTP-based) --------------------
  // মোবাইল অ্যাপের জন্য professional flow:
  //   1) resetPassword()  -> email-এ ৬-digit recovery code পাঠায়
  //   2) verifyResetCode() -> code যাচাই করে সাময়িক session দেয়
  //   3) setNewPassword()  -> ওই session দিয়ে নতুন password সেট করে
  // deep link/web page লাগে না — সব অ্যাপের ভেতরে।

  // ধাপ ১: reset code পাঠানো
  async resetPassword(email: string): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);
    try {
      if (!isValidEmail(normalizedEmail)) {
        throw new Error('Please enter a valid email address.');
      }
      // resetPasswordForEmail recovery-type email পাঠায়। Supabase email
      // template-এ {{ .Token }} থাকলে ৬-digit code যায় (link-এর বদলে)।
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
      if (error) throw error;
    } catch (error: any) {
      if (error?.code === 'over_email_send_rate_limit') {
        throw new Error('Too many attempts. Please wait a few minutes and try again.');
      }
      logger.error('supabaseAuth.resetPassword', error);
      throw new Error(error.message || 'Could not send reset code.');
    }
  }

  // ধাপ ২: code যাচাই (সফল হলে সাময়িক session সেট হয়)
  async verifyResetCode(email: string, code: string): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: code.trim(),
        type: 'recovery',
      });
      if (error) {
        if (error.message?.toLowerCase().includes('expired')) {
          throw new Error('This code has expired. Please request a new one.');
        }
        if (error.message?.toLowerCase().includes('invalid')) {
          throw new Error('Incorrect code. Please check and try again.');
        }
        throw error;
      }
    } catch (error: any) {
      logger.error('supabaseAuth.verifyResetCode', error);
      throw new Error(error.message || 'Code verification failed.');
    }
  }

  // ধাপ ৩: নতুন password সেট (verifyResetCode-এর পর session থাকতে হবে)
  async setNewPassword(newPassword: string): Promise<void> {
    try {
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      // password বদলানোর পর সাময়িক session sign out করি — ইউজার নতুন
      // password দিয়ে নতুন করে login করবে (পরিষ্কার, নিরাপদ)।
      await supabase.auth.signOut();
    } catch (error: any) {
      logger.error('supabaseAuth.setNewPassword', error);
      throw new Error(error.message || 'Could not update password.');
    }
  }
}

export default new SupabaseAuthService();
