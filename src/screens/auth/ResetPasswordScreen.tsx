import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { AuthStackParamList, RootNavProp } from '@/navigation/types';
import authService from '@/services/authService';
import { C } from '@/components/auth/authColors';

// ForgotPassword → এখানে আসে। ইউজার email-এ পাওয়া ৬-digit code +
// নতুন password দেয়। সব অ্যাপের ভেতরে (OTP flow, deep link লাগে না)।
export default function ResetPasswordScreen() {
  const navigation = useNavigation<RootNavProp>();
  const route = useRoute<RouteProp<AuthStackParamList, 'ResetPassword'>>();
  const email = route.params.email;

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  // Supabase OTP সাধারণত ৬, কখনো ৭-৮ digit হতে পারে — তাই নমনীয় (৬-৮)।
  const codeValid = useMemo(() => /^\d{6,8}$/.test(code.trim()), [code]);

  const handleSubmit = async () => {
    setError('');

    if (!codeValid) {
      setError('Enter the code from your email (6–8 digits).');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // ১) code যাচাই → সাময়িক session
      await authService.verifyResetCode(email, code);
      // ২) নতুন password সেট → session sign out
      await authService.setNewPassword(password);

      Alert.alert(
        'Password Updated ✅',
        'Your password has been changed. Please sign in with your new password.',
        [{ text: 'Go to Login', onPress: () => navigation.navigate('Auth', { screen: 'Login' }) }]
      );
    } catch (e: any) {
      setError(e?.message ?? 'Could not reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      await authService.resetPassword(email);
      Alert.alert('Code sent', `A new code has been sent to ${email}.`);
    } catch (e: any) {
      setError(e?.message ?? 'Could not resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <Text style={s.title}>Enter Reset Code</Text>
            <Text style={s.sub}>
              We sent a 6-digit code to {email}. Enter it below and choose a new password.
            </Text>

            <Text style={s.label}>6-Digit Code</Text>
            <TextInput
              style={[s.input, s.codeInput, !!error && !codeValid && s.inputError]}
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 8))}
              keyboardType="number-pad"
              placeholder="••••••"
              placeholderTextColor={C.textMuted}
              editable={!loading}
              maxLength={8}
            />

            <Text style={s.label}>New Password</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="At least 6 characters"
              placeholderTextColor={C.textMuted}
              editable={!loading}
            />

            <Text style={s.label}>Confirm New Password</Text>
            <TextInput
              style={s.input}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoCapitalize="none"
              placeholder="Re-enter password"
              placeholderTextColor={C.textMuted}
              editable={!loading}
            />

            {!!error && <Text style={s.error}>{error}</Text>}

            <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleSubmit} disabled={loading}>
              <Text style={s.btnText}>{loading ? 'Updating...' : 'Update Password'}</Text>
            </Pressable>

            <Pressable style={s.linkBtn} onPress={handleResend} disabled={resending || loading}>
              <Text style={s.linkText}>{resending ? 'Sending...' : "Didn't get the code? Resend"}</Text>
            </Pressable>

            <Pressable
              style={s.backBtn}
              onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
              disabled={loading}
            >
              <Text style={s.backText}>Back to Login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: C.white,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.primary,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  title: { fontSize: 24, fontWeight: '900', color: C.text, letterSpacing: -0.6, marginBottom: 8 },
  sub: { fontSize: 13, color: C.textSub, lineHeight: 20, marginBottom: 22 },
  label: { fontSize: 12, fontWeight: '700', color: C.textSub, letterSpacing: 0.5, marginBottom: 6, marginTop: 14, textTransform: 'uppercase' },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#F9F7FF',
    paddingHorizontal: 16,
    color: C.text,
    fontSize: 15,
  },
  codeInput: { letterSpacing: 8, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  inputError: { borderColor: C.error, backgroundColor: '#FEF2F2' },
  error: { marginTop: 10, color: C.error, fontSize: 12, fontWeight: '600' },
  btn: {
    marginTop: 22,
    height: 54,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { color: C.white, fontSize: 16, fontWeight: '800' },
  linkBtn: { alignSelf: 'center', marginTop: 16 },
  linkText: { color: C.primary, fontSize: 13, fontWeight: '700' },
  backBtn: { alignSelf: 'center', marginTop: 12 },
  backText: { color: C.textSub, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
