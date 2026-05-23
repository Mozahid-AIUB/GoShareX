import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Clipboard,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Animated,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { useAuthStore } from '@/store/authStore';
import { useRideStore } from '@/store/rideStore';
import chatService, { Chat, Message } from '@/services/firebase/chatService';
import { getFare } from '@/constants/fareTable';
import { sendRideRequest } from '@/services/notifications/fcmService';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { logger } from '@/utils/logger';

import {
  IconBack,
  IconChat,
  IconCheck,
  IconHandshake,
  IconSend,
  IconShield,
} from './components/ChatIcons';
import { LiveDot, MiniAvatar } from './components/ChatBadges';
import { QUICK_REPLIES, formatCountdown } from './utils/chatHelpers';
import { useScreenTracking } from '@/hooks/useScreenTracking';
import { getRoutePreviewUrl } from '@/services/google/staticMapService';
import { getDestinationByName, getDestinationById } from '@/constants/destinations';
import { getPickupPointById } from '@/constants/pickupPoints';
import { Image } from 'react-native';

// â”€â”€â”€ Design tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const C = {
  bg: '#080C14',
  surface: 'rgba(255,255,255,0.05)',
  surfaceStrong: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.1)',
  primary: '#6366F1',
  teal: '#14B8A6',
  text: '#E2E8F0',
  textSub: '#6E7E99',
  textMuted: '#64748B',
  white: '#FFFFFF',
  amber: '#F59E0B',
  red: '#F43F5E',
  green: '#10B981',
};

