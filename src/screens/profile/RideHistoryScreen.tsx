import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import rideService from '@/services/rideService';
import { useAuthStore } from '@/store/authStore';
import PremiumIcon from '@/components/common/PremiumIcon';
import { useSystemBars } from '@/hooks/useSystemBars';

const PAGE_SIZE = 20;

interface RideRecord {
  id: string;
  destination: string;
  splitAmount: number;
  status: string;
  confirmedAt: number;
  rider1Name: string;
  rider2Name: string;
  rider1: string;
  rider2: string;
}

export default function RideHistoryScreen() {
  useSystemBars('#FAF8FF', 'dark');
  const { user } = useAuthStore();
  const [rides, setRides] = useState<RideRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // ride history router থেকে (Supabase/Firebase flag অনুযায়ী)। আগে সরাসরি
  // Firestore ডাকত → production-এ chats/rides Supabase-এ হওয়ায় ভুল data।
  const fetchPage = useCallback(async (p: number): Promise<RideRecord[]> => {
    if (!user?.uid) return [];
    const { rides: rows, hasMore: more } = await rideService.getRideHistory(user.uid, p, PAGE_SIZE);
    setHasMore(more);
    return rows as unknown as RideRecord[];
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    fetchPage(0)
      .then((records) => { setRides(records); setPage(0); })
      .catch(() => setError('Ride history লোড করা যায়নি।'))
      .finally(() => setLoading(false));
  }, [user?.uid, fetchPage]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const more = await fetchPage(nextPage);
      setRides((prev) => [...prev, ...more]);
      setPage(nextPage);
    } catch {
      setError('আরো ride লোড করা যায়নি।');
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rides}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => {
          const partnerName = item.rider1 === user?.uid ? item.rider2Name : item.rider1Name;
          const isCompleted = item.status === 'completed';
          const date = item.confirmedAt
            ? new Date(item.confirmedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';
          return (
            <View style={styles.rideCard}>
              {/* Top row — destination + status */}
              <View style={styles.cardTopRow}>
                <View style={styles.iconTextRow}>
                  <PremiumIcon name="rickshaw" size={14} tone="amber" />
                  <Text style={styles.dest}>{item.destination}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: isCompleted ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }]}>
                  <Text style={[styles.statusText, { color: isCompleted ? '#10B981' : '#EF4444' }]}>
                    {isCompleted ? 'Completed' : item.status}
                  </Text>
                </View>
              </View>

              {/* Partner + date */}
              <View style={styles.metaRow}>
                <Text style={styles.meta}>with {partnerName ?? '—'}</Text>
                <Text style={styles.date}>{date}</Text>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Fare */}
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Your share</Text>
                <Text style={styles.fareAmount}>৳{item.splitAmount}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <PremiumIcon name="rickshaw" size={32} tone="amber" />
            <Text style={styles.emptyTitle}>No rides yet</Text>
            <Text style={styles.emptySubtitle}>Your ride history will appear here</Text>
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore
                ? <ActivityIndicator size="small" color="#6366F1" />
                : <Text style={styles.loadMoreText}>Load more</Text>}
            </TouchableOpacity>
          ) : null
        }
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8FF' },
  errorText: { color: '#EF4444', fontSize: 15, textAlign: 'center', padding: 20 },

  rideCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#EDE8F5',
    shadowColor: '#6366F1', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
    gap: 10,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconTextRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dest: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', flex: 1 },

  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  date: { fontSize: 11, color: '#9896A8', fontWeight: '500' },

  divider: { height: 1, backgroundColor: '#EDE8F5' },

  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareLabel: { fontSize: 12, color: '#9896A8', fontWeight: '600' },
  fareAmount: { fontSize: 16, fontWeight: '900', color: '#10B981' },

  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E', marginTop: 8 },
  emptySubtitle: { fontSize: 13, color: '#9896A8' },

  loadMoreBtn: {
    alignItems: 'center', paddingVertical: 14, marginTop: 4,
    backgroundColor: 'rgba(99,102,241,0.07)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)',
  },
  loadMoreText: { color: '#6366F1', fontWeight: '700', fontSize: 14 },
});
