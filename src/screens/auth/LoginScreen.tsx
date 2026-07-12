import React, { useEffect, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { RootNavProp } from '@/navigation/types';
import authService from '@/services/authService';
import googleAuthService from '@/services/googleAuthService';
import { useAuthStore } from '@/store';
import { getFCMToken, saveFCMToken } from '@/services/firebase/messaging';
import { checkSuspension } from '@/services/badgeService';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { isValidEmail } from '@/utils/validators';
import { useAnimatedPress } from '@/hooks/useAnimatedPress';
import { C, ONE_DAY_MS } from '@/components/auth/authColors';
import { IconEmail, IconLock, IconArrow, IconGoogle } from '@/components/auth/AuthIcons';
import FormField from '@/components/auth/FormField';
import { useScreenTracking } from '@/hooks/useScreenTracking';
import { trackEvent } from '@/services/analytics/analyticsService';

type SuspendedError = { code: 'USER_SUSPENDED'; suspendedUntil?: number };

export default function LoginScreen() {
  useScreenTracking('Login');
  const navigation = useNavigation<RootNavProp>();
  const { setUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const btn = useAnimatedPress();
  const gBtn = useAnimatedPress();

  useEffect(() => { googleAuthService.initialize().catch(() => {}); }, []);

  const handleSuspended = (suspendedUntil: number, reason?: string) => {
    const remainingMs = suspendedUntil - Date.now();
    navigation.replace('Suspension', {
      suspendedUntil,
      remainingHours: Math.max(1, Math.ceil(remainingMs / 3_600_000)),
      reason: reason ?? 'Your account has been suspended due to repeated ride cancellations.',
    });
  };

  const afterAuth = async (uid: string, suspendedUntil?: number) => {
    // Supabase auth mode-এ suspension চেক authService.login()-এই হয়ে যায়
    // (USER_SUSPENDED throw করে), আর FCM token পরে Supabase-এ আনব (ধাপ ৬)।
    // তাই এখানে Firebase কল skip করি — নাহলে permission_denied-এ আটকায়।
    if (FEATURE_FLAGS.USE_SUPABASE_AUTH) {
      return true;
    }
    const status = await checkSuspension(uid);
    if (status.suspended) {
      handleSuspended(suspendedUntil ?? Date.now() + ONE_DAY_MS, status.reason);
      return false;
    }
    const fcmToken = await getFCMToken();
    if (fcmToken) await saveFCMToken(uid, fcmToken).catch(() => {});
    return true;
  };

  const handleLogin = async () => {
    setEmailError('');
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (!isValidEmail(email.trim().toLowerCase())) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      const user = await authService.login({ email: email.trim().toLowerCase(), password });
      const ok = await afterAuth(user.uid, user.suspendedUntil);
      if (ok) {
        setUser(user);
        trackEvent('login', { method: 'email' });
      }
    } catch (error: any) {
      if ((error as SuspendedError)?.code === 'USER_SUSPENDED') {
        handleSuspended(error.suspendedUntil ?? Date.now() + ONE_DAY_MS);
        return;
      }
      if (error?.code === 'PROFILE_NOT_FOUND') {
        navigation.navigate('Auth', { screen: 'ProfileSetup', params: {} });
        return;
      }
      if (error?.message === 'EMAIL_NOT_VERIFIED') {
        Alert.alert(
          'Email Not Verified',
          'A verification email has been sent to your Gmail. Please check your inbox and verify before signing in.',
          [{ text: 'OK' }]
        );
        return;
      }
      const msg: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect email or password.',
        'auth/invalid-credential': 'Incorrect email or password.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Check your internet connection.',
      };
      const errMsg = typeof error?.message === 'string' ? error.message : '';
      Alert.alert('Login failed', msg[error?.code] ?? (errMsg || 'Please check your credentials and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      Alert.alert('Enter email first', 'Please type your email address so we can send the reset link.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setEmailError('Please enter a valid email address');
      Alert.alert('Invalid email', 'Please enter a valid email address first.');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(normalizedEmail);
      Alert.alert(
        'Reset link sent',
        `We sent a password reset email to ${normalizedEmail}. Please check your inbox and spam folder.`
      );
    } catch (error: any) {
      Alert.alert('Reset failed', error?.message ?? 'Could not send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setEmailError('');
    setGoogleLoading(true);
    try {
      const user = await googleAuthService.signInWithGoogle();
      const ok = await afterAuth(user.uid, user.suspendedUntil);
      if (ok) {
        setUser(user);
        trackEvent('login', { method: 'google' });
      }
    } catch (error: any) {
      if ((error as SuspendedError)?.code === 'USER_SUSPENDED') {
        handleSuspended(error.suspendedUntil ?? Date.now() + ONE_DAY_MS);
        return;
      }
      if (error?.code === 'PROFILE_NOT_FOUND') {
        navigation.navigate('Auth', { screen: 'ProfileSetup', params: {} });
        return;
      }
      const message = error?.message ?? 'Google Sign-In failed';
      if (!message.includes('cancelled')) Alert.alert('Sign-in failed', message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const busy = loading || googleLoading;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.radial1} />
      <View style={s.radial2} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={s.logoArea}>
            <Image source={require('../../../assets/images/gosharex-icon-3d.png')} style={s.logoImg} resizeMode="contain" />
            <View style={s.logoTextWrap}>
              <Text style={s.logoName}>Go<Text style={s.logoAccent}>Share</Text>X</Text>
              <Text style={s.logoSub}>Smart Ride Sharing</Text>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Welcome back</Text>
            <Text style={s.cardSub}>Sign in to continue</Text>

            <FormField label="Email" value={email} onChangeText={setEmail}
              icon={<IconEmail />} keyboardType="email-address" error={emailError} />
            <FormField
              label="Password"
              value={password}
              onChangeText={setPassword}
              icon={<IconLock />} secure={!showPassword}
              onToggleSecure={() => setShowPassword(v => !v)}
              rightLabel={(
                <TouchableOpacity
                  onPress={() => navigation.navigate('Auth', { screen: 'ForgotPassword', params: { email: email.trim() } })}
                  disabled={busy}
                  activeOpacity={0.7}
                >
                  <Text style={s.forgotLinkText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
            />

            <Animated.View style={{ transform: [{ scale: btn.scale }] }}>
              <Pressable style={[s.loginBtn, loading && s.btnDisabled]}
                onPress={handleLogin} onPressIn={btn.onPressIn} onPressOut={btn.onPressOut}
                disabled={busy}>
                {loading
                  ? <Text style={s.loginBtnText}>Signing in...</Text>
                  : <><Text style={s.loginBtnText}>Sign In</Text><IconArrow /></>}
              </Pressable>
            </Animated.View>

            <View style={s.dividerWrap}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>OR</Text>
              <View style={s.dividerLine} />
            </View>

            <Animated.View style={{ transform: [{ scale: gBtn.scale }] }}>
              <Pressable style={[s.googleBtn, googleLoading && s.btnDisabled]}
                onPress={handleGoogleSignIn} onPressIn={gBtn.onPressIn} onPressOut={gBtn.onPressOut}
                disabled={busy}>
                {googleLoading
                  ? <Text style={s.googleBtnText}>Signing in...</Text>
                  : <><IconGoogle /><Text style={s.googleBtnText}>Continue with Google</Text></>}
              </Pressable>
            </Animated.View>

            <TouchableOpacity style={s.registerLink}
              onPress={() => navigation.navigate('Auth', { screen: 'Register' })}
              disabled={busy} activeOpacity={0.7}>
              <Text style={s.registerLinkText}>
                Don&apos;t have an account? <Text style={s.registerLinkAccent}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: 'center' }}>
            <Text style={s.disclaimer}>
              By signing in you agree to GoShareX&apos;s{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')} activeOpacity={0.7}>
              <Text style={[s.disclaimer, { color: '#7C3AED', fontWeight: '700', textDecorationLine: 'underline' }]}>
                Privacy Policy
              </Text>
            </TouchableOpacity>
            <Text style={s.disclaimer}>GoShareX is not liable for any financial loss or disputes.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  radial1: { position: 'absolute', top: -60, right: -50, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(124,58,237,0.10)' },
  radial2: { position: 'absolute', bottom: -50, left: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(13,148,136,0.07)' },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoArea: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 32, alignSelf: 'center' },
  logoImg: { width: 64, height: 64 },
  logoTextWrap: { gap: 2 },
  logoName: { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: -0.8 },
  logoAccent: { color: C.primary },
  logoSub: { fontSize: 12, color: C.textSub, fontWeight: '500' },
  card: {
    backgroundColor: C.white, borderWidth: 1, borderColor: '#EDE9FE',
    shadowColor: C.primary, shadowOpacity: 0.07, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
    borderRadius: 28, padding: 24, marginBottom: 20,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4, letterSpacing: -0.4 },
  cardSub: { fontSize: 13, color: C.textSub, marginBottom: 24 },
  forgotLinkText: { fontSize: 13, fontWeight: '700', color: C.primary, textDecorationLine: 'underline' },
  loginBtn: {
    height: 54, borderRadius: 18, backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  loginBtnText: { fontSize: 16, fontWeight: '800', color: C.white, letterSpacing: -0.2 },
  dividerWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E0FF' },
  dividerText: { fontSize: 12, fontWeight: '600', color: C.textMuted, letterSpacing: 0.5 },
  googleBtn: {
    height: 54, borderRadius: 18, backgroundColor: C.white,
    borderWidth: 1.5, borderColor: '#E5E0FF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  googleBtnText: { fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  registerLink: { alignItems: 'center', marginTop: 18 },
  registerLinkText: { fontSize: 13, color: C.textSub },
  registerLinkAccent: { color: C.primary, fontWeight: '700' },
  disclaimer: { fontSize: 11, color: C.textMuted, textAlign: 'center', lineHeight: 17, paddingHorizontal: 8 },
});
