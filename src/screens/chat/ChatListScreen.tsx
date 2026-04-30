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

const SEARCH_TIMEOUT_MS = 30_000;

interface ChatItem {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantAliases?: Record<string, string>;
  destination: string;
  fare: number;
  mode?: 'ride' | 'anonymous_1v1' | 'anonymous_group';
  anonymous?: boolean;
  expiresAt?: number;
  searching?: boolean;
  lastMessage: string;
  lastMessageTime: number;
  dealConfirmed: Record<string, boolean>;
}

interface GroupRoom {
  id: string;
  participants: string[];
  expiresAt?: number;
}

const minutesLeft = (expiresAt?: number) => {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 60000));
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IconSearch = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke={C.textSub} strokeWidth="1.8" />
    <Path d="M21 21l-4.35-4.35" stroke={C.textSub} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);
const IconGhost = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M9 10h.01M15 10h.01M12 2a9 9 0 00-9 9v10l3-3 2.5 2.5L11 18l1 3 1-3 2.5 2.5L19 21l3 3V11a9 9 0 00-9-9z" stroke={C.white} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const IconGroup = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="7" r="4" stroke={C.white} strokeWidth="1.7" />
    <Path d="M3 20c0-4 2.7-7 6-7" stroke={C.white} strokeWidth="1.7" strokeLinecap="round" />
    <Circle cx="17" cy="9" r="3" stroke={C.white} strokeWidth="1.7" />
    <Path d="M21 20c0-3-1.8-5-4-5" stroke={C.white} strokeWidth="1.7" strokeLinecap="round" />
  </Svg>
);
const IconMessage = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={C.white} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const IconChevron = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const IconTimer = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={C.amber} strokeWidth="1.8" />
    <Path d="M12 7v5l3 3" stroke={C.amber} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);
const IconShield = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={C.purple} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);
const IconClose = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={C.text} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);
const IconUsers = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="7" r="4" stroke={C.teal} strokeWidth="1.7" />
    <Path d="M3 20c0-4 2.7-7 6-7" stroke={C.teal} strokeWidth="1.7" strokeLinecap="round" />
    <Circle cx="17" cy="9" r="3" stroke={C.teal} strokeWidth="1.7" />
    <Path d="M21 20c0-3-1.8-5-4-5" stroke={C.teal} strokeWidth="1.7" strokeLinecap="round" />
  </Svg>
);
const IconPlus = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={C.white} strokeWidth="2.2" strokeLinecap="round" />
  </Svg>
);
const IconLock = ({size=12,color='#94A3B8'}:{size?:number,color?:string}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="2"/>
    <Path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </Svg>
);
const IconGhostSm = ({size=12,color='#94A3B8'}:{size?:number,color?:string}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 10h.01M15 10h.01M12 2a9 9 0 00-9 9v10l3-3 2.5 2.5L11 18l1 3 1-3 2.5 2.5L19 21l3 3V11a9 9 0 00-9-9z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);
const IconTrash = ({size=12,color='#94A3B8'}:{size?:number,color?:string}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

// ─── Animated pulse dot ───────────────────────────────────────────────────────
const PulseDot = ({ color = C.green }: { color?: string }) => {
  const anim = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 0.25, duration: 800, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color, opacity: anim }} />;
};

// ─── Countdown ring (SVG arc) ─────────────────────────────────────────────────
const CountdownRing = ({ remaining, total }: { remaining: number; total: number }) => {
  const R = 54;
  const CIRC = 2 * Math.PI * R;
  const progress = Math.max(0, remaining / total);
  const dash = CIRC * progress;
  const color = remaining > 10 ? '#7C6FF7' : remaining > 5 ? C.amber : C.red;
  return (
    <Svg width={130} height={130} viewBox="0 0 130 130">
      <Defs>
        <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#7C6FF7" />
          <Stop offset="1" stopColor="#14B8A6" />
        </LinearGradient>
      </Defs>
      {/* Track */}
      <Circle cx="65" cy="65" r={R} stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
      {/* Progress */}
      <Circle
        cx="65" cy="65" r={R}
        stroke={color}
        strokeWidth="8"
        fill="none"
        strokeDasharray={`${dash} ${CIRC}`}
        strokeLinecap="round"
        transform="rotate(-90 65 65)"
      />
    </Svg>
  );
};

