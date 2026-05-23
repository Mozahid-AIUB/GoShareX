import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { RootNavProp } from '@/navigation/types';
import { useAuthStore } from '@/store/authStore';
import authService from '@/services/firebase/authService';
import PremiumIcon from '@/components/common/PremiumIcon';
import { biometricService } from '@/services/security/biometricService';
import { useUIStore } from '@/store/uiStore';
import { MAP_STYLE_LABELS, type MapStyleId } from '@/config/mapStyles';

// ─── Light theme — matches Home tab ──────────────────────────────────────────
const C = {
  bg: '#FAF8FF',
  card: '#FFFFFF',
  border: '#EDE8F5',
  primary: '#6366F1',
  teal: '#0D9488',
  amber: '#F59E0B',
  red: '#EF4444',
  green: '#10B981',
  text: '#1A1A2E',
  textSub: '#6B7280',
  textMuted: '#9896A8',
  white: '#FFFFFF',
  purple: '#7C3AED',
};

const PRIVACY_URL = 'https://gosharex.app/privacy';
const TERMS_URL   = 'https://gosharex.app/terms';

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IconBell    = ({ color = C.purple }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const IconMap     = ({ color = C.teal }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const IconUser    = ({ color = C.purple }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);
const IconShield  = ({ color = C.green }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);
const IconMail    = ({ color = C.amber }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth="1.8" />
    <Path d="M22 6l-10 7L2 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);
const IconGavel   = ({ color = C.red }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2l8 8-4 4-8-8 4-4zM10 14l-7 7M3 21l7-7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const IconLock    = ({ color = C.textSub }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="1.8" />
    <Path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);
const IconLogout  = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={C.red} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const IconChevron = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionHeader = ({ label }: { label: string }) => (
  <Text style={s.sectionHeader}>{label}</Text>
);

const ToggleRow = ({
  icon, label, sub, value, onChange,
}: { icon: React.ReactNode; label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) => (
  <View style={s.row}>
    <View style={s.rowIcon}>{icon}</View>
    <View style={s.rowInfo}>
      <Text style={s.rowLabel}>{label}</Text>
      {sub && <Text style={s.rowSub}>{sub}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: '#E5E7EB', true: C.primary }}
      thumbColor={C.white}
    />
  </View>
);

const LinkRow = ({
  icon, label, sub, onPress, danger,
}: { icon: React.ReactNode; label: string; sub?: string; onPress: () => void; danger?: boolean }) => (
  <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.75}>
    <View style={s.rowIcon}>{icon}</View>
    <View style={s.rowInfo}>
      <Text style={[s.rowLabel, danger && { color: C.red }]}>{label}</Text>
      {sub && <Text style={s.rowSub}>{sub}</Text>}
    </View>
    <IconChevron />
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const navigation = useNavigation<RootNavProp>();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const [notifRides,      setNotifRides]      = useState(true);
  const [notifChat,       setNotifChat]        = useState(true);
  const [locationBg,      setLocationBg]       = useState(true);
  const [shareAnonymous,  setShareAnonymous]   = useState(false);
  const [biometric,       setBiometric]        = useState(false);
  const [biometricAvail,  setBiometricAvail]   = useState(false);
  const mapStyle    = useUIStore((st) => st.mapStyle);
  const setMapStyle = useUIStore((st) => st.setMapStyle);

  useEffect(() => {
    biometricService.getStatus().then((s) => setBiometricAvail(s.available && s.enrolled));
    biometricService.isBiometricLockEnabled().then(setBiometric);
  }, []);

  const handleBiometricToggle = async (next: boolean) => {
    if (next) {
      const ok = await biometricService.authenticate('Enable app lock');
      if (!ok) {
        Alert.alert('Cancelled', 'Biometric authentication required to enable lock.');
        return;
      }
      await biometricService.setupBiometricLock();
      setBiometric(true);
    } else {
      await biometricService.disableBiometricLock();
      setBiometric(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        try { await authService.logout(); } finally { logout(); }
      }},
    ]);
  };

  const openLink = (url: string) => Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open link.'));

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* Profile card */}
        <View style={s.profileCard}>
          <View style={s.profileAvatar}>
            <Text style={s.profileAvatarText}>{(user?.name ?? 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{user?.name ?? 'GoShareX User'}</Text>
            <Text style={s.profileEmail}>{user?.email ?? ''}</Text>
          </View>
          <TouchableOpacity
            style={s.editBtn}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.8}
          >
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <SectionHeader label="Notifications" />
        <View style={s.card}>
          <ToggleRow icon={<IconBell />}              label="Ride requests"    sub="Alert when a rider wants to share"   value={notifRides}     onChange={setNotifRides} />
          <View style={s.divider} />
          <ToggleRow icon={<IconBell color={C.teal} />} label="Chat messages" sub="New message alerts"                  value={notifChat}      onChange={setNotifChat} />
        </View>

        {/* Location & Privacy */}
        <SectionHeader label="Location & Privacy" />
        <View style={s.card}>
          <ToggleRow icon={<IconMap />}    label="Background location" sub="Required for real-time ride matching" value={locationBg}     onChange={setLocationBg} />
          <View style={s.divider} />
          <ToggleRow icon={<IconShield />} label="Anonymous mode"      sub="Hide your identity in group chats"   value={shareAnonymous} onChange={setShareAnonymous} />
          {biometricAvail && (
            <>
              <View style={s.divider} />
              <ToggleRow
                icon={<IconLock />}
                label="Biometric lock"
                sub="Require fingerprint/face after 5 min in background"
                value={biometric}
                onChange={handleBiometricToggle}
              />
            </>
          )}
        </View>

        {/* Map Appearance */}
        <SectionHeader label="Map Appearance" />
        <View style={s.card}>
          {(['auto', 'light', 'dark', 'brand'] as MapStyleId[]).map((id, idx, arr) => (
            <React.Fragment key={id}>
              <TouchableOpacity
                style={s.row}
                onPress={() => setMapStyle(id)}
                activeOpacity={0.7}
              >
                <View style={s.rowIcon}>
                  <IconMap color={mapStyle === id ? C.primary : C.teal} />
                </View>
                <View style={s.rowInfo}>
                  <Text style={[s.rowLabel, mapStyle === id && { color: C.primary, fontWeight: '800' }]}>
                    {MAP_STYLE_LABELS[id]}
                  </Text>
                  <Text style={s.rowSub}>
                    {id === 'auto' ? 'Follow system / default Google look' :
                     id === 'light' ? 'Clean light palette, fewer POIs' :
                     id === 'dark' ? 'Premium dark theme' :
                     'GoShareX indigo brand colors'}
                  </Text>
                </View>
                {mapStyle === id && (
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="10" fill={C.primary} />
                    <Path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
              </TouchableOpacity>
              {idx < arr.length - 1 && <View style={s.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Account */}
        <SectionHeader label="Account" />
        <View style={s.card}>
          <View style={s.row}>
            <View style={s.rowIcon}><IconUser /></View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Email</Text>
              <Text style={s.rowSub}>{user?.email ?? '—'}</Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.row}>
            <View style={s.rowIcon}><IconLock /></View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Account type</Text>
              <Text style={s.rowSub}>Standard rider</Text>
            </View>
          </View>
        </View>

        {/* Legal */}
        <SectionHeader label="Legal & Compliance" />
        <View style={s.card}>
          <LinkRow
            icon={<IconGavel />}
            label="Terms & Privacy Policy"
            sub="How we handle your data + ride rules"
            onPress={() => navigation.navigate('Legal')}
          />
        </View>

        {/* App info */}
        <View style={s.appInfoRow}>
          <Text style={s.appInfoText}>GoShareX · v1.1.1</Text>
          <View style={s.appInfoTagline}>
            <Text style={s.appInfoText}>Share rides · Save money</Text>
            <PremiumIcon name="rickshaw" size={12} tone="amber" />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <IconLogout />
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Profile card
  profileCard: {
    margin: 16, marginTop: 8,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 24, padding: 16,
    shadowColor: '#6366F1', shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 2, borderColor: 'rgba(99,102,241,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 22, fontWeight: '900', color: C.primary },
  profileInfo:       { flex: 1, gap: 2 },
  profileName:       { fontSize: 16, fontWeight: '800', color: C.text },
  profileEmail:      { fontSize: 12, color: C.textSub },
  editBtn: {
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: C.primary },

  // Section header
  sectionHeader: {
    fontSize: 10, fontWeight: '800', color: C.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginHorizontal: 16, marginTop: 20, marginBottom: 8,
  },

  // Card + rows
  card: {
    marginHorizontal: 16,
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, gap: 12,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  rowInfo:  { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: C.text },
  rowSub:   { fontSize: 11, color: C.textSub, marginTop: 2 },
  divider:  { height: 1, backgroundColor: C.border, marginLeft: 62 },

  // Disclaimer
  disclaimerCard: {
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: 'rgba(245,158,11,0.06)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 20, padding: 16,
  },
  disclaimerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  disclaimerTitle:  { fontSize: 13, fontWeight: '800', color: '#92680A' },
  disclaimerBody:   { fontSize: 12, color: '#7A6040', lineHeight: 20 },
  disclaimerBold:   { fontWeight: '800', color: '#92680A' },

  // App info
  appInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 20,
  },
  appInfoTagline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appInfoText: { fontSize: 11, color: C.textMuted },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 16,
    height: 52, borderRadius: 18,
    backgroundColor: 'rgba(239,68,68,0.07)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutText: { fontSize: 15, fontWeight: '800', color: C.red },
});
