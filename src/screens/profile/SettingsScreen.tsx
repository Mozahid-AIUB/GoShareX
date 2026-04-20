import React from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { useAuthStore } from '@/store/authStore';
import authService from '@/services/firebase/authService';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const [notifEnabled, setNotifEnabled] = React.useState(true);
  const [locationBg, setLocationBg] = React.useState(true);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>🔔 Ride Requests</Text>
          <Switch value={notifEnabled} onValueChange={setNotifEnabled} trackColor={{ true: '#1A73E8' }} />
        </View>
      </View>
      <Divider />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>📍 Background Location</Text>
          <Switch value={locationBg} onValueChange={setLocationBg} trackColor={{ true: '#1A73E8' }} />
        </View>
      </View>
      <Divider />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>📧 Email</Text>
          <Text style={styles.settingValue}>{user?.email}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await authService.logout(); logout(); }}>
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  section: { backgroundColor: '#fff', padding: 16, gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  settingLabel: { fontSize: 15, color: '#202124' },
  settingValue: { fontSize: 14, color: '#9E9E9E' },
  logoutBtn: { margin: 16, backgroundColor: '#FFEBEE', padding: 16, borderRadius: 14, alignItems: 'center' },
  logoutText: { color: '#C62828', fontSize: 16, fontWeight: '700' },
});
