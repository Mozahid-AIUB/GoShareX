import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { useAuthStore } from '@/store/authStore';

interface RideRecord { id: string; destination: string; splitAmount: number; status: string; completedAt: number; rider1Name: string; rider2Name: string; rider1: string; }

export default function RideHistoryScreen() {
  const { user } = useAuthStore();
  const [rides, setRides] = useState<RideRecord[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'rides'), where('rider1', '==', user.uid), orderBy('confirmedAt', 'desc'));
    return onSnapshot(q, (snap) => setRides(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RideRecord))));
  }, [user?.uid]);

  return (
    <View style={styles.container}>
      <FlatList
        data={rides}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <View style={styles.rideCard}>
            <Text style={styles.dest}>🛺 {item.destination}</Text>
            <Text style={styles.meta}>Partner: {item.rider1 === user?.uid ? item.rider2Name : item.rider1Name}</Text>
            <Text style={styles.amount}>💰 ৳{item.splitAmount} saved</Text>
            <Text style={[styles.status, { color: item.status === 'completed' ? '#34A853' : '#EA4335' }]}>{item.status}</Text>
          </View>
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={{ fontSize: 40 }}>🛺</Text><Text style={{ color: '#9E9E9E', marginTop: 10 }}>কোনো ride history নেই</Text></View>}
        contentContainerStyle={{ padding: 14, gap: 10 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  rideCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 2, gap: 4 },
  dest: { fontSize: 16, fontWeight: '700', color: '#202124' },
  meta: { fontSize: 13, color: '#666' },
  amount: { fontSize: 14, fontWeight: '600', color: '#34A853' },
  status: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  empty: { alignItems: 'center', marginTop: 80 },
});
