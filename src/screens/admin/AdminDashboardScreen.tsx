import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAdminStats, type AdminStats } from '@/hooks/useAdminStats';
import { useSystemBars } from '@/hooks/useSystemBars';

const C = {
  bg: '#FAF8FF',
  card: '#FFFFFF',
  border: '#EDE8F5',
  primary: '#6366F1',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  text: '#1A1A2E',
  textSub: '#6B7280',
  textMuted: '#9896A8',
};

/** একটা বড় সংখ্যা-কার্ড */
const StatCard = ({
  label, value, icon, color, wide,
}: { label: string; value: string | number; icon: string; color: string; wide?: boolean }) => (
  <View style={[s.statCard, wide && s.statCardWide]}>
    <View style={[s.statIcon, { backgroundColor: color + '18' }]}>
      <MaterialCommunityIcons name={icon as any} size={18} color={color} />
    </View>
    <Text style={s.statValue}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

/** সমস্যা-সারির একটা লাইন (সংখ্যা বাড়লে লাল) */
const ProblemRow = ({ label, value }: { label: string; value: number }) => (
  <View style={s.probRow}>
    <Text style={s.probLabel}>{label}</Text>
    <View style={[s.probBadge, value > 0 && s.probBadgeWarn]}>
      <Text style={[s.probNum, value > 0 && s.probNumWarn]}>{value}</Text>
    </View>
  </View>
);

/** ৭-দিনের নতুন-user mini bar chart */
const MiniChart = ({ data }: { data: AdminStats['daily'] }) => {
  const max = Math.max(1, ...data.map((d) => Math.max(d.users, d.rides)));
  return (
    <View style={s.chartRow}>
      {data.map((d) => {
        const day = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
        return (
          <View key={d.date} style={s.chartCol}>
            <View style={s.chartBars}>
              <View style={[s.bar, { height: 4 + (d.users / max) * 60, backgroundColor: C.primary }]} />
              <View style={[s.bar, { height: 4 + (d.rides / max) * 60, backgroundColor: C.green }]} />
            </View>
            <Text style={s.chartDay}>{day}</Text>
          </View>
        );
      })}
    </View>
  );
};

export default function AdminDashboardScreen() {
  useSystemBars(C.bg, 'dark');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { stats, loading, error, refresh } = useAdminStats();

  const acceptRate =
    stats && stats.req_total > 0 ? Math.round((stats.req_accepted / stats.req_total) * 100) : 0;

  return (
    <View style={[s.wrap, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={s.back}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Admin Dashboard</Text>
          <Text style={s.subtitle}>
            {stats ? `Updated ${new Date(stats.generated_at).toLocaleTimeString()}` : 'Live overview'}
          </Text>
        </View>
        <View style={s.liveDot}>
          <View style={s.liveDotInner} />
          <Text style={s.liveText}>LIVE</Text>
        </View>
      </View>

      {error ? (
        <View style={s.errorBox}>
          <MaterialCommunityIcons name="lock-alert" size={28} color={C.red} />
          <Text style={s.errorTitle}>Access denied</Text>
          <Text style={s.errorSub}>{error}</Text>
        </View>
      ) : loading && !stats ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : stats ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={C.primary} />}
        >
          {/* ── Overview ── */}
          <Text style={s.sectionTitle}>Overview</Text>
          <View style={s.grid}>
            <StatCard label="Total users" value={stats.total_users} icon="account-group" color={C.primary} />
            <StatCard label="Live now" value={stats.live_now} icon="map-marker-radius" color={C.green} />
            <StatCard label="New today" value={stats.new_today} icon="account-plus" color={C.amber} />
            <StatCard label="Active 24h" value={stats.active_24h} icon="lightning-bolt" color={C.primary} />
            <StatCard label="Active 7d" value={stats.active_7d} icon="calendar-week" color={C.primary} />
            <StatCard label="Total rides" value={stats.total_rides} icon="bike" color={C.green} />
          </View>

          {/* ── Money saved (big highlight) ── */}
          <View style={s.saveCard}>
            <View>
              <Text style={s.saveLabel}>Total fare saved</Text>
              <Text style={s.saveValue}>৳ {Number(stats.total_saved).toLocaleString()}</Text>
            </View>
            <View style={s.saveRight}>
              <Text style={s.saveSubNum}>{stats.completed_rides}</Text>
              <Text style={s.saveSubLbl}>completed rides</Text>
            </View>
          </View>

          {/* ── Last 7 days ── */}
          <Text style={s.sectionTitle}>Last 7 days</Text>
          <View style={s.chartCard}>
            <View style={s.legendRow}>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: C.primary }]} /><Text style={s.legendTxt}>New users</Text></View>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: C.green }]} /><Text style={s.legendTxt}>New rides</Text></View>
            </View>
            <MiniChart data={stats.daily} />
          </View>

          {/* ── Request accept rate ── */}
          <Text style={s.sectionTitle}>Requests</Text>
          <View style={s.rateCard}>
            <View style={s.rateRing}>
              <Text style={s.rateNum}>{acceptRate}%</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.rateTitle}>Accept rate</Text>
              <Text style={s.rateSub}>{stats.req_accepted} accepted · {stats.req_total} total</Text>
            </View>
          </View>

          {/* ── Issues ── */}
          <Text style={s.sectionTitle}>Issues to watch</Text>
          <View style={s.probCard}>
            <ProblemRow label="Cancelled rides" value={stats.cancelled_rides} />
            <ProblemRow label="Suspended users" value={stats.suspended_users} />
            <ProblemRow label="Users with strikes" value={stats.striked_users} />
            <ProblemRow label="Stuck requests" value={stats.stuck_requests} />
            <ProblemRow label="Total reports" value={stats.total_reports} />
          </View>

          <Text style={s.footNote}>
            🔒 Only you can see this. Numbers refresh every 30 seconds. Install count will appear in Play Console once the app is published.
          </Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  back: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: -0.4 },
  subtitle: { fontSize: 11.5, color: C.textMuted, fontWeight: '600', marginTop: 1 },
  liveDot: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
  },
  liveDotInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  liveText: { fontSize: 9.5, fontWeight: '900', color: C.green, letterSpacing: 0.5 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 8 },
  errorTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  errorSub: { fontSize: 13, color: C.textSub, textAlign: 'center' },

  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.textSub, marginTop: 18, marginBottom: 10, letterSpacing: 0.3, textTransform: 'uppercase' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '31.5%', backgroundColor: C.card, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: C.border,
    elevation: 2, shadowColor: C.primary, shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  statCardWide: { width: '100%' },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', marginTop: 1 },

  saveCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.primary, borderRadius: 18, padding: 18, marginTop: 12,
    elevation: 4, shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  saveLabel: { fontSize: 12.5, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },
  saveValue: { fontSize: 30, fontWeight: '900', color: '#FFF', letterSpacing: -1, marginTop: 2 },
  saveRight: { alignItems: 'center' },
  saveSubNum: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  saveSubLbl: { fontSize: 10.5, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  chartCard: { backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendTxt: { fontSize: 11, color: C.textSub, fontWeight: '600' },
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80 },
  chartCol: { alignItems: 'center', flex: 1 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 64 },
  bar: { width: 7, borderRadius: 3 },
  chartDay: { fontSize: 9.5, color: C.textMuted, fontWeight: '700', marginTop: 5 },

  rateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  rateRing: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 5, borderColor: C.green,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,185,129,0.06)',
  },
  rateNum: { fontSize: 17, fontWeight: '900', color: C.green },
  rateTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  rateSub: { fontSize: 12, color: C.textSub, fontWeight: '600', marginTop: 2 },

  probCard: { backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border },
  probRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F3F0FC' },
  probLabel: { fontSize: 13.5, color: C.text, fontWeight: '600' },
  probBadge: { minWidth: 30, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#F3F4F8', alignItems: 'center' },
  probBadgeWarn: { backgroundColor: 'rgba(239,68,68,0.12)' },
  probNum: { fontSize: 13, fontWeight: '800', color: C.textSub },
  probNumWarn: { color: C.red },

  footNote: { fontSize: 11.5, color: C.textMuted, fontWeight: '500', lineHeight: 17, marginTop: 18, textAlign: 'center' },
});
