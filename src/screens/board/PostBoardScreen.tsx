import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Animated, FlatList, StyleSheet,
  TextInput, TouchableOpacity, View, InteractionManager,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import PremiumIcon from '@/components/common/PremiumIcon';
import VehicleIcon from '@/components/common/VehicleIcon';

import type { RootNavProp } from '@/navigation/types';
import { cancelPost, joinPost, leavePost, subscribeToOpenPosts } from '@/services/postService';
import { useAuthStore } from '@/store/authStore';
import type { Post } from '@/types/post.types';
import { getErrorMessage } from '@/utils/errorHandler';
import { useScreenFocusTracking } from '@/hooks/useScreenTracking';

const C = {
  bg: '#F5F5FA', card: '#FFFFFF', border: '#E8E4F4',
  primary: '#6366F1', primarySoft: 'rgba(99,102,241,0.08)',
  text: '#1A1A2E', textSub: '#6B7280', textMuted: '#B0AACC',
  green: '#10B981', greenSoft: 'rgba(16,185,129,0.08)',
  amber: '#F59E0B',
  red: '#EF4444', redSoft: 'rgba(239,68,68,0.07)',
};

const IconPlus = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);
const IconSearch = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={C.textMuted} strokeWidth="2" />
    <Path d="M16.5 16.5L21 21" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);
const IconClear = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);
const IconRefresh = ({ spinning }: { spinning: boolean }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4v5h5M20 20v-5h-5" stroke={spinning ? C.primary : C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M20 9A8 8 0 0 0 5.07 5.07M4 15a8 8 0 0 0 14.93 3.93" stroke={spinning ? C.primary : C.textMuted} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);
const IconEmpty = () => (
  <Svg width={40} height={40} viewBox="0 0 56 56" fill="none">
    <Defs>
      <LinearGradient id="eg" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#6366F1" stopOpacity="0.15" />
        <Stop offset="1" stopColor="#10B981" stopOpacity="0.08" />
      </LinearGradient>
    </Defs>
    <Circle cx="28" cy="28" r="28" fill="url(#eg)" />
    <Rect x="14" y="16" width="28" height="24" rx="5" stroke="#6366F1" strokeWidth="1.8" fill="none" opacity="0.5" />
    <Path d="M20 24h16M20 30h10" stroke="#6366F1" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
  </Svg>
);