// ─── 1v1 Searching Modal ──────────────────────────────────────────────────────
const SearchingModal = ({
  visible, remaining, onCancel,
}: { visible: boolean; remaining: number; onCancel: () => void }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={m.overlay}>
      <View style={m.card}>
        {/* Ring */}
        <View style={m.ringWrap}>
          <CountdownRing remaining={remaining} total={SEARCH_TIMEOUT_MS / 1000} />
          <View style={m.ringCenter}>
            <Text style={m.ringNum}>{remaining}</Text>
            <Text style={m.ringLabel}>sec</Text>
          </View>
        </View>

        <View style={m.ghostWrap}>
          <IconGhost />
        </View>
        <Text style={m.title}>Finding a match...</Text>
        <Text style={m.sub}>Searching for an anonymous partner{'\n'}nearby. Identities stay hidden.</Text>

        {/* Privacy chips */}
        <View style={m.chipsRow}>
          <View style={m.chip}><View style={{flexDirection:'row',alignItems:'center',gap:4}}><IconLock size={10}/><Text style={m.chipText}>Private</Text></View></View>
          <View style={m.chip}><View style={{flexDirection:'row',alignItems:'center',gap:4}}><IconGhostSm size={10}/><Text style={m.chipText}>Anonymous</Text></View></View>
          <View style={m.chip}><View style={{flexDirection:'row',alignItems:'center',gap:4}}><IconTrash size={10}/><Text style={m.chipText}>Auto-deleted</Text></View></View>
        </View>

        <TouchableOpacity style={m.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
          <IconClose />
          <Text style={m.cancelText}>Cancel Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ─── Group Joining Modal ──────────────────────────────────────────────────────
const JoiningGroupModal = ({ visible, isCreating }: { visible: boolean; isCreating: boolean }) => {
  const spin = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (!visible) return;
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
    return () => spin.setValue(0);
  }, [visible]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={jm.overlay}>
        <View style={jm.card}>
          <Animated.View style={[jm.ring, { transform: [{ rotate }] }]}>
            <Svg width={64} height={64} viewBox="0 0 64 64">
              <Circle cx="32" cy="32" r="28" stroke="rgba(20,184,166,0.2)" strokeWidth="6" fill="none" />
              <Circle cx="32" cy="32" r="28" stroke="#14B8A6" strokeWidth="6" fill="none"
                strokeDasharray="44 132" strokeLinecap="round" transform="rotate(-90 32 32)" />
            </Svg>
          </Animated.View>
          <View style={jm.iconWrap}><IconGroup /></View>
          <Text style={jm.title}>{isCreating ? 'Creating room...' : 'Joining room...'}</Text>
          <Text style={jm.sub}>{isCreating ? 'Setting up your anonymous group' : 'Connecting you anonymously'}</Text>
          <View style={jm.chipsRow}>
            <View style={jm.chip}><View style={{flexDirection:'row',alignItems:'center',gap:4}}><IconGroup /><Text style={jm.chipText}>Anonymous</Text></View></View>
            <View style={jm.chip}><View style={{flexDirection:'row',alignItems:'center',gap:4}}><IconLock size={10}/><Text style={jm.chipText}>Private</Text></View></View>
            <View style={jm.chip}><View style={{flexDirection:'row',alignItems:'center',gap:4}}><IconTrash size={10}/><Text style={jm.chipText}>Auto-deleted</Text></View></View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const jm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '82%', backgroundColor: '#0E1220', borderRadius: 28, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(20,184,166,0.3)' },
  ring: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(20,184,166,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '900', color: C.text, marginBottom: 6 },
  sub: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chipText: { fontSize: 11, color: C.textSub, fontWeight: '600' },
});

