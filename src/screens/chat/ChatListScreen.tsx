import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, doc, getDocs, onSnapshot, orderBy, query, where, limit } from 'firebase/firestore';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { db } from '@/config/firebase.config';
import PremiumScreen from '@/components/common/PremiumScreen';
import { premiumTheme } from '@/design/premium';
import { useAuthStore } from '@/store/authStore';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { useNavigation } from '@react-navigation/native';
import chatService, { type Chat } from '@/services/firebase/chatService';

import {
  IconChevron,
  IconClose,
  IconGhost,
  IconGroup,
  IconMessage,
  IconSearch,
  IconShield,
  IconTimer,
} from './components/ChatListIcons';
import { PulseDot } from './components/ChatIndicators';
import { SearchingModal } from './components/SearchingModal';
import { JoiningGroupModal } from './components/JoiningGroupModal';
import { GroupRoomsModal } from './components/GroupRoomsModal';
import {
  SEARCH_TIMEOUT_MS,
  minutesLeft,
  type ChatItem,
  type GroupRoom,
} from './utils/chatHelpers';
import { useScreenFocusTracking } from '@/hooks/useScreenTracking';

const C = {
  bg: premiumTheme.bg,
  surface: 'rgba(255,255,255,0.055)',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.15)',
  primary: premiumTheme.primary,
  teal: premiumTheme.teal,
  amber: premiumTheme.amber,
  red: premiumTheme.rose,
  green: premiumTheme.green,
  text: premiumTheme.text,
  textSub: premiumTheme.textMuted,
  textMuted: '#343D55',
  white: '#FFFFFF',
  purple: premiumTheme.primaryBright,
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ChatListScreen() {
  useScreenFocusTracking('ChatList');
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();

  const [chats, setChats] = useState<ChatItem[]>([]);
  const [queryText, setQueryText] = useState('');
  const [readTimes, setReadTimes] = useState<Record<string, number>>({});

  // 1v1 searching state
  const [searching1v1, setSearching1v1] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Group modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupRooms, setGroupRooms] = useState<GroupRoom[]>([]);
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [showJoiningModal, setShowJoiningModal] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const redirectToAnonymousRoom = (room: { chatId: string; mode: 'anonymous_1v1' | 'anonymous_group' }) => {
    navigation.navigate('Chat', {
      chatId: room.chatId,
      anonymousMode: room.mode,
      partnerName: room.mode === 'anonymous_group' ? 'Anonymous Group' : 'Anonymous 1:1',
    });
  };

  // ── Live chats listener ──
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageTime', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatItem)));
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    void chatService.cleanupDuplicateAnonymousRooms(user.uid);
    void chatService.cleanupUserOrphanRooms(user.uid);
  }, [user?.uid]);

  useEffect(() => {
    let active = true;
    if (!user?.uid) {
      setReadTimes({});
      return;
    }
    storage.get<Record<string, Record<string, number>>>(STORAGE_KEYS.CHAT_READ_TIMES).then((allReadTimes) => {
      if (!active) return;
      setReadTimes(allReadTimes?.[user.uid] ?? {});
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.uid]);

  const persistReadTimes = async (next: Record<string, number>) => {
    if (!user?.uid) return;
    const allReadTimes = await storage.get<Record<string, Record<string, number>>>(STORAGE_KEYS.CHAT_READ_TIMES) ?? {};
    allReadTimes[user.uid] = next;
    await storage.set(STORAGE_KEYS.CHAT_READ_TIMES, allReadTimes);
  };

  const markChatRead = (chatId: string, at: number) => {
    setReadTimes((prev) => {
      const next = { ...prev, [chatId]: at };
      void persistReadTimes(next);
      return next;
    });
  };

  // ── Visible chats (hide expired + solo waiting rooms) ──
  const visibleChats = useMemo(() => {
    const now = Date.now();
    const myUid = user?.uid ?? '';
    return chats.filter((item) => {
      if (item.expiresAt && item.expiresAt <= now) return false;
      // hide solo waiting rooms that don't belong to this user
      if (item.searching && (item.participants?.length ?? 0) < 2 && !item.participants?.includes(myUid)) return false;
      return true;
    });
  }, [chats, user?.uid]);

  const filteredChats = useMemo(() => {
    const norm = queryText.trim().toLowerCase();
    if (!norm) return visibleChats;
    return visibleChats.filter((item) => {
      const otherUid = item.participants.find((p) => p !== user?.uid) ?? '';
      const name = item.mode === 'anonymous_1v1'
        ? item.participantAliases?.[otherUid] ?? item.participantNames[otherUid] ?? 'anonymous 1:1'
        : item.anonymous
          ? `anonymous group ${item.participants.length}`
          : item.participantNames[otherUid] ?? item.destination;
      return `${name} ${item.destination} ${item.lastMessage}`.toLowerCase().includes(norm);
    });
  }, [queryText, visibleChats, user?.uid]);

  const stats = useMemo(() => ({
    liveGroup: chats.filter(c => c.mode === 'anonymous_group' && (c.expiresAt ?? 0) > Date.now() && (c.participants?.length ?? 0) >= 2).length,
    rideChats: chats.filter(c => !c.anonymous).length,
    total: visibleChats.length,
  }), [chats, visibleChats]);

  // ── Cleanup on unmount ──
  useEffect(() => () => stopSearch(), []);

  const stopSearch = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    setSearching1v1(false);
    setCountdown(30);
  };

  // ── Anonymous 1:1 ──
  const handle1v1 = async () => {
    if (!user?.uid || searching1v1) return;

    const existingRoom = await chatService.cleanupDuplicateAnonymousRooms(user.uid);
    if (existingRoom) {
      redirectToAnonymousRoom(existingRoom);
      return;
    }

    // Show modal FIRST — always, immediately
    setSearching1v1(true);
    setCountdown(30);

    // Start countdown interval immediately
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    // Cleanup orphan rooms silently in background
    try { await chatService.cleanupUserOrphanRooms(user.uid); } catch { /* ignore */ }

    let chatId: string;
    try {
      chatId = await chatService.startAnonymousOneToOne(user.uid);
    } catch {
      stopSearch();
      Alert.alert('Error', 'Could not start search. Try again.');
      return;
    }

    // Listen for match — but add a small delay before subscribing
    // so the modal is visible even if match is instant
    let matched = false;
    await new Promise(r => setTimeout(r, 600)); // show modal for at least 600ms

    // If already cancelled while waiting (interval cleared = cancelled)
    if (!intervalRef.current) return;

    unsubRef.current = onSnapshot(doc(db, 'chats', chatId), (snap) => {
      const data = snap.data();
      if (data && (data.participants?.length ?? 0) >= 2) {
        matched = true;
        stopSearch();
        navigation.navigate('Chat', { chatId, anonymousMode: 'anonymous_1v1', partnerName: 'Anonymous 1:1' });
      }
    });

    // 30s timeout (already ~0.6s elapsed)
    timeoutRef.current = setTimeout(async () => {
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
      if (!matched) {
        await chatService.deleteChat(chatId);
        stopSearch();
        Alert.alert('No match found', 'No one available right now. Try again in a moment!');
      }
    }, SEARCH_TIMEOUT_MS);
  };

  // ── Anonymous Group ──
  const handleGroup = async () => {
    if (!user?.uid) return;

    const existingRoom = await chatService.cleanupDuplicateAnonymousRooms(user.uid);
    if (existingRoom) {
      redirectToAnonymousRoom(existingRoom);
      return;
    }

    await chatService.cleanupUserOrphanRooms(user.uid);

    // Load available group rooms (searching, not full, not expired, user not already in)
    const now = Date.now();
    const q = query(
      collection(db, 'chats'),
      where('mode', '==', 'anonymous_group'),
      where('searching', '==', true),
      limit(10)
    );
    const snap = await getDocs(q);
    const available = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Chat & { id: string }))
      .filter((r) =>
        !r.participants?.includes(user.uid) &&
        (r.expiresAt ?? 0) > now &&
        (r.participants?.length ?? 0) < 10
      )
      .map((r) => ({ id: r.id, participants: r.participants ?? [], expiresAt: r.expiresAt }));

    setGroupRooms(available);
    setShowGroupModal(true);
  };

  const joinGroupRoom = async (chatId: string) => {
    if (!user?.uid) return;
    const existingRoom = await chatService.cleanupDuplicateAnonymousRooms(user.uid);
    if (existingRoom && existingRoom.chatId !== chatId) {
      redirectToAnonymousRoom(existingRoom);
      return;
    }
    setJoiningGroup(true);
    setShowGroupModal(false);
    setIsCreatingGroup(false);
    setShowJoiningModal(true);
    try {
      await chatService.joinGroupById(chatId, user.uid);
      await new Promise(r => setTimeout(r, 800)); // show joining anim for at least 800ms
      setShowJoiningModal(false);
      setJoiningGroup(false);
      navigation.navigate('Chat', { chatId, anonymousMode: 'anonymous_group', partnerName: 'Anonymous Group' });
    } catch {
      setShowJoiningModal(false);
      setJoiningGroup(false);
      Alert.alert('Room unavailable', 'This room is full or expired. Try another.');
    }
  };

  const createGroupRoom = async () => {
    if (!user?.uid) return;
    const existingRoom = await chatService.cleanupDuplicateAnonymousRooms(user.uid);
    if (existingRoom) {
      redirectToAnonymousRoom(existingRoom);
      return;
    }
    setJoiningGroup(true);
    setShowGroupModal(false);
    setIsCreatingGroup(true);
    setShowJoiningModal(true);
    try {
      const chatId = await chatService.startAnonymousGroup(user.uid);
      await new Promise(r => setTimeout(r, 900));
      setShowJoiningModal(false);
      setJoiningGroup(false);
      navigation.navigate('Chat', { chatId, anonymousMode: 'anonymous_group', partnerName: 'Anonymous Group' });
    } catch {
      setShowJoiningModal(false);
      setJoiningGroup(false);
      Alert.alert('Error', 'Could not create room. Try again.');
    }
  };

  // ── Render chat card ──
  const renderChat = useCallback(({ item }: { item: ChatItem }) => {
    const otherUid = item.participants.find((p) => p !== user?.uid) ?? '';
    const otherName = item.mode === 'anonymous_1v1'
      ? item.participantAliases?.[otherUid] ?? (item.searching ? 'Anonymous 1:1' : 'Anonymous Partner')
      : item.anonymous
        ? `Anonymous Group (${item.participants.length})`
        : item.participantNames[otherUid] ?? 'Rider';
    const bothConfirmed = Object.values(item.dealConfirmed ?? {}).every(Boolean);
    const timeStr = item.lastMessageTime
      ? new Date(item.lastMessageTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : '';
    const mins = minutesLeft(item.expiresAt);
    const lastRead = readTimes[item.id] ?? 0;
    const hasUnread = !!item.lastMessageTime && item.lastMessageTime > lastRead;

    return (
      <TouchableOpacity
        style={s.chatCard}
        activeOpacity={0.82}
        onPress={() => {
          markChatRead(item.id, Math.max(Date.now(), item.lastMessageTime ?? Date.now()));
          navigation.navigate('Chat', {
          rider: item.anonymous ? undefined : {
            userId: otherUid, name: otherName,
            destination: item.destination, rating: 5,
            distance: 0, badge: 'Rider', lat: 0, lng: 0, isMatch: true,
          },
          chatId: item.id,
          anonymousMode: item.anonymous ? item.mode : undefined,
          partnerName: otherName,
          });
        }}
      >
        <View style={[s.avatar, item.anonymous ? s.avatarGroup : bothConfirmed ? s.avatarDeal : s.avatarRide]}>
          <Text style={s.avatarText}>{otherName.charAt(0).toUpperCase()}</Text>
          {item.anonymous && <View style={s.avatarLiveDot}><PulseDot color={C.green} /></View>}
        </View>

        <View style={s.chatContent}>
          <View style={s.chatTopRow}>
            <Text style={[s.chatName, hasUnread && s.chatNameUnread]} numberOfLines={1}>{otherName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {hasUnread && <View style={s.unreadDot} />}
              <Text style={s.chatTime}>{timeStr}</Text>
            </View>
          </View>
          <View style={s.chipsRow}>
            <View style={[s.chip, item.anonymous ? s.chipGroup : bothConfirmed ? s.chipDeal : s.chipRide]}>
              <Text style={[s.chipText, item.anonymous ? s.chipTextGroup : bothConfirmed ? s.chipTextDeal : s.chipTextRide]}>
                {item.mode === 'anonymous_1v1' ? 'Anonymous 1:1' : item.anonymous ? 'Anonymous Group' : bothConfirmed ? 'Deal Confirmed' : 'Ride Chat'}
              </Text>
            </View>
            {mins !== null && (
              <View style={s.chipTimer}>
                <IconTimer />
                <Text style={s.chipTimerText}>{mins}m left</Text>
              </View>
            )}
          </View>
          <Text style={s.chatRoute} numberOfLines={1}>
            {item.mode === 'anonymous_1v1'
              ? item.searching
                ? 'Waiting for a match to join'
                : 'Private anonymous room'
              : item.anonymous
                ? `${item.participants.length} members in room`
                : `Route: ${item.destination}`}
          </Text>
          <Text style={s.chatLastMsg} numberOfLines={1}>
            {item.lastMessage || (item.mode === 'anonymous_1v1'
              ? 'Anonymous 1:1 room started'
              : item.anonymous
                ? 'Anonymous group started'
                : 'Ride chat started')}
          </Text>
        </View>
        <IconChevron />
      </TouchableOpacity>
    );
  }, [user?.uid, readTimes, markChatRead, navigation]);

  return (
    <PremiumScreen>
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.radial1} />
        <View style={s.radial2} />

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroLabel}>CONVERSATIONS</Text>
              <Text style={s.heroTitle}>Chat Rooms</Text>
            </View>
            <View style={s.liveBadge}>
              <PulseDot />
              <Text style={s.liveBadgeText}>LIVE</Text>
            </View>
          </View>
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statVal}>{stats.liveGroup}</Text>
              <Text style={s.statLbl}>Live groups</Text>
            </View>
            <View style={[s.statCard, s.statCardMid]}>
              <Text style={s.statVal}>{stats.rideChats}</Text>
              <Text style={s.statLbl}>Ride chats</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statVal}>{stats.total}</Text>
              <Text style={s.statLbl}>Active rooms</Text>
            </View>
          </View>
        </View>

        {/* Match buttons */}
        <View style={s.matchSection}>
          <TouchableOpacity style={s.matchBtn1} onPress={handle1v1} disabled={searching1v1} activeOpacity={0.85}>
            <View style={s.matchBtnIcon}><IconGhost /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.matchBtnTitle}>Anonymous 1:1</Text>
              <Text style={s.matchBtnSub}>Private · 10 min · History auto-deleted</Text>
            </View>
            <View style={s.matchBtnBadge}>
              <IconShield />
              <Text style={s.matchBtnBadgeText}>PRIVATE</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.matchBtn2} onPress={handleGroup} activeOpacity={0.85}>
            <View style={[s.matchBtnIcon, { backgroundColor: 'rgba(20,184,166,0.18)' }]}><IconGroup /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.matchBtnTitle, { color: '#5EEAD4' }]}>Anonymous Group</Text>
              <Text style={[s.matchBtnSub, { color: '#4B7A74' }]}>2–10 people · 10 min · Choose a room</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={s.searchBar}>
          <IconSearch />
          <TextInput
            style={s.searchInput}
            value={queryText}
            onChangeText={setQueryText}
            placeholder="Search rooms, routes..."
            placeholderTextColor={C.textMuted}
          />
        </View>

        <View style={s.listHead}>
          <Text style={s.listHeadTitle}>Active Conversations</Text>
          <Text style={s.listHeadSub}>{filteredChats.length} rooms</Text>
        </View>

        <FlatList
          data={filteredChats}
          keyExtractor={(c) => c.id}
          renderItem={renderChat}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabBarHeight + 20, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyOrb}><IconMessage /></View>
              <Text style={s.emptyTitle}>No active conversations</Text>
              <Text style={s.emptySub}>
                Start an anonymous chat with a stranger or join a group room — your identity stays hidden.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <TouchableOpacity
                  style={s.emptyCta}
                  onPress={handle1v1}
                  activeOpacity={0.85}
                >
                  <Text style={s.emptyCtaText}>Find 1:1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.emptyCta, s.emptyCtaTeal]}
                  onPress={handleGroup}
                  activeOpacity={0.85}
                >
                  <Text style={[s.emptyCtaText, { color: C.teal }]}>Join Group</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        />
      </View>

      {/* 1v1 Searching Modal */}
      <SearchingModal visible={searching1v1} remaining={countdown} onCancel={stopSearch} />

      {/* Group Joining Animation Modal */}
      <JoiningGroupModal visible={showJoiningModal} isCreating={isCreatingGroup} />

      {/* Group Rooms Modal */}
      <GroupRoomsModal
        visible={showGroupModal}
        rooms={groupRooms}
        onJoin={joinGroupRoom}
        onCreate={createGroupRoom}
        onClose={() => setShowGroupModal(false)}
        joining={joiningGroup}
      />
    </PremiumScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  radial1: { position: 'absolute', top: -60, right: -40, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(124,111,247,0.12)' },
  radial2: { position: 'absolute', top: 160, left: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(20,184,166,0.08)' },

  hero: { marginHorizontal: 16, marginTop: 8, marginBottom: 14, backgroundColor: 'rgba(124,111,247,0.08)', borderWidth: 1, borderColor: 'rgba(124,111,247,0.2)', borderRadius: 24, padding: 18 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  heroLabel: { fontSize: 10, fontWeight: '800', color: C.purple, letterSpacing: 1.5, textTransform: 'uppercase' },
  heroTitle: { fontSize: 22, fontWeight: '900', color: C.text, marginTop: 4, letterSpacing: -0.5 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
  liveBadgeText: { fontSize: 9, fontWeight: '800', color: C.green, letterSpacing: 1 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border },
  statCardMid: { borderColor: 'rgba(124,111,247,0.3)', backgroundColor: 'rgba(124,111,247,0.07)' },
  statVal: { fontSize: 20, fontWeight: '900', color: C.text },
  statLbl: { fontSize: 10, color: C.textSub, marginTop: 3, fontWeight: '600' },

  matchSection: { paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  matchBtn1: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(124,111,247,0.12)', borderWidth: 1, borderColor: 'rgba(124,111,247,0.25)', borderRadius: 20, padding: 14 },
  matchBtn2: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(20,184,166,0.07)', borderWidth: 1, borderColor: 'rgba(20,184,166,0.2)', borderRadius: 20, padding: 14 },
  matchBtnIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(124,111,247,0.18)', alignItems: 'center', justifyContent: 'center' },
  matchBtnTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  matchBtnSub: { fontSize: 11, color: C.textSub, marginTop: 2 },
  matchBtnBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(167,139,250,0.12)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' },
  matchBtnBadgeText: { fontSize: 8, fontWeight: '800', color: C.purple, letterSpacing: 0.5 },

  searchBar: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 4 },
  searchInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 10 },

  listHead: { paddingHorizontal: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  listHeadTitle: { fontSize: 16, fontWeight: '900', color: C.text },
  listHeadSub: { fontSize: 12, color: C.textSub },

  chatCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 22, padding: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarRide: { backgroundColor: 'rgba(124,111,247,0.2)', borderWidth: 1.5, borderColor: 'rgba(124,111,247,0.4)' },
  avatarGroup: { backgroundColor: 'rgba(20,184,166,0.2)', borderWidth: 1.5, borderColor: 'rgba(20,184,166,0.4)' },
  avatarDeal: { backgroundColor: 'rgba(16,185,129,0.2)', borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.4)' },
  avatarText: { fontSize: 18, fontWeight: '900', color: C.text },
  avatarLiveDot: { position: 'absolute', bottom: 1, right: 1 },
  chatContent: { flex: 1 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: 14, fontWeight: '800', color: C.text, flex: 1, paddingRight: 8 },
  chatNameUnread: { color: C.white },
  chatTime: { fontSize: 11, color: C.textMuted },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  chipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 5 },
  chip: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  chipRide: { backgroundColor: 'rgba(124,111,247,0.12)', borderWidth: 1, borderColor: 'rgba(124,111,247,0.25)' },
  chipGroup: { backgroundColor: 'rgba(20,184,166,0.1)', borderWidth: 1, borderColor: 'rgba(20,184,166,0.25)' },
  chipDeal: { backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
  chipText: { fontSize: 10, fontWeight: '700' },
  chipTextRide: { color: C.purple },
  chipTextGroup: { color: C.teal },
  chipTextDeal: { color: C.green },
  chipTimer: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  chipTimerText: { fontSize: 10, fontWeight: '700', color: C.amber },
  chatRoute: { fontSize: 11, color: C.textSub, marginTop: 5 },
  chatLastMsg: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyOrb: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(124,111,247,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(124,111,247,0.25)', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: C.text, marginBottom: 8 },
  emptySub: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  emptyCta: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
    backgroundColor: 'rgba(124,111,247,0.14)',
    borderWidth: 1, borderColor: 'rgba(124,111,247,0.3)',
  },
  emptyCtaTeal: {
    backgroundColor: 'rgba(20,184,166,0.12)',
    borderColor: 'rgba(20,184,166,0.3)',
  },
  emptyCtaText: { fontSize: 13, fontWeight: '800', color: '#A78BFA', letterSpacing: 0.2 },
});
