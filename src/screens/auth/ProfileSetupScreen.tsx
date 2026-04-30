import React, { useState } from 'react';
import {
  Animated,
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

import type { RootNavProp } from '@/navigation/types';
import authService from '@/services/firebase/authService';
import { auth } from '@/config/firebase.config';
import { isValidName } from '@/utils/validators';
import { getFCMToken, saveFCMToken } from '@/services/firebase/messaging';
import { useAuthStore } from '@/store';
import { useAnimatedPress } from '@/hooks/useAnimatedPress';
import { C } from '@/components/auth/authColors';
import { IconUser, IconPhone, IconBack } from '@/components/auth/AuthIcons';
import FormField from '@/components/auth/FormField';

export default function ProfileSetupScreen() {
  const navigation = useNavigation<RootNavProp>();
  const { setUser } = useAuthStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const btn = useAnimatedPress();

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!isValidName(name.trim())) errs.name = 'Please enter your full name';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const uid = auth.currentUser?.uid;
    if (!uid) { Alert.alert('Error', 'Not logged in'); return; }

    setLoading(true);
    try {
      await authService.completeProfile(uid, {
        name: name.trim(),
        ...(phone.trim() ? { phoneNumber: phone.trim() } : {}),
      });
      const fcmToken = await getFCMToken();
      if (fcmToken) await saveFCMToken(uid, fcmToken).catch(() => {});
      const updatedUser = await authService.getCurrentUser();
      if (updatedUser) setUser(updatedUser);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save profile');
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
          </View>

          <View style={s.titleArea}>
            <Text style={s.title}>Almost there!</Text>
            <Text style={s.titleSub}>Just a few details to set up your profile</Text>
          </View>

          <View style={s.card}>
            <FormField label="Full Name" value={name} onChangeText={setName}
              icon={<IconUser />} autoCapitalize="words"
              placeholder="e.g. Rahim Ahmed" error={errors.name} />
            <FormField label="Phone (optional)" value={phone} onChangeText={setPhone}
              icon={<IconPhone />} keyboardType="phone-pad"
              placeholder="+880 1XXX XXXXXX" />

            <Animated.View style={{ transform: [{ scale: btn.scale }], marginTop: 8 }}>
              <Pressable style={[s.saveBtn, loading && s.saveBtnDisabled]}
                onPress={handleSave} onPressIn={btn.onPressIn} onPressOut={btn.onPressOut}
                disabled={loading}>
                <Text style={s.saveBtnText}>{loading ? 'Saving...' : 'Complete Setup'}</Text>
              </Pressable>
            </Animated.View>
          </View>

          <Text style={s.disclaimer}>
            By continuing you agree to GoShareX Terms & Privacy Policy.{'\n'}
            GoShareX is not responsible for any financial disputes between riders.
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
  topBar: { marginBottom: 28 },
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
  saveBtn: {
    height: 54, borderRadius: 18, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: C.white, letterSpacing: -0.2 },
  disclaimer: { fontSize: 11, color: C.textMuted, textAlign: 'center', lineHeight: 17, paddingHorizontal: 8 },
});