// ─── Group Rooms Modal ────────────────────────────────────────────────────────
const GroupRoomsModal = ({
  visible, rooms, onJoin, onCreate, onClose, joining,
}: {
  visible: boolean;
  rooms: GroupRoom[];
  onJoin: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
  joining: boolean;
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={g.overlay}>
      <View style={g.sheet}>
        <View style={g.handle} />
        <View style={g.header}>
          <View>
            <Text style={g.title}>Anonymous Groups</Text>
            <Text style={g.sub}>{rooms.length > 0 ? `${rooms.length} active room${rooms.length > 1 ? 's' : ''} available` : 'No rooms right now'}</Text>
          </View>
          <TouchableOpacity style={g.closeBtn} onPress={onClose}><IconClose /></TouchableOpacity>
        </View>

        {rooms.length > 0 ? (
          <FlatList
            data={rooms}
            keyExtractor={(r) => r.id}
            style={{ maxHeight: 280 }}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
            renderItem={({ item }) => {
              const mins = minutesLeft(item.expiresAt);
              return (
                <TouchableOpacity
                  style={g.roomCard}
                  onPress={() => onJoin(item.id)}
                  disabled={joining}
                  activeOpacity={0.82}
                >
                  <View style={g.roomAvatar}>
                    <IconUsers />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={g.roomName}>Anonymous Group</Text>
                    <Text style={g.roomMeta}>{item.participants.length} member{item.participants.length !== 1 ? 's' : ''} · {mins}m left</Text>
                  </View>
                  <View style={g.joinBtn}>
                    <Text style={g.joinBtnText}>Join</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <View style={g.emptyWrap}>
            <Text style={g.emptyText}>No groups available right now.</Text>
            <Text style={g.emptySubText}>Be the first — create a new room!</Text>
          </View>
        )}

        <TouchableOpacity style={[g.createBtn, joining && { opacity: 0.5 }]} onPress={onCreate} disabled={joining} activeOpacity={0.85}>
          <IconPlus />
          <Text style={g.createBtnText}>{joining ? 'Joining...' : 'Create New Group'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ChatListScreen() {
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
              <Text style={s.emptySub}>Start an anonymous 1:1 or join a group room.</Text>
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
});

// ─── 1v1 Searching Modal Styles ───────────────────────────────────────────────
const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '86%', backgroundColor: '#0E1220', borderRadius: 28, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(124,111,247,0.3)' },
  ringWrap: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringNum: { fontSize: 36, fontWeight: '900', color: C.text, lineHeight: 40 },
  ringLabel: { fontSize: 11, color: C.textSub, fontWeight: '600' },
  ghostWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(124,111,247,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '900', color: C.text, marginBottom: 6, letterSpacing: -0.3 },
  sub: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 },
  chip: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chipText: { fontSize: 11, color: C.textSub, fontWeight: '600' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(244,63,94,0.1)', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(244,63,94,0.25)' },
  cancelText: { fontSize: 14, fontWeight: '800', color: '#F43F5E' },
});

// ─── Group Modal Styles ───────────────────────────────────────────────────────
const g = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0E1220', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingBottom: 32, borderWidth: 1, borderColor: 'rgba(124,111,247,0.2)' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', color: C.text },
  sub: { fontSize: 12, color: C.textSub, marginTop: 3 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },

  roomCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(20,184,166,0.07)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(20,184,166,0.2)' },
  roomAvatar: { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(20,184,166,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(20,184,166,0.3)' },
  roomName: { fontSize: 14, fontWeight: '800', color: C.text },
  roomMeta: { fontSize: 11, color: C.textSub, marginTop: 2 },
  joinBtn: { backgroundColor: C.teal, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  joinBtnText: { fontSize: 12, fontWeight: '800', color: C.white },

  emptyWrap: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  emptyText: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 6 },
  emptySubText: { fontSize: 12, color: C.textSub },

  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 16, height: 52, borderRadius: 18, backgroundColor: 'rgba(20,184,166,0.15)', borderWidth: 1, borderColor: 'rgba(20,184,166,0.35)' },
  createBtnText: { fontSize: 15, fontWeight: '800', color: '#5EEAD4' },
});
