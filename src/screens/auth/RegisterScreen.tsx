import React, { useState } from 'react';
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
  Linking,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { RootNavProp } from '@/navigation/types';
import authService from '@/services/authService';
import { isValidEmail, isValidGmail, isValidName } from '@/utils/validators';
import { useAnimatedPress } from '@/hooks/useAnimatedPress';
import { C } from '@/components/auth/authColors';
import { IconEmail, IconLock, IconArrow, IconUser, IconBack } from '@/components/auth/AuthIcons';
import FormField from '@/components/auth/FormField';
import { getErrorCode, getErrorMessage } from '@/utils/errorHandler';
import { useScreenTracking } from '@/hooks/useScreenTracking';
import { trackEvent } from '@/services/analytics/analyticsService';

export default function RegisterScreen() {
  useScreenTracking('Register');
  const navigation = useNavigation<RootNavProp>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const btn = useAnimatedPress();

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!isValidName(name.trim())) errs.name = 'Please enter your full name';
    if (!isValidEmail(email.trim().toLowerCase())) errs.email = 'Please enter a valid email address';
    else if (!isValidGmail(email.trim().toLowerCase())) errs.email = 'Only Gmail accounts (@gmail.com) are allowed';
    if (password.length < 8) errs.password = 'At least 8 characters required';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const newUser = await authService.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      Alert.alert(
        '✅ Account Created!',
        'A verification email has been sent to your Gmail. Please open your email and tap the confirmation link, then sign in.',
        [
          {
            text: 'Open Email',
            onPress: async () => {
              // Gmail অ্যাপ খোলার চেষ্টা; না থাকলে ফোনের ডিফল্ট inbox
              try {
                const canGmail = await Linking.canOpenURL('googlegmail://');
                await Linking.openURL(canGmail ? 'googlegmail://' : 'message://');
              } catch {
                // কোনো email app খোলা না গেলে — চুপচাপ Login-এ পাঠাই
              }
              navigation.navigate('Auth', { screen: 'Login' });
            },
          },
          {
            text: 'Go to Login',
            style: 'cancel',
            onPress: () => navigation.navigate('Auth', { screen: 'Login' }),
          },
        ]
      );
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      const code = getErrorCode(err);
      if (msg.includes('email-already-in-use') || code === 'auth/email-already-in-use') {
        Alert.alert('Already registered', 'An account with this Gmail already exists. Please sign in instead.');
      } else {
        Alert.alert('Registration failed', msg || 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.radial1} />
      <View style={s.radial2} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={s.topBar}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <IconBack />
              <Text style={s.backLabel}>Back</Text>
            </TouchableOpacity>
            <Image source={require('../../../assets/images/gosharex-icon-3d.png')} style={s.logoImg} resizeMode="contain" />
          </View>

          <View style={s.titleArea}>
            <Text style={s.title}>Create account</Text>
            <Text style={s.titleSub}>Create your GoShareX account</Text>
          </View>

          <View style={s.card}>
            <FormField label="Full Name" value={name} onChangeText={setName}
              icon={<IconUser />} autoCapitalize="words" error={errors.name}
              placeholder="e.g. Rahim Ahmed" />
            <FormField label="Email" value={email} onChangeText={setEmail}
              icon={<IconEmail />} keyboardType="email-address" error={errors.email} />
            <FormField label="Password" value={password} onChangeText={setPassword}
              icon={<IconLock />} secure={!showPassword}
              onToggleSecure={() => setShowPassword(v => !v)} error={errors.password} />
            <FormField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword}
              icon={<IconLock />} secure={!showPassword} error={errors.confirmPassword} />

            <Animated.View style={{ transform: [{ scale: btn.scale }] }}>
              <Pressable style={[s.registerBtn, loading && s.registerBtnDisabled]}
                onPress={handleRegister} onPressIn={btn.onPressIn} onPressOut={btn.onPressOut}
                disabled={loading}>
                {loading
                  ? <Text style={s.registerBtnText}>Creating account...</Text>
                  : <><Text style={s.registerBtnText}>Create Account</Text><IconArrow /></>}
              </Pressable>
            </Animated.View>

            <TouchableOpacity style={s.loginLink} onPress={() => navigation.goBack()} disabled={loading} activeOpacity={0.7}>
              <Text style={s.loginLinkText}>
                Already have an account? <Text style={s.loginLinkAccent}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={s.disclaimer}>
            By creating an account you agree to GoShareX Terms & Privacy Policy.{'\n'}
            GoShareX is not responsible for any financial loss or disputes.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  radial1: { position: 'absolute', top: -60, right: -50, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(124,58,237,0.10)' },
  radial2: { position: 'absolute', bottom: -50, left: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(13,148,136,0.07)' },
  scroll: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  logoImg: { width: 40, height: 40 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backLabel: { fontSize: 13, fontWeight: '600', color: '#A5B4FC' },
  titleArea: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: -0.6 },
  titleSub: { fontSize: 13, color: C.textSub, marginTop: 4 },
  card: {
    backgroundColor: C.white, borderWidth: 1, borderColor: '#EDE9FE',
    borderRadius: 28, padding: 22, marginBottom: 20,
    shadowColor: C.primary, shadowOpacity: 0.07, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  registerBtn: {
    height: 54, borderRadius: 18, backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  registerBtnDisabled: { opacity: 0.6 },
  registerBtnText: { fontSize: 16, fontWeight: '800', color: C.white, letterSpacing: -0.2 },
  loginLink: { alignItems: 'center', marginTop: 18 },
  loginLinkText: { fontSize: 13, color: C.textSub },
  loginLinkAccent: { color: C.primary, fontWeight: '700' },
  disclaimer: { fontSize: 11, color: C.textMuted, textAlign: 'center', lineHeight: 17, paddingHorizontal: 8 },
});
