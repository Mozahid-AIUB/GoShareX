import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Avatar, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { useAuthStore } from '@/store/authStore';
import authService from '@/services/firebase/authService';

const BADGE_COLORS: Record<string, string> = {
  'Elite Rider': '#FF8C00',
  'Trusted': '#1A73E8',
  'Regular': '#34A853',
  'New Rider': '#9E9E9E',
};

interface UserStats {
  totalRides: number;
  totalSaved: number;
  completionRate: number;
  rating: number;
  badge: string;
  createdAt: string;
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<UserStats>({ totalRides: 0, totalSaved: 0, completionRate: 100, rating: 5.0, badge: 'New Rider', createdAt: '2026' });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.uid) return;
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) setStats({ ...stats, ...snap.data() });
    };
    fetchStats();
  }, [user?.uid]);

  const handleLogout = async () => {
    await authService.logout();
    logout();
  };

  const badgeColor = BADGE_COLORS[stats.badge] ?? '#9E9E9E';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar.Text size={80} label={(user?.name ?? 'U').charAt(0).toUpperCase()} style={{ backgroundColor: badgeColor }} labelStyle={{ color: '#fff', fontSize: 32, fontWeight: '800' }} />
        <Text style={styles.name}>{user?.name ?? 'Student'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={[styles.badgeChip, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{stats.badge}</Text>
        </View>
        <Text style={styles.rating}>⭐ {stats.rating.toFixed(1)}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {[
          { label: 'Total Rides', value: stats.totalRides.toString(), icon: '🛺' },
          { label: 'টাকা বাঁচিয়েছো', value: `৳${stats.totalSaved}`, icon: '💰' },
          { label: 'Completion', value: `${stats.completionRate}%`, icon: '✅' },
          { label: 'Member Since', value: stats.createdAt, icon: '📅' },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Divider style={{ marginVertical: 16 }} />

      {/* Menu items */}
      {[
        { icon: '📋', label: 'Ride History', onPress: () => navigation.navigate('RideHistory') },
        { icon: '⚙️', label: 'Settings', onPress: () => navigation.navigate('Settings') },
        { icon: '🚩', label: 'Report a Problem', onPress: () => {} },
        { icon: '🔒', label: 'Privacy Policy', onPress: () => {} },
      ].map((item) => (
        <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
          <Text style={styles.menuIcon}>{item.icon}</Text>
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Text style={{ color: '#DADCE0', fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: '#fff', alignItems: 'center', padding: 28, paddingTop: 40, gap: 8 },
  name: { fontSize: 22, fontWeight: '800', color: '#202124', marginTop: 8 },
  email: { fontSize: 13, color: '#9E9E9E' },
  badgeChip: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 16, marginTop: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  rating: { fontSize: 18, fontWeight: '700', color: '#FBBC04', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', gap: 4, elevation: 1 },
  statIcon: { fontSize: 24 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#202124' },
  statLabel: { fontSize: 11, color: '#9E9E9E', textAlign: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, marginHorizontal: 12, marginBottom: 2, borderRadius: 12, gap: 12, elevation: 1 },
  menuIcon: { fontSize: 20 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#202124' },
  logoutBtn: { margin: 16, marginTop: 24, backgroundColor: '#FFEBEE', padding: 16, borderRadius: 14, alignItems: 'center' },
  logoutText: { color: '#C62828', fontSize: 16, fontWeight: '700' },
});
