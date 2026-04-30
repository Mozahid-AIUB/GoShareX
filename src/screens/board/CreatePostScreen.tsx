import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import PremiumIcon from '@/components/common/PremiumIcon';
import VehicleIcon from '@/components/common/VehicleIcon';
import type { RootNavProp } from '@/navigation/types';
import { useAuthStore } from '@/store/authStore';
import { createPost } from '@/services/firebase/postService';
import placesService, { PlaceSuggestion } from '@/services/google/placesService';

const C = {
  bg: '#FAF8FF',
  card: '#FFFFFF',
  border: '#EDE8F5',
  borderFocus: '#6366F1',
  primary: '#6366F1',
  primarySoft: 'rgba(99,102,241,0.10)',
  text: '#1A1A2E',
  textSub: '#6B7280',
  textMuted: '#B0AACC',
  error: '#EF4444',
  green: '#10B981',
  greenSoft: 'rgba(16,185,129,0.10)',
  amber: '#F59E0B',
  amberSoft: 'rgba(245,158,11,0.08)',
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconBack = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke={C.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconDest = ({ color = C.primary }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={color} />
    <Circle cx="12" cy="9" r="2.5" fill="white" />
  </Svg>
);

const IconMeet = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="7" r="3" fill={C.green} />
    <Circle cx="15" cy="7" r="3" fill={C.green} opacity="0.6" />
    <Path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <Path d="M15 14c1.5 0 4 1 4 6" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.6" />
  </Svg>
);

const IconClock = ({ color = C.primary }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" fill="none" />
    <Path d="M12 7v5l3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconNote = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="3" width="16" height="18" rx="3" stroke={C.textSub} strokeWidth="1.8" fill="none" />
    <Path d="M8 8h8M8 12h8M8 16h5" stroke={C.textSub} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconInfo = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={C.amber} strokeWidth="1.8" fill="none" />
    <Path d="M12 8v1M12 12v4" stroke={C.amber} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconSearch = ({ color = C.textMuted }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
    <Path d="M16.5 16.5L21 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconClear = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" fill={C.textMuted} opacity="0.3" />
    <Path d="M9 9l6 6M15 9l-6 6" stroke={C.textSub} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconCheck = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12l5 5L19 7" stroke={C.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Location Search Field ────────────────────────────────────────────────────
function LocationSearchField({ label, value, placeholder, icon, error, hint, onSelect }: {
  label: string; value: string; placeholder: string;
  icon: React.ReactNode; error?: string; hint?: string;
  onSelect: (label: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((text: string) => {
    setQuery(text);
    if (text !== value) onSelect('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await placesService.autocomplete({ input: text, latitude: 23.8103, longitude: 90.4125, radiusMeters: 15000 });
        setSuggestions(results);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 350);
  }, [value, onSelect]);

  const handleSelect = (item: PlaceSuggestion) => {
    const lbl = item.primaryText || item.description;
    setQuery(lbl); onSelect(lbl); setSuggestions([]);
  };

  return (
    <View style={lf.wrap}>
      <Text style={lf.label}>{label}</Text>
      <View style={[lf.row, focused && lf.rowFocused, !!error && lf.rowError]}>
        <View style={lf.iconL}>{icon}</View>
        <TextInput
          value={query} onChangeText={search} placeholder={placeholder}
          placeholderTextColor={C.textMuted} style={lf.input}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); onSelect(''); setSuggestions([]); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <IconClear />
          </TouchableOpacity>
        )}
        {query.length === 0 && <View style={{ paddingLeft: 8 }}><IconSearch color={loading ? C.primary : C.textMuted} /></View>}
      </View>
      {focused && suggestions.length > 0 && (
        <View style={lf.dropdown}>
          <FlatList
            data={suggestions} keyExtractor={i => i.placeId}
            keyboardShouldPersistTaps="always" scrollEnabled={false}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[lf.suggRow, index < suggestions.length - 1 && lf.suggBorder]}
                onPress={() => handleSelect(item)} activeOpacity={0.7}
              >
                <View style={lf.suggPin}><IconDest color="#6366F1" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={lf.suggMain}>{item.primaryText}</Text>
                  {!!item.secondaryText && <Text style={lf.suggSub} numberOfLines={1}>{item.secondaryText}</Text>}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
      {!!hint && (
        <View style={lf.hint}>
          <IconInfo />
          <Text style={lf.hintText}>{hint}</Text>
        </View>
      )}
      {!!error && <Text style={lf.errorText}>{error}</Text>}
    </View>
  );
}

const lf = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '700', color: C.textSub, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border, minHeight: 50, paddingHorizontal: 14,
  },
  rowFocused: { borderColor: C.borderFocus, backgroundColor: 'rgba(99,102,241,0.03)' },
  rowError: { borderColor: C.error },
  iconL: { paddingRight: 10 },
  input: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 0 },
  dropdown: {
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    marginTop: 4, shadowColor: '#6366F1', shadowOpacity: 0.1, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6, overflow: 'hidden',
  },
  suggRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, gap: 10 },
  suggBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  suggPin: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  suggMain: { fontSize: 14, fontWeight: '600', color: C.text },
  suggSub: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6, paddingHorizontal: 2 },
  hintText: { flex: 1, fontSize: 11, color: '#92680A', lineHeight: 16 },
  errorText: { fontSize: 11, color: C.error, marginTop: 4, marginLeft: 2 },
});