export default function ChatScreen() {
  useScreenTracking('Chat');
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { destination, pickupPoint } = useRideStore();

  const rider = route.params?.rider;
  const requestedAnonymousMode = route.params?.anonymousMode as 'anonymous_1v1' | 'anonymous_group' | undefined;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [chatId, setChatId] = useState<string | null>(route.params?.chatId ?? null);
  const [chatMeta, setChatMeta] = useState<Partial<Chat> | null>(null);
  const [dealConfirmed, setDealConfirmed] = useState(false);
  const [myDealPressed, setMyDealPressed] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [historyDeleted, setHistoryDeleted] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const lastSeenRef = useRef<number>(Date.now());

  const fare = getFare(pickupPoint ?? 'main_gate', destination ?? 'kuril');
  const splitFare = Math.ceil(fare / 2);
  const isAnonymousRoom = !!chatMeta?.anonymous || !!requestedAnonymousMode;
  const isAnonymousGroup = chatMeta?.mode === 'anonymous_group' || requestedAnonymousMode === 'anonymous_group';
  const isAnonymous1v1 = (chatMeta?.mode === 'anonymous_1v1' || requestedAnonymousMode === 'anonymous_1v1') && !isAnonymousGroup;
  const participantCount = chatMeta?.participants?.length ?? 0;
  const minParticipants = chatMeta?.minParticipants ?? 2;
  const isWaiting = isAnonymousRoom && participantCount < minParticipants;
  const roomExpired = (remainingMs ?? 1) <= 0;

  const countdownProgress = useMemo(() => {
    if (!chatMeta?.expiresAt) return 0;
    const startedAt = chatMeta.expiresAt - 15 * 60 * 1000;
    return Math.max(0, Math.min(1, (Date.now() - startedAt) / (15 * 60 * 1000)));
  }, [chatMeta?.expiresAt, remainingMs]);

  const title = useMemo(() => {
    if (isAnonymousGroup) return 'Anonymous Group';
    if (isAnonymous1v1) return 'Anonymous 1:1';
    return rider?.name ?? route.params?.partnerName ?? 'Rider';
  }, [isAnonymousGroup, isAnonymous1v1, rider?.name, route.params?.partnerName]);

  // Normalize rider uid — RiderMatch uses .userId, NearbyRider uses .uid
  const riderUid: string | undefined = rider?.uid ?? rider?.userId;

  const persistReadTime = async (id: string, at: number) => {
    if (!user?.uid) return;
    const allReadTimes = await storage.get<Record<string, Record<string, number>>>(STORAGE_KEYS.CHAT_READ_TIMES) ?? {};
    allReadTimes[user.uid] = { ...(allReadTimes[user.uid] ?? {}), [id]: at };
    await storage.set(STORAGE_KEYS.CHAT_READ_TIMES, allReadTimes);
  };

  // Init chat
  useEffect(() => {
    if (!user) return;
    if (route.params?.chatId) { setChatId(route.params.chatId); return; }
    if (!rider || !riderUid) return;
    const init = async () => {
      const id = await chatService.getOrCreateChat(
        user.uid, user.name ?? 'You',
        riderUid, rider.name,
        destination ?? rider.destination, fare
      );
      setChatId(id);
    };
    void init();
  }, [destination, fare, rider, riderUid, route.params?.chatId, user]);

  // Real-time listeners — no myDealPressed dep to avoid re-subscribing on confirm
  const myDealPressedRef = useRef(myDealPressed);
  useEffect(() => { myDealPressedRef.current = myDealPressed; }, [myDealPressed]);

  useEffect(() => {
    if (!chatId || !user) return;
    const unsub1 = chatService.listenToMessages(chatId, setMessages);
    const unsub2 = chatService.listenToChat(chatId, (chat) => {
      setChatMeta(chat);
      if (chat.lastMessageTime) {
        void persistReadTime(chatId, chat.lastMessageTime);
        setPartnerOnline(Date.now() - chat.lastMessageTime < 2 * 60 * 1000);
      }
      if (!chat.anonymous && chat.dealConfirmed && typeof chat.dealConfirmed === 'object') {
        const both = Object.values(chat.dealConfirmed).length > 0 && Object.values(chat.dealConfirmed).every(Boolean);
        setDealConfirmed(both);
        if (both && !myDealPressedRef.current) {
          const f = chat.fare ?? fare;
          navigation.navigate('RideConfirmed', {
            rider, chatId, fare: f, splitFare: Math.ceil(f / 2),
          });
        }
      }
    });
    return () => { unsub1(); unsub2(); };
  }, [chatId, user]);

  // Countdown timer
  useEffect(() => {
    if (!chatMeta?.expiresAt) { setRemainingMs(null); return; }
    const update = () => setRemainingMs(chatMeta.expiresAt! - Date.now());
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [chatMeta?.expiresAt]);

  // Auto-delete ALL chat types on room expiry and redirect
  useEffect(() => {
    if (!roomExpired || historyDeleted) return;
    setHistoryDeleted(true);
    if (chatId) void chatService.deleteChat(chatId);
    const t = setTimeout(() => navigation.navigate('MainApp' as any), 2000);
    return () => clearTimeout(t);
  }, [roomExpired, historyDeleted, chatId]);

  const sendMsg = async (msgText?: string) => {
    const content = msgText ?? text.trim();
    if (!content || !chatId || !user) return;
    if (roomExpired) { Alert.alert('Session ended', 'This chat session has expired.'); return; }
    setText('');
    const senderName = isAnonymousRoom
      ? chatMeta?.participantAliases?.[user.uid] ?? 'Anonymous'
      : user.name ?? 'You';
    await chatService.sendMessage(chatId, user.uid, senderName, content);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleDealConfirm = async () => {
    if (!chatId || !user || isAnonymousRoom) return;
    setMyDealPressed(true);

    // Notify the other rider via Expo Push API (fcm_tokens read is now allowed for auth users)
    if (riderUid) {
      sendRideRequest(
        riderUid,
        user.name ?? 'A rider',
        chatMeta?.destination ?? destination ?? 'Unknown',
        fare ?? 0,
        chatId,
      ).catch((e) => logger.warn('ChatScreen.sendRideRequest', e));
    }

    const bothConfirmed = await chatService.confirmDeal(chatId, user.uid);
    if (bothConfirmed) {
      navigation.navigate('RideConfirmed', { rider, chatId, fare, splitFare });
    } else {
      Alert.alert('Pending', `Waiting for ${rider?.name ?? 'the other rider'} to confirm.`);
    }
  };

  const handleCopy = useCallback((msgId: string, txt: string) => {
    Clipboard.setString(txt);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 1500);
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    if (item.type === 'system') {
      return (
        <View style={m.systemRow}>
          <View style={m.systemPill}>
            <Text style={m.systemText}>{item.text}</Text>
          </View>
        </View>
      );
    }
    const isMe = item.senderId === user?.uid;
    const label = isAnonymousRoom
      ? chatMeta?.participantAliases?.[item.senderId] ?? item.senderName ?? 'Anonymous'
      : item.senderName;
    const timeStr = item.timestamp
      ? new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : '';
    const copied = copiedMsgId === item.id;

    return (
      <View style={[m.row, isMe && m.rowMe]}>
        {!isMe && <MiniAvatar label={label ?? 'A'} gradient={isAnonymousRoom} />}
        <TouchableWithoutFeedback onLongPress={() => handleCopy(item.id, item.text)}>
          <View style={[m.bubble, isMe ? m.bubbleMe : m.bubbleThem, copied && m.bubbleCopied]}>
            {!isMe && <Text style={m.senderLabel}>{label}</Text>}
            <Text style={[m.bubbleText, isMe && m.bubbleTextMe]}>{item.text}</Text>
            <Text style={[m.msgTime, isMe && m.msgTimeMe]}>
              {copied ? '✓ Copied' : timeStr}
            </Text>
          </View>
        </TouchableWithoutFeedback>
      </View>
    );
  }, [user?.uid, chatMeta, isAnonymousRoom, copiedMsgId, handleCopy]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <IconBack />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.headerTitleRow}>
            {isAnonymousRoom
              ? <LiveDot color={roomExpired ? C.red : C.green} />
              : <View style={[s.onlineDot, { backgroundColor: partnerOnline ? C.green : C.textMuted }]} />
            }
            <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          </View>
          <Text style={s.headerSub} numberOfLines={1}>
            {roomExpired
              ? 'Session ended'
              : isAnonymousRoom && remainingMs !== null
                ? `Ends in ${formatCountdown(remainingMs)}`
                : partnerOnline ? 'Online' : destination ?? rider?.destination ?? 'Ride Chat'}
          </Text>
        </View>
        <TouchableOpacity
          style={s.headerBtn}
          onPress={() => navigation.navigate('MainApp' as any)}
          activeOpacity={0.7}
        >
          <IconChat />
        </TouchableOpacity>
      </View>

      {/* Info banner */}
      {isAnonymousRoom ? (
        <View style={s.anonBanner}>
          <View style={s.anonBannerRow}>
            <View style={s.anonBannerLeft}>
              <View style={s.anonChip}>
                <IconShield />
                <Text style={s.anonChipText}>
                  {isAnonymousGroup ? `Group | ${participantCount}/10 members` : 'Private 1:1'}
                </Text>
              </View>
              <Text style={s.anonNote}>
                {isWaiting ? 'Waiting for another person to join...' : 'Identities are hidden. Messages auto-delete after session.'}
              </Text>
            </View>
            <View style={s.timerCircle}>
              <Text style={s.timerCircleNum}>{formatCountdown(remainingMs ?? 0)}</Text>
              <Text style={s.timerCircleLabel}>left</Text>
            </View>
          </View>
          <View style={s.timerTrack}>
            <View style={[s.timerFill, { width: `${countdownProgress * 100}%` as any }]} />
          </View>
        </View>
      ) : (
        <View style={s.fareBanner}>
          <Text style={s.fareBannerLabel}>Fare split</Text>
          <Text style={s.fareBannerFare}>BDT {fare} / 2 = <Text style={s.fareBannerSplit}>BDT {splitFare} each</Text></Text>
        </View>
      )}

      {/* Static map ride preview */}
      {(() => {
        const destName = chatMeta?.destination ?? destination ?? rider?.destination;
        const dest = destName
          ? (getDestinationByName(destName) ?? getDestinationById(destName))
          : null;
        const pickup = getPickupPointById(pickupPoint ?? 'main_gate');
        if (!dest || !pickup) return null;
        const previewUrl = getRoutePreviewUrl(
          { latitude: pickup.lat, longitude: pickup.lng },
          { latitude: dest.lat, longitude: dest.lng },
          undefined,
          { width: 600, height: 180, zoom: 13 },
        );
        return (
          <View style={s.mapPreviewWrap}>
            <Image source={{ uri: previewUrl }} style={s.mapPreviewImg} resizeMode="cover" />
            <View style={s.mapPreviewOverlay}>
              <Text style={s.mapPreviewText}>
                {pickup.name}  →  {dest.name}
              </Text>
            </View>
          </View>
        );
      })()}

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 60}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={s.emptyMsgs}>
              <Text style={s.emptyMsgsText}>
                {isWaiting ? 'Waiting for another user to join...' : 'No messages yet. Say hello!'}
              </Text>
            </View>
          }
        />

        {/* Quick replies */}
        <View style={s.quickRow}>
          {QUICK_REPLIES.map((qr) => (
            <TouchableOpacity
              key={qr.id}
              style={[s.qrBtn, roomExpired && s.qrBtnDisabled]}
              onPress={() => { void sendMsg(qr.text); }}
              disabled={roomExpired}
              activeOpacity={0.75}
            >
              <Text style={s.qrText}>{qr.text}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input row */}
        <View style={[s.inputRow, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder={roomExpired ? 'Session has ended' : 'Write a message...'}
            placeholderTextColor={C.textMuted}
            multiline
            maxLength={300}
            editable={!roomExpired}
          />
          <TouchableOpacity
            style={[s.sendBtn, (roomExpired || !text.trim()) && s.sendBtnDisabled]}
            onPress={() => { void sendMsg(); }}
            disabled={roomExpired || !text.trim()}
            activeOpacity={0.8}
          >
            <IconSend />
          </TouchableOpacity>
        </View>

        {/* Deal confirm (ride chats only) */}
        {!isAnonymousRoom && !dealConfirmed && (
          <TouchableOpacity
            style={[s.dealBtn, myDealPressed && s.dealBtnPending]}
            onPress={handleDealConfirm}
            disabled={myDealPressed}
            activeOpacity={0.85}
          >
            <IconHandshake />
            <Text style={s.dealBtnText}>
              {myDealPressed ? 'Waiting for partner confirmation...' : 'Confirm Deal | BDT ' + splitFare + ' each'}
            </Text>
          </TouchableOpacity>
        )}
        {!isAnonymousRoom && dealConfirmed && (
          <View style={s.dealConfirmedRow}>
            <IconCheck />
            <Text style={s.dealConfirmedText}>Deal confirmed | proceeding to ride</Text>
          </View>
        )}

        {/* Expired banner */}
        {roomExpired && (
          <View style={s.expiredBanner}>
            <Text style={s.expiredTitle}>Session ended</Text>
            <Text style={s.expiredSub}>Chat history has been deleted. Returning to home...</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  headerSub: { fontSize: 11, color: C.textSub, marginTop: 2 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },

  anonBanner: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  anonBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  anonBannerLeft: { flex: 1, gap: 4 },
  anonChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
  },
  anonChipText: { fontSize: 11, fontWeight: '700', color: C.amber },
  anonNote: { fontSize: 11, color: '#A0916B', lineHeight: 16 },
  timerCircle: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  timerCircleNum: { fontSize: 12, fontWeight: '800', color: C.amber },
  timerCircleLabel: { fontSize: 8, color: C.amber, fontWeight: '600', marginTop: -2 },
  timerTrack: { height: 3, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 2, overflow: 'hidden' },
  timerFill: { height: '100%', backgroundColor: C.amber, borderRadius: 2 },

  fareBanner: {
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.2)',
    paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  fareBannerLabel: { fontSize: 12, color: C.textSub, fontWeight: '600' },
  fareBannerFare: { fontSize: 13, color: C.text, fontWeight: '600' },
  fareBannerSplit: { color: C.teal, fontWeight: '800' },

  mapPreviewWrap: {
    position: 'relative',
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mapPreviewImg: { width: '100%', height: 120 },
  mapPreviewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(8,12,20,0.78)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapPreviewText: {
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  emptyMsgs: { alignItems: 'center', marginTop: 60 },
  emptyMsgsText: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20 },

  quickRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border,
  },
  qrBtn: {
    backgroundColor: C.surface, borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(148,163,184,0.24)',
  },
  qrBtnDisabled: { opacity: 0.35 },
  qrText: { fontSize: 12, color: '#C7D2FE', fontWeight: '700' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingTop: 8, gap: 8,
    backgroundColor: C.bg,
  },
  input: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: C.text, maxHeight: 90,
    borderWidth: 1, borderColor: 'rgba(148,163,184,0.24)',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  sendBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },

  dealBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: 12, padding: 15, borderRadius: 18,
    backgroundColor: C.teal,
  },
  dealBtnPending: { backgroundColor: C.amber },
  dealBtnText: { color: C.white, fontSize: 15, fontWeight: '800' },
  dealConfirmedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 12, marginBottom: 10,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 14, padding: 10,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)',
  },
  dealConfirmedText: { fontSize: 13, color: C.green, fontWeight: '700' },

  expiredBanner: {
    margin: 12, padding: 14, borderRadius: 16,
    backgroundColor: 'rgba(244,63,94,0.08)',
    borderWidth: 1, borderColor: 'rgba(244,63,94,0.2)',
    alignItems: 'center',
  },
  expiredTitle: { fontSize: 14, fontWeight: '800', color: C.red, marginBottom: 4 },
  expiredSub: { fontSize: 12, color: '#A87070', textAlign: 'center', lineHeight: 18 },
});

const m = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rowMe: { flexDirection: 'row-reverse' },
  systemRow: { alignItems: 'center', marginVertical: 4 },
  systemPill: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, maxWidth: '80%',
  },
  systemText: { fontSize: 11, color: C.textSub, fontWeight: '600', textAlign: 'center' },
  bubble: { maxWidth: '75%', padding: 11, borderRadius: 18 },
  bubbleThem: { backgroundColor: C.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  bubbleMe: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  bubbleCopied: { opacity: 0.75 },
  senderLabel: { fontSize: 10, fontWeight: '700', color: C.textSub, marginBottom: 3 },
  bubbleText: { fontSize: 14, color: C.text, lineHeight: 20 },
  bubbleTextMe: { color: C.white },
  msgTime: { fontSize: 10, color: C.textMuted, marginTop: 4, textAlign: 'left' },
  msgTimeMe: { color: 'rgba(255,255,255,0.55)', textAlign: 'right' },
});


