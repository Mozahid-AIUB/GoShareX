import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';

import { AuthStackParamList, RootNavProp } from '@/navigation/types';
import authService from '@/services/authService';
import { isValidEmail, isValidGmail } from '@/utils/validators';
import { C } from '@/components/auth/authColors';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<RootNavProp>();
  const route = useRoute<RouteProp<AuthStackParamList, 'ForgotPassword'>>();
  const initialEmail = route.params?.email ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleSend = async () => {
    setError('');

    if (!normalizedEmail) {
      setError('Please enter your Gmail address.');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!isValidGmail(normalizedEmail)) {
      setError('Only Gmail addresses are allowed.');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(normalizedEmail);
      // code পাঠানো হয়েছে — এখন ResetPassword screen-এ গিয়ে
      // ইউজার code + নতুন password দেবে (সব অ্যাপের ভেতরে, OTP flow)।
      navigation.navigate('Auth', {
        screen: 'ResetPassword',
        params: { email: normalizedEmail },
      });
    } catch (e: any) {
      Alert.alert('Reset failed', e?.message ?? 'Could not send reset code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <Text style={s.title}>Reset Password</Text>
            <Text style={s.sub}>
              Enter your Gmail address and we will send a 6-digit reset code to your inbox.
            </Text>

            <Text style={s.label}>Gmail Address</Text>
            <TextInput
              style={[s.input, !!error && s.inputError]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="name@gmail.com"
              placeholderTextColor={C.textMuted}
              editable={!loading}
            />
            {!!error && <Text style={s.error}>{error}</Text>}

            <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleSend} disabled={loading}>
              <Text style={s.btnText}>{loading ? 'Sending...' : 'Send Reset Code'}</Text>
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
  label: { fontSize: 12, fontWeight: '700', color: C.textSub, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
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
  inputError: { borderColor: C.error, backgroundColor: '#FEF2F2' },
  error: { marginTop: 6, color: C.error, fontSize: 12, fontWeight: '600' },
  btn: {
    marginTop: 18,
    height: 54,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { color: C.white, fontSize: 16, fontWeight: '800' },
  backBtn: { alignSelf: 'center', marginTop: 16 },
  backText: { color: C.primary, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