const TIME_REGEX       = /^\d{1,2}:\d{2}$/;
const NON_NUMERIC_REGEX = /[^0-9:]/g;

// ─── Ride Type Selector ───────────────────────────────────────────────────────
const RIDE_TYPES = [
  {
    key: 'share' as const,
    vehicleType: 'rickshaw' as const,
    tone: 'amber' as const,
    title: 'Share Ride',
    desc: 'Rickshaw / CNG — split fare',
  },
  {
    key: 'bike_owner' as const,
    vehicleType: 'motorcycle' as const,
    tone: 'indigo' as const,
    title: 'Bike Owner',
    desc: 'I have a bike, need 1 passenger',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CreatePostScreen() {
  const navigation = useNavigation<RootNavProp>();
  const { user } = useAuthStore();

  const [destination, setDestination] = useState('');
  const [meetPoint, setMeetPoint] = useState('');
  const [meetTime, setMeetTime] = useState('');
  const [rideType, setRideType] = useState<'share' | 'bike_owner'>('share');
  const [maxRiders, setMaxRiders] = useState(2);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isDirty = !!(destination || meetPoint || meetTime || note);

  const handleBack = () => {
    if (isDirty) {
      Alert.alert('Discard post?', 'You have unsaved changes.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };;

  const btnScale = useRef(new Animated.Value(1)).current;
  const onPressIn  = useCallback(() => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, tension: 120 }).start(), [btnScale]);
  const onPressOut = useCallback(() => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true, tension: 80  }).start(), [btnScale]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!destination.trim()) errs.destination = 'Select your destination';
    if (!meetPoint.trim()) errs.meetPoint = 'Select your meet point';
    if (!meetTime.trim()) errs.meetTime = 'Enter meet time (e.g. 12:05)';
    else if (!/^\d{1,2}:\d{2}$/.test(meetTime.trim())) errs.meetTime = 'Format: HH:MM (e.g. 12:05)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!user) { Alert.alert('Not logged in', 'Please login first.'); return; }
    setLoading(true);
    try {
      await createPost({
        authorId: user.uid,
        authorName: user.name,
        authorRating: user.rating ?? 0,
        authorBadge: user.badge ?? 'New Rider',
        authorPhotoURL: user.photoURL ?? null,
        destination,
        meetPoint,
        meetTime: meetTime.trim(),
        rideType,
        note: note.trim() || null,
        maxRiders,
      });
      navigation.goBack();
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Failed to post', err?.message ?? 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} nestedScrollEnabled>

          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={handleBack} style={s.backBtn} activeOpacity={0.7}>
              <IconBack />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Post a Ride</Text>
              <Text style={s.subtitle}>Find someone going the same way</Text>
            </View>
          </View>

          {/* Ride Type */}
          <Text style={s.sectionLabel}>Ride Type</Text>
          <View style={s.rideTypeRow}>
            {RIDE_TYPES.map(rt => {
              const active = rideType === rt.key;
              return (
                <TouchableOpacity
                  key={rt.key}
                  style={[s.rideTypeCard, active && s.rideTypeCardActive]}
                  onPress={() => setRideType(rt.key)}
                  activeOpacity={0.8}
                >
                  <View style={s.rideTypeIcon}>
                    <VehicleIcon type={rt.vehicleType} tone={rt.tone} size={36} />
                  </View>
                  <Text style={[s.rideTypeTitle, active && s.rideTypeTitleActive]}>{rt.title}</Text>
                  <Text style={s.rideTypeDesc}>{rt.desc}</Text>
                  {active && <View style={s.rideTypeCheck}><IconCheck /></View>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Going to */}
          <LocationSearchField
            label="Going to"
            value={destination}
            placeholder="e.g. Kuril, Badda, Gulshan..."
            icon={<IconDest />}
            error={errors.destination}
            hint="শুধু এলাকার নাম — রোড/বাড়ি নম্বর দিও না"
            onSelect={setDestination}
          />

          {/* Meet at */}
          <LocationSearchField
            label="Meet at"
            value={meetPoint}
            placeholder="e.g. Gulshan-2, Mirpur-1, Uttara..."
            icon={<IconMeet />}
            error={errors.meetPoint}
            hint="পরিচিত জায়গা দাও যেন সহজে খুঁজে পাওয়া যায়"
            onSelect={setMeetPoint}
          />

          {/* Meet Time */}
          <View style={s.fieldWrap}>
            <Text style={s.sectionLabel}>Meet Time</Text>
            <View style={[s.timeInputRow, !!errors.meetTime && s.timeInputRowError, meetTime.length > 0 && !errors.meetTime && s.timeInputRowDone]}>
              <IconClock color={meetTime && !errors.meetTime ? C.primary : C.textMuted} />
              <TextInput
                value={meetTime}
                onChangeText={t => {
                  // auto-insert colon after 2 digits
                  let v = t.replace(NON_NUMERIC_REGEX, '');
                  if (v.length === 2 && !v.includes(':') && meetTime.length === 1) v = v + ':';
                  setMeetTime(v);
                }}
                placeholder="12:05"
                placeholderTextColor={C.textMuted}
                style={s.timeInput}
                keyboardType="numeric"
                maxLength={5}
                returnKeyType="done"
              />
              {meetTime.length > 0 && !errors.meetTime && TIME_REGEX.test(meetTime) && (
                <Text style={s.timeValid}>✓</Text>
              )}
            </View>
            {!!errors.meetTime && <Text style={s.errorText}>{errors.meetTime}</Text>}
            <Text style={s.timeHint}>24-hour format — যেমন: 12:05, 14:30, 08:00</Text>
          </View>

          {/* Max Riders */}
          <View style={s.fieldWrap}>
            <Text style={s.sectionLabel}>Seats needed (including you)</Text>
            <View style={s.ridersRow}>
              {[2, 3, 4].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[s.riderChip, maxRiders === n && s.riderChipActive]}
                  onPress={() => setMaxRiders(n)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.riderChipNum, maxRiders === n && s.riderChipNumActive]}>{n}</Text>
                  <Text style={[s.riderChipLbl, maxRiders === n && s.riderChipLblActive]}>
                    {n === 2 ? '1 partner' : n === 3 ? '2 partners' : '3 partners'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Note */}
          <View style={s.fieldWrap}>
            <Text style={s.sectionLabel}>Note (optional)</Text>
            <View style={s.noteRow}>
              <View style={{ paddingTop: 2 }}><IconNote /></View>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Looking for a girl / boy / anyone — just be on time!"
                placeholderTextColor={C.textMuted}
                style={s.noteInput}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          {/* Vehicle note */}
          <View style={s.vehicleNote}>
            <View style={s.vehicleNoteRow}>
              <PremiumIcon name="handshake-outline" tone="violet" size={12} />
              <Text style={s.vehicleNoteText}>
                Vehicle decided together after connecting — rickshaw, CNG, or bike.
              </Text>
            </View>
          </View>

          {/* Submit */}
          <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 4 }}>
            <Pressable
              style={[s.submitBtn, loading && s.submitBtnDisabled]}
              onPress={handleSubmit} onPressIn={onPressIn} onPressOut={onPressOut}
              disabled={loading}
            >
              <Text style={s.submitBtnText}>{loading ? 'Posting...' : 'Post Ride'}</Text>
            </Pressable>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: C.textSub, marginTop: 1 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textSub, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },

  rideTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  rideTypeCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border,
    padding: 12, alignItems: 'center', gap: 4,
  },
  rideTypeCardActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  rideTypeIcon: { marginBottom: 8 },
  rideTypeTitle: { fontSize: 13, fontWeight: '700', color: C.text },
  rideTypeTitleActive: { color: C.primary },
  rideTypeDesc: { fontSize: 10, color: C.textMuted, textAlign: 'center', lineHeight: 14 },
  rideTypeCheck: { position: 'absolute', top: 8, right: 8 },

  fieldWrap: { marginBottom: 14 },

  timeInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, height: 50,
  },
  timeInputRowError: { borderColor: C.error },
  timeInputRowDone: { borderColor: C.green },
  timeInput: { flex: 1, fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: 2 },
  timeValid: { fontSize: 18, color: C.green, fontWeight: '800' },
  timeHint: { fontSize: 11, color: C.textMuted, marginTop: 5, marginLeft: 2 },
  errorText: { fontSize: 11, color: C.error, marginTop: 4, marginLeft: 2 },

  noteRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border, padding: 12,
  },
  noteInput: { flex: 1, fontSize: 14, color: C.text, minHeight: 50, textAlignVertical: 'top', paddingVertical: 0 },

  ridersRow: { flexDirection: 'row', gap: 10 },
  riderChip: {
    flex: 1, backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    paddingVertical: 10, alignItems: 'center', gap: 2,
  },
  riderChipActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  riderChipNum: { fontSize: 20, fontWeight: '800', color: C.textSub },
  riderChipNumActive: { color: C.primary },
  riderChipLbl: { fontSize: 10, fontWeight: '600', color: C.textMuted },
  riderChipLblActive: { color: C.primary },

  vehicleNote: {
    backgroundColor: C.amberSoft, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    padding: 12, marginBottom: 16,
  },
  vehicleNoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  vehicleNoteText: { fontSize: 12, color: C.textSub, lineHeight: 17 },

  submitBtn: {
    height: 52, borderRadius: 16, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 7,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
});
