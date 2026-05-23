import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import type { RootNavProp } from '@/navigation/types';
import { useAuthStore } from '@/store/authStore';
import { updateUser } from '@/services/firebase/userService';
import { isValidName } from '@/utils/validators';
import { uploadProfilePhoto } from '@/services/firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/errorHandler';

const C = {
  bg: '#F4F6FB',
  card: '#FFFFFF',
  border: '#E8ECF4',
  borderFocus: '#7C3AED',
  primary: '#7C3AED',
  text: '#111827',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconBack = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={C.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const IconUser = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={C.textMuted} strokeWidth="1.8" />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

// ─── Input field ──────────────────────────────────────────────────────────────
function Field({
  label, value, onChangeText, icon, placeholder, keyboardType, autoCapitalize, error,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  icon: React.ReactNode; placeholder?: string; error?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}</Text>
      <View style={[fi.row, focused && fi.rowFocus, !!error && fi.rowError]}>
        <View style={fi.icon}>{icon}</View>
        <TextInput
          style={fi.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {!!error && <Text style={fi.error}>{error}</Text>}
    </View>
  );
}

const fi = StyleSheet.create({
  wrap:     { marginBottom: 14 },
  label:    { fontSize: 12, fontWeight: '700', color: C.textSub, letterSpacing: 0.4, marginBottom: 6, textTransform: 'uppercase' },
  row:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, height: 52, paddingHorizontal: 14, gap: 10 },
  rowFocus: { borderColor: C.borderFocus, backgroundColor: 'rgba(124,58,237,0.03)' },
  rowError: { borderColor: C.error, backgroundColor: C.errorBg },
  icon:     { width: 22, alignItems: 'center' },
  input:    { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
  error:    { fontSize: 11, color: C.error, marginTop: 4, marginLeft: 4 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function EditProfileScreen() {
  const navigation = useNavigation<RootNavProp>();
  const insets     = useSafeAreaInsets();
  const { user, setUser } = useAuthStore();

  const [name, setName]   = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setName(user?.name ?? '');
    setPhotoUri(user?.photoURL ?? null);
  }, [user]);

  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0] || !user?.uid) return;

      const localUri = result.assets[0].uri;
      setPhotoUri(localUri);
      setPhotoUploading(true);
      try {
        const photoURL = await uploadProfilePhoto(user.uid, localUri);
        const updated = await updateUser(user.uid, { photoURL });
        setUser(updated);
      } catch (err: unknown) {
        logger.error('EditProfile.uploadPhoto', err);
        Alert.alert('Upload failed', getErrorMessage(err) || 'Please try again.');
        setPhotoUri(user.photoURL ?? null);
      } finally {
        setPhotoUploading(false);
      }
    } catch (err: unknown) {
      logger.error('EditProfile.pickPhoto', err);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!isValidName(name)) errs.name = 'Please enter your full name';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user?.uid) return;
    setLoading(true);
    try {
      const updated = await updateUser(user.uid, { name: name.trim() });
      setUser(updated);
      Alert.alert('Saved', 'Your profile has been updated.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pressIn  = useCallback(() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, tension: 120 }).start(), [btnScale]);
  const pressOut = useCallback(() => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true, tension: 80  }).start(), [btnScale]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Top bar */}
          <View style={s.topBar}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <IconBack />
            </TouchableOpacity>
            <Text style={s.heading}>Edit Profile</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Avatar preview */}
          <View style={s.avatarSection}>
            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8} disabled={photoUploading}>
              <View style={s.avatarCircle}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={s.avatarImg} />
                ) : (
                  <Text style={s.avatarLetter}>
                    {(name || user?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                )}
                <View style={s.cameraBadge}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M23 19V8a2 2 0 00-2-2h-3.17l-1.85-2H8.02L6.17 6H3a2 2 0 00-2 2v11a2 2 0 002 2h18a2 2 0 002-2z"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Circle cx="12" cy="13" r="4" stroke="#fff" strokeWidth="2" />
                  </Svg>
                </View>
              </View>
            </TouchableOpacity>
            <Text style={s.avatarName}>{name || user?.name || 'Your Name'}</Text>
            <Text style={s.avatarEmail}>{user?.email ?? ''}</Text>
            <Text style={s.tapHint}>
              {photoUploading ? 'Uploading...' : 'Tap photo to change'}
            </Text>
          </View>

          {/* Form */}
          <View style={s.card}>
            <Field
              label="Full Name"
              value={name}
              onChangeText={setName}
              icon={<IconUser />}
              placeholder={user?.name ?? 'Enter your full name'}
              autoCapitalize="words"
              error={errors.name}
            />
          </View>

          {/* Save button */}
          <Animated.View style={{ transform: [{ scale: btnScale }], paddingHorizontal: 20 }}>
            <Pressable
              style={[s.saveBtn, loading && { opacity: 0.6 }]}
              onPress={handleSave}
              onPressIn={pressIn}
              onPressOut={pressOut}
              disabled={loading}
            >
              <Text style={s.saveTxt}>{loading ? 'Saving...' : 'Save Changes'}</Text>
            </Pressable>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 40 },

  topBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:  { width: 36, height: 36, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  heading:  { fontSize: 17, fontWeight: '800', color: C.text },

  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  avatarCircle:  { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(124,58,237,0.12)', borderWidth: 2, borderColor: 'rgba(124,58,237,0.3)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg:     { width: '100%', height: '100%' },
  avatarLetter:  { fontSize: 38, fontWeight: '900', color: C.primary },
  cameraBadge:   { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  avatarName:    { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 8 },
  avatarEmail:   { fontSize: 12, color: C.textMuted },
  tapHint:       { fontSize: 11, color: C.primary, fontWeight: '600', marginTop: 4 },

  card:    { marginHorizontal: 16, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },

  saveBtn: { height: 54, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  saveTxt: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
});
