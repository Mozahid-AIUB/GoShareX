/**
 * Google Sign-In — Supabase version
 * firebase/googleAuthService.ts এর যমজ (একই method নাম)।
 *
 * Flow (OAuth, native idToken):
 *   1) @react-native-google-signin দিয়ে native Google sign-in → idToken
 *   2) supabase.auth.signInWithIdToken({ provider:'google', token: idToken })
 *   3) handle_new_user trigger users প্রোফাইল বানায় (নতুন হলে)
 *   4) profile পড়ে User হিসেবে ফেরত
 *
 * ⚠️ @react-native-google-signin Expo Go-তে চলে না — development/
 *    production build লাগবে (Firebase version-এও একই সীমাবদ্ধতা)।
 */
import Constants from 'expo-constants';
import { supabase } from '@/config/supabase.config';
import { User, UserBadge } from '@/types/auth.types';
import { logger } from '@/utils/logger';

const extraConfig =
  (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined) ?? {};
const GOOGLE_WEB_CLIENT_ID: string = extraConfig.GOOGLE_WEB_CLIENT_ID ?? '';

let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch {
  logger.warn('supabaseGoogleAuth', 'Google Sign-In native module not available (Expo Go)');
}

class SupabaseGoogleAuthService {
  async initialize() {
    if (!GoogleSignin) {
      throw new Error('Google Sign-In not available. Use a development/production build.');
    }
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
      scopes: ['email', 'profile'],
    });
    logger.info('supabaseGoogleAuth', 'configured');
  }

  // snake_case row -> camelCase User
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
      profileStatus: 'live',
    };
  }

  async signInWithGoogle(): Promise<User> {
    if (!GoogleSignin) {
      throw new Error(
        'Google Sign-In not available. Please use a development build (not Expo Go).'
      );
    }

    try {
      // 1) native Google sign-in → idToken
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken: string | null =
        signInResult?.idToken ?? signInResult?.data?.idToken ?? null;
      const googleUser = signInResult?.user ?? signInResult?.data?.user ?? null;

      if (!idToken) throw new Error('Could not get Google credentials. Please try again.');
      if (!googleUser?.email?.includes('@')) {
        await this.signOut();
        throw new Error('Could not get a valid email from your Google account.');
      }

      // 2) Supabase-এ idToken দিয়ে sign in
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw error;

      const authUser = data.user;
      if (!authUser) throw new Error('Google sign-in failed.');

      // 3) profile পড়ি (trigger নতুন হলে বানিয়ে দেয়)। না পেলে fallback।
      const { data: row } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (row) {
        // suspension চেক
        const u = this.rowToUser(row);
        if (u.isSuspended && u.suspendedUntil && Date.now() < u.suspendedUntil) {
          await this.signOut();
          throw { code: 'USER_SUSPENDED', suspendedUntil: u.suspendedUntil };
        }
        // safety net: পুরনো user যাদের row আগেই তৈরি হয়েছে (photo_url
        // ছাড়া migration চালানোর আগে) — এখন Google photo পাওয়া গেলে
        // একবার db-তে backfill করে দিই, পরের বার আর খালি না দেখায়।
        const googlePhoto = googleUser?.photo ?? null;
        if (!u.photoURL && googlePhoto) {
          await supabase.from('users').update({ photo_url: googlePhoto }).eq('id', authUser.id).then(() => {}, () => {});
          u.photoURL = googlePhoto;
        }
        return u;
      }

      // row এখনো নেই — fallback অবজেক্ট (trigger একটু পরে বানাবে)
      return this.rowToUser({
        id: authUser.id,
        email: googleUser.email,
        name: googleUser.name || googleUser.email.split('@')[0],
        photo_url: googleUser.photo ?? null,
      });
    } catch (error: any) {
      if (error?.code === 'USER_SUSPENDED') throw error;
      const message = String(error?.message ?? 'Google Sign-In failed');
      if (message.toLowerCase().includes('cancel')) {
        throw new Error('Sign-in was cancelled.');
      }
      logger.error('supabaseGoogleAuth.signIn', error);
      throw new Error(message);
    }
  }

  async signOut(): Promise<void> {
    try {
      if (GoogleSignin) {
        await GoogleSignin.signOut().catch(() => undefined);
      }
      await supabase.auth.signOut();
    } catch (error: any) {
      logger.error('supabaseGoogleAuth.signOut', error);
    }
  }

  isAvailable(): boolean {
    return !!GoogleSignin;
  }
}

export default new SupabaseGoogleAuthService();