const IconDirectionArrow = () => (
  <Svg width={18} height={14} viewBox="0 0 24 16" fill="none">
    {/* Line */}
    <Path d="M2 8h18" stroke="#6366F1" strokeWidth="1.8" strokeLinecap="round" />
    {/* Arrow head */}
    <Path d="M18 4l6 4-6 4" stroke="#6366F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

const RT: Record<string, { vehicleType: 'rickshaw' | 'motorcycle'; tone: 'amber' | 'indigo'; label: string; color: string; bg: string }> = {
  share: { vehicleType: 'rickshaw', tone: 'amber', label: 'Share', color: '#6366F1', bg: 'rgba(99,102,241,0.08)' },
  bike_owner: { vehicleType: 'motorcycle', tone: 'indigo', label: 'Bike', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
};

function calcExpiry(expiresAt: number) {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return { label: 'Expired', urgent: true };
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return { label: h > 0 ? `${h}h ${m}m` : `${m}m`, urgent: h === 0 && m <= 30 };
}

function useExpireTick(expiresAt: number) {
  const [state, setState] = useState(() => calcExpiry(expiresAt));
  useEffect(() => {
    const id = setInterval(() => setState(calcExpiry(expiresAt)), 30_000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return state;
}

// ─── Compact Post Card ────────────────────────────────────────────────────────
const PostCard = React.memo(({ item, onJoin, onLeave, onCancel, onChat, isBusy, myUid }: {
  item: Post; onJoin: () => void; onLeave: () => void;
  onCancel: () => void; onChat: () => void;
  isBusy: boolean; myUid: string;
}) => {
  const isOwner = item.authorId === myUid;
  const joined = item.interested.includes(myUid);
  const isMatched = item.status === 'matched';
  const spots = Math.max(0, item.maxRiders - 1 - item.interested.length);
  const rt = RT[item.rideType ?? 'share'];
  const { label: expLbl, urgent } = useExpireTick(item.expiresAt);
  const initial = (item.authorName || 'U')[0].toUpperCase();

  return (
    <View style={[cd.card, isOwner && cd.cardMine, isMatched && cd.cardMatched]}>

      {/* ── single header line ── */}
      <View style={cd.header}>
        {/* avatar */}
        <View style={[cd.av, isMatched && cd.avGreen, isOwner && !isMatched && cd.avPurple]}>
          <Text style={[cd.avTxt, isMatched && { color: C.green }, isOwner && !isMatched && { color: C.primary }]}>
            {initial}
          </Text>
        </View>

        {/* name + badges */}
        <View style={cd.mid}>
          <View style={cd.nameRow}>
            <Text style={cd.name} numberOfLines={1}>{item.authorName}</Text>
            <Text style={cd.star}>★{(item.authorRating ?? 5).toFixed(1)}</Text>
            {isOwner && <View style={cd.ownPill}><Text style={cd.ownPillTxt}>You</Text></View>}
            {isMatched && <View style={cd.matchPill}><PremiumIcon name="party-popper" size={8} tone="green" /><Text style={cd.matchPillTxt}>Matched</Text></View>}
          </View>
          <View style={cd.badgeRow}>
            <View style={[cd.rtPill, { backgroundColor: rt.bg }]}>
              <VehicleIcon type={rt.vehicleType} tone={rt.tone} size={20} />
              <Text style={[cd.rtTxt, { color: rt.color }]}>{rt.label}</Text>
            </View>
            {item.maxRiders >= 3 && (
              <View style={[cd.rtPill, { backgroundColor: 'rgba(124,58,237,0.1)' }]}>
                <Text style={[cd.rtTxt, { color: '#7C3AED' }]}>
                  Group · {item.maxRiders}
                </Text>
              </View>
            )}
            <View style={[cd.spotPill, spots === 0 ? cd.spotFull : cd.spotOpen]}>
              <Text style={[cd.spotTxt, spots === 0 ? { color: C.red } : { color: C.green }]}>
                {spots === 0 ? 'Full' : `${spots} spot${spots > 1 ? 's' : ''}`}
              </Text>
            </View>
          </View>
        </View>

        {/* time + expire — right column */}
        <View style={cd.right}>
          {!!item.meetTime && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Svg width={10} height={10} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="9" stroke={C.textSub} strokeWidth="1.8" /><Path d="M12 7v5l3 3" stroke={C.textSub} strokeWidth="1.8" strokeLinecap="round" /></Svg>
              <Text style={cd.timeT}>{item.meetTime}</Text>
            </View>
          )}
          <View style={cd.expRow}>
            <PremiumIcon name="timer-sand" size={8} tone={urgent ? 'red' : 'slate'} />
            <Text style={[cd.expT, urgent && { color: C.red }]}>{expLbl}</Text>
          </View>
        </View>
      </View>

      {/* ── route chip ── */}
      <View style={cd.route}>
        <Text style={cd.routeFrom} numberOfLines={1}>{item.destination}</Text>
        <View style={cd.routeArrowContainer}>
          <IconDirectionArrow />
        </View>
        <Text style={cd.routeTo} numberOfLines={1}>{item.meetPoint}</Text>
      </View>

      {/* note — only if present */}
      {!!item.note && <Text style={cd.note} numberOfLines={1}>&quot;{item.note}&quot;</Text>}

      {/* ── actions ── inline, right-aligned, small ── */}
      <View style={cd.footer}>
        {isOwner ? (
          <TouchableOpacity style={cd.btnDanger} onPress={onCancel} disabled={isBusy} activeOpacity={0.8}>
            <Text style={cd.btnDangerTxt}>{isBusy ? '…' : 'Cancel'}</Text>
          </TouchableOpacity>
        ) : isMatched ? (
          <TouchableOpacity style={cd.btnPrimary} onPress={onChat} activeOpacity={0.85}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Svg width={11} height={11} viewBox="0 0 24 24" fill="none"><Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
              <Text style={cd.btnPrimaryTxt}>Start Chat →</Text>
            </View>
          </TouchableOpacity>
        ) : joined ? (
          <>
            <TouchableOpacity style={cd.btnGreen} onPress={onChat} activeOpacity={0.85}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Svg width={11} height={11} viewBox="0 0 24 24" fill="none"><Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                <Text style={cd.btnGreenTxt}>Chat</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={cd.btnGhost} onPress={onLeave} disabled={isBusy} activeOpacity={0.8}>
              <Text style={cd.btnGhostTxt}>{isBusy ? '…' : 'Leave'}</Text>
            </TouchableOpacity>
          </>
        ) : spots === 0 ? (
          <View style={cd.btnGhost}><Text style={cd.btnGhostTxt}>Full</Text></View>
        ) : (
          <>
            <TouchableOpacity style={cd.btnGhost} onPress={onChat} activeOpacity={0.85}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"><Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={C.textSub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </TouchableOpacity>
            <TouchableOpacity style={cd.btnPrimary} onPress={onJoin} disabled={isBusy} activeOpacity={0.85}>
              <Text style={cd.btnPrimaryTxt}>{isBusy ? '…' : '+ Join'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
});
PostCard.displayName = 'PostCard';

const cd = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingTop: 9, paddingBottom: 8,
    marginBottom: 6, elevation: 1,
    shadowColor: '#6366F1', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  cardMine: { borderColor: C.primary, borderWidth: 1.5 },
  cardMatched: { borderColor: C.green, borderWidth: 1.5 },

  // header
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  av: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#EDEDF9', alignItems: 'center', justifyContent: 'center',
  },
  avGreen: { backgroundColor: 'rgba(16,185,129,0.12)' },
  avPurple: { backgroundColor: 'rgba(99,102,241,0.12)' },
  avTxt: { fontSize: 12, fontWeight: '800', color: C.textSub },

  mid: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 12, fontWeight: '700', color: C.text, flexShrink: 1 },
  star: { fontSize: 10, fontWeight: '700', color: C.amber },
  ownPill: { backgroundColor: C.primarySoft, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  ownPillTxt: { fontSize: 9, fontWeight: '800', color: C.primary },
  matchPill: { backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  matchPillTxt: { fontSize: 9, fontWeight: '800', color: C.green },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rtPill: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  rtTxt: { fontSize: 10, fontWeight: '700' },
  spotPill: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  spotOpen: { backgroundColor: 'rgba(16,185,129,0.08)' },
  spotFull: { backgroundColor: 'rgba(239,68,68,0.07)' },
  spotTxt: { fontSize: 10, fontWeight: '700' },

  right: { alignItems: 'flex-end', gap: 2 },
  timeT: { fontSize: 10, fontWeight: '700', color: C.textSub },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expT: { fontSize: 10, fontWeight: '600', color: C.textMuted },

  // route — single tight row
  route: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F7F5FF', borderRadius: 7,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 8, paddingVertical: 5, marginBottom: 5,
  },
  routeFrom: { flex: 1, fontSize: 11, fontWeight: '600', color: C.text },
  routeArrowContainer: { alignItems: 'center', justifyContent: 'center' },
  routeArrow: { fontSize: 12, color: C.textMuted, fontWeight: '300' },
  routeTo: { flex: 1, fontSize: 11, fontWeight: '600', color: C.textSub, textAlign: 'right' },

  note: { fontSize: 10, color: C.textSub, fontStyle: 'italic', marginBottom: 5, paddingHorizontal: 1 },

  // footer — right-aligned row of small buttons
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },

  btnPrimary: {
    backgroundColor: C.primary, borderRadius: 7,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  btnPrimaryTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },

  btnGreen: {
    backgroundColor: C.greenSoft, borderRadius: 7,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
  },
  btnGreenTxt: { fontSize: 11, fontWeight: '700', color: C.green },

  btnGhost: {
    backgroundColor: '#F3F4F6', borderRadius: 7,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  btnGhostTxt: { fontSize: 11, fontWeight: '600', color: C.textSub },

  btnDanger: {
    backgroundColor: C.redSoft, borderRadius: 7,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.18)',
  },
  btnDangerTxt: { fontSize: 11, fontWeight: '700', color: C.red },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function PostBoardScreen() {
  useScreenFocusTracking('PostBoard');
  const navigation = useNavigation<RootNavProp>();
  const tabBarH = useBottomTabBarHeight();
  const { user } = useAuthStore();

  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState('');
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinRef = useRef<Animated.CompositeAnimation | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const subscribe = useCallback(() => {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = subscribeToOpenPosts(setPosts);
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => subscribe());
    return () => { task.cancel(); unsubRef.current?.(); };
  }, [subscribe]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    spinRef.current?.stop(); spinAnim.setValue(0);
    spinRef.current = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 600, useNativeDriver: true })
    );
    spinRef.current.start();
    subscribe();
    setTimeout(() => { spinRef.current?.stop(); spinAnim.setValue(0); setRefreshing(false); }, 900);
  }, [subscribe, spinAnim]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const ok = (p: Post) => !q ||
      p.destination.toLowerCase().includes(q) ||
      p.meetPoint.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q);
    const mine = posts.filter(p => p.authorId === user?.uid && ok(p));
    const others = posts.filter(p => p.authorId !== user?.uid && ok(p));
    return [...mine, ...others];
  }, [posts, search, user?.uid]);

  const destCount = useMemo(() => {
    const m: Record<string, number> = {};
    posts.forEach(p => { m[p.destination] = (m[p.destination] ?? 0) + 1; });
    return m;
  }, [posts]);

  const handleJoin = useCallback(async (post: Post) => {
    if (!user) { Alert.alert('Login required'); return; }
    if (post.interested.includes(user.uid)) { Alert.alert('Already joined'); return; }
    if (post.interested.length >= post.maxRiders - 1) { Alert.alert('Post full', 'This ride is already full.'); return; }
    setBusyPostId(post.postId);
    try { await joinPost(post.postId, user.uid, user.name); }
    catch (e: unknown) { Alert.alert('Join failed', getErrorMessage(e) || 'Try again.'); }
    finally { setBusyPostId(null); }
  }, [user]);

  const handleLeave = useCallback((post: Post) => {
    if (!user) return;
    Alert.alert('Leave ride?', 'You will be removed from this post.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          setBusyPostId(post.postId);
          try { await leavePost(post.postId, user.uid); }
          catch (e: unknown) { Alert.alert('Error', getErrorMessage(e)); }
          finally { setBusyPostId(null); }
        }
      },
    ]);
  }, [user]);

  const handleCancel = useCallback((post: Post) => {
    if (!user) return;
    Alert.alert('Cancel post?', 'This will remove your ride post.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setBusyPostId(post.postId);
          try { await cancelPost(post.postId, user.uid); }
          catch (e: unknown) { Alert.alert('Error', getErrorMessage(e)); }
          finally { setBusyPostId(null); }
        }
      },
    ]);
  }, [user]);

  const handleChat = useCallback((post: Post) => {
    if (!user) { Alert.alert('Login required'); return; }
    navigation.navigate('Chat', {
      chatId: [user.uid, post.authorId].sort().join('_'),
      partnerName: post.authorName,
      rider: {
        uid: post.authorId,
        name: post.authorName,
        destination: post.destination,
        pickupPoint: post.meetPoint,
        rating: post.authorRating ?? 5,
        badge: post.authorBadge ?? 'New Rider',
        lat: 0, lng: 0, distance: 0,
        isMatch: false,
      },
    });
  }, [user, navigation]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.hdr}>
        <View>
          <Text style={s.title}>RidePool</Text>
          <Text style={s.sub}>{posts.length} ride{posts.length !== 1 ? 's' : ''} available</Text>
        </View>
        <View style={s.hdrBtns}>
          <TouchableOpacity style={s.iconBtn} onPress={handleRefresh} disabled={refreshing} activeOpacity={0.75}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <IconRefresh spinning={refreshing} />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity style={s.postBtn} onPress={() => navigation.navigate('CreatePost')} activeOpacity={0.85}>
            <IconPlus /><Text style={s.postBtnTxt}>Post</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <IconSearch />
          <TextInput
            value={search} onChangeText={setSearch}
            placeholder="Search destination, meet point, name..."
            placeholderTextColor={C.textMuted}
            style={s.searchInput} returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <IconClear />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Destination pills */}
      {Object.keys(destCount).length > 0 && (
        <FlatList
          horizontal data={Object.entries(destCount)} keyExtractor={([d]) => d}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pillRow} style={s.pillScroll}
          renderItem={({ item: [dest, count] }) => (
            <TouchableOpacity
              style={[s.pill, search === dest && s.pillOn]}
              onPress={() => setSearch(search === dest ? '' : dest)}
              activeOpacity={0.75}
            >
              <Text style={[s.pillTxt, search === dest && s.pillTxtOn]}>{dest}</Text>
              <View style={[s.pillBadge, search === dest && s.pillBadgeOn]}>
                <Text style={[s.pillBadgeTxt, search === dest && s.pillBadgeTxtOn]}>{count}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.postId}
        contentContainerStyle={[s.list, { paddingBottom: tabBarH + 14 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <PostCard
            item={item} myUid={user?.uid ?? ''}
            isBusy={busyPostId === item.postId}
            onJoin={() => handleJoin(item)} onLeave={() => handleLeave(item)}
            onCancel={() => handleCancel(item)} onChat={() => handleChat(item)}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <IconEmpty />
            <Text style={s.emptyTitle}>{search ? 'No matches' : 'No rides yet'}</Text>
            <Text style={s.emptySub}>
              {search ? `No rides matching "${search}".` : 'Be the first to post a ride!'}
            </Text>
            {!search && (
              <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('CreatePost')} activeOpacity={0.85}>
                <Text style={s.emptyBtnTxt}>+ Post a Ride</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 4, paddingBottom: 7 },
  title: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  sub: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  hdrBtns: { flexDirection: 'row', gap: 7 },
  iconBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 6, elevation: 3, shadowColor: C.primary, shadowOpacity: 0.22, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  postBtnTxt: { fontSize: 12, fontWeight: '800', color: '#fff' },

  searchWrap: { paddingHorizontal: 12, marginBottom: 6 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, height: 38 },
  searchInput: { flex: 1, fontSize: 12, color: C.text, paddingVertical: 0 },

  pillScroll: { maxHeight: 36 },
  pillRow: { paddingHorizontal: 12, gap: 6, alignItems: 'center', paddingBottom: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  pillOn: { backgroundColor: C.primary, borderColor: C.primary },
  pillTxt: { fontSize: 11, fontWeight: '600', color: C.textSub },
  pillTxtOn: { color: '#fff' },
  pillBadge: { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  pillBadgeOn: { backgroundColor: 'rgba(255,255,255,0.25)' },
  pillBadgeTxt: { fontSize: 9, fontWeight: '800', color: C.textSub },
  pillBadgeTxtOn: { color: '#fff' },

  list: { paddingHorizontal: 11, paddingTop: 2 },
  empty: { alignItems: 'center', paddingTop: 44, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginTop: 12, marginBottom: 4 },
  emptySub: { fontSize: 12, color: C.textSub, textAlign: 'center', lineHeight: 17, marginBottom: 16 },
  emptyBtn: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8 },
  emptyBtnTxt: { fontSize: 12, fontWeight: '800', color: '#fff' },
});
