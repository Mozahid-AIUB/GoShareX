import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Avatar, Divider } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '@/store/authStore';
import authService from '@/services/firebase/authService';
import { getUser } from '@/services/firebase/userService';
import type { User } from '@/types/auth.types';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const BADGE_COLORS: Record<string, string> = {
  'Elite Rider': '#FF8C00',
  Trusted: '#1A73E8',
  Regular: '#34A853',
  'New Rider': '#9E9E9E',
  Unreliable: '#E53935',
};

const isRecoverableFirestoreError = (error: any) => {
  const normalizedCode = String(error?.code ?? '').toLowerCase();
  const normalizedMessage = String(error?.message ?? '').toLowerCase();

  return (
    normalizedCode.includes('unavailable') ||
    normalizedCode.includes('deadline-exceeded') ||
    normalizedCode.includes('failed-precondition') ||
    normalizedCode.includes('network-request-failed') ||
    normalizedMessage.includes('offline') ||
    normalizedMessage.includes('network') ||
    normalizedMessage.includes('client is offline') ||
    normalizedMessage.includes('server connection is unstable')
  );
};

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, logout, setUser } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(user);
  const { isConnected, isInternetReachable } = useNetworkStatus();

  useEffect(() => {
    setProfile(user);
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const loadProfile = async () => {
        if (!user?.uid) return;
        const nextProfile = await getUser(user.uid);
        if (!active || !nextProfile) return;
        setProfile({
          ...nextProfile,
          profileStatus: 'live',
          profileWarning: undefined,
        });
        setUser({
          ...nextProfile,
          profileStatus: 'live',
          profileWarning: undefined,
        });
      };

      loadProfile().catch((error) => {
        if (!isRecoverableFirestoreError(error)) {
          console.warn('Profile refresh error:', error);
        }
      });

      return () => {
        active = false;
      };
    }, [user?.uid, setUser])
  );

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth', params: { screen: 'Login' } as any }],
      });
    }
  };

  const badgeColor = BADGE_COLORS[profile?.badge ?? 'New Rider'] ?? '#9E9E9E';
  const joinedAt = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString()
    : 'N/A';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
    >
      {profile?.profileStatus === 'fallback' ? (
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerTitle}>
            {isConnected && isInternetReachable ? 'Syncing profile data' : 'You are offline'}
          </Text>
          <Text style={styles.statusBannerText}>
            {profile.profileWarning ??
              'Some profile details are temporarily unavailable. The app will refresh them automatically.'}
          </Text>
        </View>
      ) : null}

      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={(profile?.name ?? 'U').charAt(0).toUpperCase()}
          style={{ backgroundColor: badgeColor }}
          labelStyle={{ color: '#fff', fontSize: 32, fontWeight: '800' }}
        />
        <Text style={styles.name}>{profile?.name ?? 'Student'}</Text>
        <Text style={styles.email}>{profile?.email ?? 'No email'}</Text>
        <View style={[styles.badgeChip, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{profile?.badge ?? 'New Rider'}</Text>
        </View>
        <Text style={styles.rating}>Rating {(profile?.rating ?? 5).toFixed(1)}</Text>
      </View>

      <View style={styles.statsGrid}>
        {[
          { label: 'Total Rides', value: String(profile?.totalRides ?? 0), icon: 'Ride' },
          { label: 'Saved', value: `BDT ${profile?.totalSaved ?? 0}`, icon: 'Save' },
          { label: 'Completion', value: `${profile?.completionRate ?? 100}%`, icon: 'Done' },
          { label: 'Member Since', value: joinedAt, icon: 'Date' },
        ].map((item) => (
          <View key={item.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{item.icon}</Text>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Divider style={{ marginVertical: 16 }} />

      {[
        { label: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') },
        { label: 'Ride History', onPress: () => navigation.navigate('RideHistory') },
        { label: 'Settings', onPress: () => navigation.navigate('Settings') },
        { label: 'Report a Problem', onPress: () => {} },
      ].map((item) => (
        <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  statusBanner: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F4B400',
  },
  statusBannerTitle: { fontSize: 14, fontWeight: '800', color: '#8A5A00', marginBottom: 4 },
  statusBannerText: { fontSize: 13, lineHeight: 18, color: '#6D4C00' },
  header: { backgroundColor: '#fff', alignItems: 'center', padding: 28, paddingTop: 40, gap: 8 },
  name: { fontSize: 22, fontWeight: '800', color: '#202124', marginTop: 8 },
  email: { fontSize: 13, color: '#9E9E9E' },
  badgeChip: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 16, marginTop: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  rating: { fontSize: 18, fontWeight: '700', color: '#FBBC04', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', gap: 4, elevation: 1 },
  statIcon: { fontSize: 12, color: '#9E9E9E' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#202124', textAlign: 'center' },
  statLabel: { fontSize: 11, color: '#9E9E9E', textAlign: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, marginHorizontal: 12, marginBottom: 2, borderRadius: 12, elevation: 1 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#202124' },
  chevron: { color: '#DADCE0', fontSize: 18 },
  logoutBtn: { margin: 16, marginTop: 24, backgroundColor: '#FFEBEE', padding: 16, borderRadius: 14, alignItems: 'center' },
  logoutText: { color: '#C62828', fontSize: 16, fontWeight: '700' },
});
