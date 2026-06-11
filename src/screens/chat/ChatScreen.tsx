
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Clipboard,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/store/authStore';
import { useRideStore } from '@/store/rideStore';
import chatService, { Chat, Message } from '@/services/chatService';
import { getFare } from '@/constants/fareTable';
import { sendRideRequest } from '@/services/notifications/fcmService';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { logger } from '@/utils/logger';
import { listenToPresence } from '@/services/presenceService';
import { usePrivacyStore } from '@/store/privacyStore';

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

const CHAT_DURATION_MS = {
  ride: 10 * 60 * 1000,
  anonymous_1v1: 5 * 60 * 1000,
  anonymous_group: 10 * 60 * 1000,
} as const;

export default function ChatScreen() {
  useScreenTracking('Chat');
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { destination, pickupPoint } = useRideStore();
  const screenWidth = Dimensions.get('window').width;

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
  const [blockedAliases, setBlockedAliases] = useState<Set<string>>(new Set());
  const [presenceLabel, setPresenceLabel] = useState<string | null>(null);
  const [chatAccessLost, setChatAccessLost] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const privacyPrefs = usePrivacyStore();
  const listRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = useRef(false);
  const accessLossAlertShownRef = useRef(false);

  // ─── Optimistic send (WhatsApp-এর মতো instant অনুভূতি) ───
  // send চাপার সাথে সাথেই message bubble দেখাই (pending, হালকা); server থেকে
  // realtime-এ আসল message এলে echo টা সরে যায়। network ধীর হলেও chat
  // কখনো "আটকে আছে" মনে হয় না — এটাই smooth experience-এর মূল।
  const [pendingEchoes, setPendingEchoes] = useState<Array<Message & { pending?: boolean }>>([]);

  // server message এসে গেলে matching echo সরাই (sender+text মিল, সাম্প্রতিক)
  useEffect(() => {
    if (pendingEchoes.length === 0) return;
    setPendingEchoes((prev) =>
      prev.filter(
        (e) =>
          !messages.some(
            (m) =>
              m.senderId === e.senderId &&
              m.text === e.text &&
              (m.timestamp ?? 0) >= e.timestamp - 60_000,
          ),
      ),
    );
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // তালিকা = server message + এখনো-pending echo
  const displayMessages = useMemo(
    () => [...messages, ...pendingEchoes],
    [messages, pendingEchoes],
  );

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
    const totalDuration =
      chatMeta?.mode === 'anonymous_1v1'
        ? CHAT_DURATION_MS.anonymous_1v1
        : chatMeta?.mode === 'anonymous_group'
          ? CHAT_DURATION_MS.anonymous_group
          : CHAT_DURATION_MS.ride;
    const remaining = Math.max(0, chatMeta.expiresAt - Date.now());
    return Math.max(0, Math.min(1, remaining / totalDuration));
  }, [chatMeta?.expiresAt, chatMeta?.mode, remainingMs]);

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
      try {
        const id = await chatService.getOrCreateChat(
          user.uid, user.name ?? 'You',
          riderUid, rider.name,
          destination ?? rider.destination, fare
        );
        setChatId(id);
      } catch (e) {
        // chat তৈরি fail হলে chatId null থাকত → send silent fail হতো;
        // ব্যবহারকারীকে ভদ্রভাবে জানাই। (আসল 42501 root cause 0018 RPC-তে fixed।)
        logger.warn('ChatScreen.getOrCreateChat', e);
        Alert.alert('Chat unavailable', 'Could not open this chat. Please check your connection and try again.');
      }
    };
    void init();
  }, [destination, fare, rider, riderUid, route.params?.chatId, user]);

  // Real-time listeners — no myDealPressed dep to avoid re-subscribing on confirm
  const myDealPressedRef = useRef(myDealPressed);
  useEffect(() => { myDealPressedRef.current = myDealPressed; }, [myDealPressed]);

  useEffect(() => {
    if (!chatId || !user) return;
    const handleChatAccessError = (error: Error) => {
      const message = error?.message ?? '';
      if (
        !accessLossAlertShownRef.current &&
        (
          message.includes('permission-denied') ||
          message.includes('Missing or insufficient permissions') ||
          message.includes('chat-not-found')
        )
      ) {
        accessLossAlertShownRef.current = true;
        setChatAccessLost(true);
        const anonymousOrTransientRoom =
          requestedAnonymousMode !== undefined ||
          chatMeta?.anonymous === true ||
          roomExpired;

        if (anonymousOrTransientRoom) {
          navigation.navigate('MainApp');
          return;
        }

        Alert.alert(
          'Chat unavailable',
          'This chat is no longer available for your account. You will be returned to home.',
          [{ text: 'OK', onPress: () => navigation.navigate('MainApp') }],
        );
      }
    };
    const unsub1 = chatService.listenToMessages(chatId, setMessages, handleChatAccessError);
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
    }, handleChatAccessError);
    return () => { unsub1(); unsub2(); };
  }, [chatId, user, fare, navigation, rider, requestedAnonymousMode, chatMeta?.anonymous, roomExpired]);

  // Mark read on chat open + when new messages arrive (respects privacy pref)
  useEffect(() => {
    if (!chatId || !user || isAnonymousRoom || chatAccessLost) return;
    if (!privacyPrefs.sendReadReceipts) return;
    chatService.markRead(chatId, user.uid).catch((e) => logger.warn('ChatScreen.markRead', e));
  }, [chatId, user, isAnonymousRoom, messages.length, privacyPrefs.sendReadReceipts, chatAccessLost]);

  // Load blocked aliases (anonymous group only)
  useEffect(() => {
    if (!user || !isAnonymousGroup) return;
    chatService.getBlockedAliases(user.uid).then((list) => {
      if (!chatId) return;
      setBlockedAliases(new Set(list.filter((b) => b.chatId === chatId).map((b) => b.alias)));
    }).catch(() => undefined);
  }, [user, chatId, isAnonymousGroup]);

  // Real-time presence — only for ride chat (anonymous keeps identity hidden,
  // and only if user hasn't disabled the privacy toggle)
  useEffect(() => {
    if (isAnonymousRoom || !privacyPrefs.showOnlineStatus) { setPresenceLabel(null); return; }
    const otherUid = riderUid
      ?? (chatMeta?.participants ?? []).find((p) => p !== user?.uid);
    if (!otherUid) return;
    const unsub = listenToPresence(otherUid, ({ online, label }) => {
      setPresenceLabel(label);
      setPartnerOnline(online);
    });
    return () => unsub();
  }, [isAnonymousRoom, riderUid, chatMeta?.participants, user?.uid, privacyPrefs.showOnlineStatus]);

  // Countdown timer
  useEffect(() => {
    if (!chatMeta?.expiresAt) { setRemainingMs(null); return; }
    const update = () => setRemainingMs(chatMeta.expiresAt! - Date.now());
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [chatMeta?.expiresAt]);

  useEffect(() => {
    if (isWaiting) {
      setInputFocused(false);
    }
  }, [isWaiting]);

  // Auto-delete ALL chat types on room expiry and redirect
  useEffect(() => {
    if (!roomExpired || historyDeleted) return;
    setHistoryDeleted(true);
    if (chatId) void chatService.deleteChat(chatId);
    const t = setTimeout(() => {
      // Navigate back to the previous chat list or main app
      navigation.goBack();
      setTimeout(() => {
        if (navigation.canGoBack()) return;
        // Only navigate to MainApp if we can't go back
        navigation.navigate('MainApp');
      }, 100);
    }, 3000);
    return () => clearTimeout(t);
  }, [roomExpired, historyDeleted, chatId, navigation]);

  const handleLeave = () => {
    if (!chatId || !user || chatAccessLost) return;
    Alert.alert(
      'Leave chat?',
      isAnonymousGroup
        ? 'You will be removed from this group. You can join another anytime.'
        : 'This will end the conversation for both of you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.leaveChat(chatId, user.uid);
            } catch (e) {
              logger.warn('ChatScreen.leave', e);
            } finally {
              navigation.navigate('MainApp');
            }
          },
        },
      ],
    );
  };

  const sendMsg = async (msgText?: string) => {
    const content = msgText ?? text.trim();
    if (!content || !chatId || !user || chatAccessLost) return;
    if (isWaiting) return;
    if (roomExpired) { Alert.alert('Session ended', 'This chat session has expired.'); return; }
    setText('');
    // Clear typing signal immediately on send
    if (typingTimerRef.current) { clearTimeout(typingTimerRef.current); typingTimerRef.current = null; }
    if (typingActiveRef.current) {
      typingActiveRef.current = false;
      chatService.clearTyping(chatId, user.uid).catch(() => undefined);
    }
    const senderName = isAnonymousRoom
      ? chatMeta?.participantAliases?.[user.uid] ?? 'Anonymous'
      : user.name ?? 'You';

    // optimistic echo — server-এর অপেক্ষা না করে এখনই bubble দেখাই
    const echoId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setPendingEchoes((prev) => [
      ...prev,
      {
        id: echoId,
        senderId: user.uid,
        senderName,
        text: content,
        type: 'text',
        timestamp: Date.now(),
        read: false,
        pending: true,
      } as Message & { pending?: boolean },
    ]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      await chatService.sendMessage(chatId, user.uid, senderName, content);
    } catch (e) {
      // fail হলে echo সরিয়ে text ফেরত দিই — user আবার চেষ্টা করতে পারে
      setPendingEchoes((prev) => prev.filter((m) => m.id !== echoId));
      setText(content);
      Alert.alert('Send failed', 'Message could not be sent. Please try again.');
      logger.warn('ChatScreen.sendMsg', e);
    }
  };

  const handleDealConfirm = async () => {
    if (!chatId || !user || isAnonymousRoom || chatAccessLost) return;

    // business rule: একসময়ে একটাই active ride-deal। অন্য কোনো chat-এ deal
    // confirm করা থাকলে এখানে confirm আটকাই (একজন একসাথে একটাই ride-এ যাবে)।
    try {
      const other = await chatService.findOtherActiveConfirmedDeal(user.uid, chatId);
      if (other) {
        Alert.alert(
          'You already have an active ride',
          `You've confirmed a ride with ${other.partnerName}. Finish or cancel it before confirming another.`,
        );
        return;
      }
    } catch (e) {
      logger.warn('ChatScreen.checkActiveDeal', e);
      // চেক fail করলে confirm আটকাই না (best-effort) — নাহলে ইউজার stuck।
    }

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
    }
    // not-both-confirmed: কোনো popup না — deal button নিজেই "Waiting for
    // partner confirmation..." দেখায় (inline status > বিরক্তিকর Alert)।
  };

  const handleCopy = useCallback((msgId: string, txt: string) => {
    Clipboard.setString(txt);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  }, []);

  // Long-press action sheet: copy + delete (own, <60s) + block (anonymous group)
  const handleMessageLongPress = useCallback((item: Message) => {
    const isMe = item.senderId === user?.uid;
    const canDelete = isMe && Date.now() - (item.timestamp ?? 0) < 60_000;
    const canBlock = !isMe && isAnonymousGroup;

    const options: { text: string; style?: 'default' | 'destructive' | 'cancel'; onPress?: () => void }[] = [
      { text: 'Copy', onPress: () => handleCopy(item.id, item.text) },
    ];
    if (canDelete) {
      options.push({
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!chatId || !user) return;
          try {
            await chatService.deleteOwnMessage(chatId, item.id, user.uid);
          } catch (e) {
            logger.warn('ChatScreen.deleteOwnMsg', e);
          }
        },
      });
    }
    if (canBlock) {
      const alias = chatMeta?.participantAliases?.[item.senderId] ?? 'Anonymous';
      options.push({
        text: `Block ${alias}`,
        style: 'destructive',
        onPress: async () => {
          if (!chatId || !user) return;
          try {
            await chatService.blockUser(user.uid, alias, chatId);
            setBlockedAliases((prev) => new Set(prev).add(alias));
          } catch (e) {
            logger.warn('ChatScreen.block', e);
          }
        },
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message options', undefined, options);
  }, [user, chatId, chatMeta, isAnonymousGroup, handleCopy]);

  const renderMessage = useCallback(({ item, index }: { item: Message; index?: number }) => {
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

    // Hide blocked users' messages
    if (!isMe && blockedAliases.has(label ?? '')) return null;

    // ── WhatsApp-style grouping ──
    // পরপর একই sender-এর message এক "stack" — শুধু stack-এর শেষ bubble-এ time
    // ও tail/avatar দেখাই, মাঝেরগুলো শক্ত করে বসে। পরিচ্ছন্ন, কম জায়গা নেয়।
    const list = displayMessages;
    const idx = index ?? list.findIndex((x) => x.id === item.id);
    const prev = idx > 0 ? list[idx - 1] : null;
    const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
    const sameAsPrev = prev && prev.type !== 'system' && prev.senderId === item.senderId;
    const sameAsNext = next && next.type !== 'system' && next.senderId === item.senderId;
    const isGroupStart = !sameAsPrev;   // stack-এর প্রথম
    const isGroupEnd = !sameAsNext;     // stack-এর শেষ (এখানে time + tail + avatar)

    const timeStr = item.timestamp
      ? new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : '';
    const copied = copiedMsgId === item.id;
    const isDeleted = item.text === '[deleted]';

    const partnerReadAt = !isAnonymousRoom && chatMeta?.lastRead
      ? Math.max(...Object.entries(chatMeta.lastRead)
        .filter(([uid]) => uid !== user?.uid)
        .map(([, t]) => Number(t) || 0), 0)
      : 0;
    const isRead = isMe && !isAnonymousRoom && partnerReadAt > 0 && partnerReadAt >= (item.timestamp ?? 0);

    const maxBubbleWidth = screenWidth < 400 ? 0.82 : 0.72;

    return (
      <View style={[m.row, isMe && m.rowMe, { marginTop: isGroupStart ? 8 : 2 }]}>
        {/* avatar শুধু partner-এর stack-এর শেষে; নাহলে ফাঁকা spacer (alignment) */}
        {!isMe && (
          isGroupEnd
            ? <MiniAvatar label={label ?? 'A'} gradient={isAnonymousRoom} />
            : <View style={m.avatarSpacer} />
        )}
        <TouchableWithoutFeedback onLongPress={() => handleMessageLongPress(item)}>
          <View
            style={[
              m.bubble,
              { maxWidth: `${maxBubbleWidth * 100}%` },
              isMe ? m.bubbleMe : m.bubbleThem,
              // tail শুধু stack-এর শেষ bubble-এ; নাহলে দুপাশ সমান-গোল (grouped look)
              isMe
                ? (isGroupEnd ? m.tailMe : m.noTailMe)
                : (isGroupEnd ? m.tailThem : m.noTailThem),
              copied && m.bubbleCopied,
            ]}
          >
            {copied && <View style={m.copiedOverlay} />}
            {/* sender নাম শুধু partner stack-এর শুরুতে (anonymous group-এ কাজে লাগে) */}
            {!isMe && isGroupStart && isAnonymousRoom && <Text style={m.senderLabel}>{label}</Text>}
            <Text style={[m.bubbleText, isMe && m.bubbleTextMe, isDeleted && m.bubbleTextDeleted]}>
              {isDeleted ? 'message deleted' : item.text}
            </Text>
            {/* time + tick শুধু stack-এর শেষ bubble-এ (WhatsApp pattern) */}
            {isGroupEnd && (
              <View style={m.bubbleFooter}>
                <Text style={[m.msgTime, isMe && m.msgTimeMe]}>{copied ? '✓ copied' : timeStr}</Text>
                {isMe && !isAnonymousRoom && !isDeleted && (
                  <Text style={[m.readMark, isRead && m.readMarkSeen]}>{isRead ? '✓✓' : '✓'}</Text>
                )}
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </View>
    );
  }, [user?.uid, chatMeta, isAnonymousRoom, copiedMsgId, handleMessageLongPress, blockedAliases, displayMessages, screenWidth]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {/* Header — WhatsApp-style: back | avatar | name+status (left) | action */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <IconBack />
        </TouchableOpacity>
        {/* avatar — ride chat-এ partner-এর initial, anonymous-এ live dot */}
        {!isAnonymousRoom && <MiniAvatar label={title?.charAt(0) ?? 'R'} />}
        <View style={s.headerCenter}>
          <View style={s.headerTitleRow}>
            {isAnonymousRoom && <LiveDot color={roomExpired ? C.red : C.green} />}
            <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          </View>
          {!isAnonymousRoom && (
            <View style={s.headerStatusRow}>
              <View style={[s.onlineDot, { backgroundColor: partnerOnline ? C.green : C.textMuted }]} />
              <Text style={s.headerSub} numberOfLines={1}>
                {roomExpired
                  ? 'Session ended'
                  : presenceLabel ?? (partnerOnline ? 'Online' : 'Offline')}
              </Text>
            </View>
          )}
        </View>
        {isAnonymousRoom ? (
          <TouchableOpacity
            style={s.leaveBtn}
            onPress={handleLeave}
            activeOpacity={0.7}
          >
            <Text style={s.leaveBtnText}>Leave</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => navigation.navigate('MainApp')}
            activeOpacity={0.7}
          >
            <IconChat />
          </TouchableOpacity>
        )}
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
              {!isWaiting && <Text style={s.anonNote}>Hidden identity</Text>}
            </View>
            <View style={s.timerCircle}>
              <Text style={s.timerCircleNum}>{formatCountdown(remainingMs ?? 0)}</Text>
              <Text style={s.timerCircleLabel}>left</Text>
            </View>
          </View>
          {isWaiting && (
            <View style={s.waitingBannerInline}>
              <View style={s.waitingBannerDots}>
                <View style={s.waitingDot} />
                <View style={s.waitingDot} />
                <View style={s.waitingDot} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.waitingBannerText}>Waiting for match...</Text>
                <Text style={s.waitingBannerSub}>Stay here to enter the chat instantly.</Text>
              </View>
            </View>
          )}
          <View style={s.timerTrack}>
            <View style={[s.timerFill, { width: `${(1 - countdownProgress) * 100}%` as any }]} />
          </View>
        </View>
      ) : (
        <View style={s.fareBanner}>
          <Text style={s.fareBannerLabel}>Fare split</Text>
          {fare > 0 ? (
            <Text style={s.fareBannerFare}>BDT {fare} / 2 = <Text style={s.fareBannerSplit}>BDT {splitFare} each</Text></Text>
          ) : (
            // fare অজানা (custom destination) — "BDT 0" ভাঙা দেখায়, trust নষ্ট
            // করে। বরং দুজনকে চ্যাটে ঠিক করতে বলি।
            <Text style={s.fareBannerSplit}>Decide together in chat 🤝</Text>
          )}
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 60}
      >
        <FlatList
          ref={listRef}
          data={displayMessages}
          keyExtractor={(m) => m.id}
          renderItem={({ item, index }) => (
            // pending echo হালকা দেখাই — server confirm হলে পূর্ণ উজ্জ্বল
            <View style={(item as any).pending ? { opacity: 0.55 } : undefined}>
              {renderMessage({ item, index })}
            </View>
          )}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: screenWidth < 400 ? 10 : 16,
            paddingVertical: 10,
            paddingBottom: isWaiting ? 20 : 10,
            gap: 8,
          }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            isWaiting ? (
              <View style={s.waitingStage}>
                <View style={s.waitingOrb}>
                  <View style={s.waitingOrbInner} />
                </View>
                <Text style={s.waitingTitle}>Looking for another person</Text>
                <Text style={s.waitingText}>
                  Stay on this screen. You will enter the chat as soon as someone joins.
                </Text>
              </View>
            ) : (
              <View style={s.emptyMsgs}>
                {/* matched-context empty state — মরা "No messages yet" এর বদলে
                    উষ্ণ শুরু: কী হয়েছে + এরপর কী করবে, পরিষ্কার পথ। */}
                <View style={s.emptyIconWrap}>
                  <IconHandshake />
                </View>
                <Text style={s.emptyTitle}>
                  {isAnonymousRoom ? 'You are connected!' : `You matched with ${title}`}
                </Text>
                <Text style={s.emptyMsgsText}>
                  {isAnonymousRoom
                    ? 'Say hello — identities stay hidden.'
                    : 'Same destination 🎯 Say salam, agree on a meet point, and split the fare.'}
                </Text>
                <Text style={s.emptyHint}>Tap a quick reply below to start ↓</Text>
              </View>
            )
          }
        />

        {/* Quick replies */}
        {!isWaiting && (
          <View style={[s.quickRow, { paddingHorizontal: screenWidth < 360 ? 8 : 10 }]}>
            {QUICK_REPLIES.map((qr) => (
              <TouchableOpacity
                key={qr.id}
                style={[s.qrBtn, roomExpired && s.qrBtnDisabled]}
                onPress={() => { void sendMsg(qr.text); }}
                disabled={roomExpired}
                activeOpacity={0.75}
              >
                <Text style={[s.qrText, { fontSize: screenWidth < 360 ? 10 : 11 }]}>{qr.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Typing indicator (someone else typing) */}
        {(() => {
          const others = Object.entries(chatMeta?.typing ?? {}).filter(
            ([uid, info]) => uid !== user?.uid && info && (Date.now() - ((info as { at?: number }).at ?? 0) < 5000),
          );
          if (others.length === 0) return null;
          const label = isAnonymousRoom ? (others[0][1] as { alias?: string }).alias ?? 'Anonymous' : 'Partner';
          return (
            <View style={s.typingRow}>
              <View style={s.typingDots}>
                <View style={s.typingDot} />
                <View style={s.typingDot} />
                <View style={s.typingDot} />
              </View>
              <Text style={s.typingText}>{label} is typing…</Text>
            </View>
          );
        })()}

        {/* Input row */}
        <View
          style={[
            s.inputRow,
            {
              paddingBottom: insets.bottom + 10,
              paddingHorizontal: screenWidth < 360 ? 8 : 10,
              gap: screenWidth < 360 ? 6 : 7,
            },
          ]}
        >
          <TextInput
            style={[
              s.input,
              isWaiting && s.inputDisabled,
              inputFocused && s.inputFocused,
              roomExpired && s.inputExpired,
            ]}
            value={text}
            onChangeText={(t) => {
              // Block input during waiting or after expiry
              if (isWaiting || roomExpired) return;
              setText(t);

              if (t.length === 0) {
                if (typingTimerRef.current) {
                  clearTimeout(typingTimerRef.current);
                  typingTimerRef.current = null;
                }
                if (typingActiveRef.current && chatId && user) {
                  typingActiveRef.current = false;
                  chatService.clearTyping(chatId, user.uid).catch(() => undefined);
                }
                return;
              }

              // Throttled typing signal — only if user hasn't disabled it in privacy prefs
              if (!privacyPrefs.showTypingIndicator) return;
              if (chatId && user) {
                if (!typingActiveRef.current) {
                  typingActiveRef.current = true;
                  const alias = chatMeta?.participantAliases?.[user.uid] ?? user.name ?? 'You';
                  chatService.setTyping(chatId, user.uid, alias).catch(() => undefined);
                }
                if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                typingTimerRef.current = setTimeout(() => {
                  typingActiveRef.current = false;
                  if (chatId && user) chatService.clearTyping(chatId, user.uid).catch(() => undefined);
                }, 3000);
              }
            }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={
              roomExpired
                ? 'Session ended'
                : isWaiting
                  ? 'Keyboard locked - waiting for match...'
                  : 'Type message...'
            }
            placeholderTextColor={C.textMuted}
            multiline
            maxLength={300}
            editable={!roomExpired && !isWaiting}
            scrollEnabled={true}
          />
          <TouchableOpacity
            style={[
              s.sendBtn,
              (roomExpired || isWaiting || !text.trim()) && s.sendBtnDisabled,
              !roomExpired && !isWaiting && text.trim() && s.sendBtnActive,
            ]}
            onPress={() => { void sendMsg(); }}
            disabled={roomExpired || isWaiting || !text.trim()}
            activeOpacity={0.85}
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
              {myDealPressed
                ? 'Waiting for partner confirmation...'
                : fare > 0 ? `Confirm Deal | BDT ${splitFare} each` : 'Confirm Deal'}
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
            <Text style={s.expiredSub}>Chat history has been deleted. Returning...</Text>
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
    paddingHorizontal: 10, paddingBottom: 6,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  leaveBtn: {
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 13,
    backgroundColor: 'rgba(244,63,94,0.12)',
    borderWidth: 1, borderColor: 'rgba(244,63,94,0.25)',
  },
  leaveBtnText: { fontSize: 11, fontWeight: '800', color: '#F43F5E', letterSpacing: 0.2 },
  headerCenter: { flex: 1, alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 10 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 15.5, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  headerSub: { fontSize: 11, color: C.textSub },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5 },

  anonBanner: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  anonBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  anonBannerLeft: { flex: 1, gap: 1 },
  anonChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 14, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
  },
  anonChipText: { fontSize: 9, fontWeight: '700', color: C.amber },
  anonNote: { fontSize: 9, color: '#A0916B', lineHeight: 12 },
  timerCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1.2, borderColor: 'rgba(245,158,11,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  timerCircleNum: { fontSize: 9, fontWeight: '800', color: C.amber },
  timerCircleLabel: { fontSize: 6, color: C.amber, fontWeight: '600', marginTop: -2 },
  waitingBannerInline: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.22)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timerTrack: { height: 2, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 2, overflow: 'hidden' },
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

  emptyMsgs: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8, minHeight: 320 },
  emptyMsgsText: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  emptyIconWrap: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(99,102,241,0.12)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text, textAlign: 'center', letterSpacing: -0.2 },
  emptyHint: { fontSize: 11, fontWeight: '700', color: C.primary, marginTop: 6, letterSpacing: 0.2 },
  waitingStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  waitingOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  waitingOrbInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.amber,
  },
  waitingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  waitingText: {
    fontSize: 12,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },

  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  qrBtn: {
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.24)',
  },
  qrBtnDisabled: { opacity: 0.35 },
  qrText: { fontSize: 11, color: '#C7D2FE', fontWeight: '700' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 8,
    gap: 7,
    backgroundColor: C.bg,
  },
  typingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4,
  },
  typingDots: { flexDirection: 'row', gap: 3 },
  typingDot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: C.textMuted,
  },
  typingText: { fontSize: 11, color: C.textMuted, fontStyle: 'italic' },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 14,
    color: C.text,
    maxHeight: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(99,102,241,0.3)',
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(148,163,184,0.15)',
  },
  inputExpired: {
    opacity: 0.4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(244,63,94,0.2)',
  },
  inputFocused: {
    borderColor: 'rgba(99,102,241,0.7)',
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderWidth: 2,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99,102,241,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
  },
  sendBtnActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  sendBtnDisabled: {
    opacity: 0.35,
    shadowOpacity: 0,
  },

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
    margin: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(244,63,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.2)',
    alignItems: 'center',
  },
  expiredTitle: { fontSize: 13, fontWeight: '800', color: C.red, marginBottom: 3 },
  expiredSub: { fontSize: 11, color: '#A87070', textAlign: 'center', lineHeight: 16 },
  waitingBannerDots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  waitingDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.amber,
  },
  waitingBannerText: {
    flex: 1,
    fontSize: 13,
    color: C.amber,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  waitingBannerSub: {
    fontSize: 11,
    color: 'rgba(245,158,11,0.8)',
    fontWeight: '600',
  },
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
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    position: 'relative',
  },
  bubbleThem: {
    backgroundColor: C.surfaceStrong,
    borderWidth: 1,
    borderColor: C.border,
  },
  bubbleMe: {
    backgroundColor: C.primary,
  },
  // tail = stack-এর শেষ bubble-এর কোণা চাপা (WhatsApp pluck); grouped মাঝের
  // bubble দুপাশ সমান-গোল যাতে একটা stack মনে হয়।
  tailMe: { borderBottomRightRadius: 5 },
  noTailMe: { borderBottomRightRadius: 18, borderTopRightRadius: 7 },
  tailThem: { borderBottomLeftRadius: 5 },
  noTailThem: { borderBottomLeftRadius: 18, borderTopLeftRadius: 7 },
  avatarSpacer: { width: 30 },
  bubbleCopied: {
    opacity: 0.85,
  },
  copiedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: 'rgba(20,184,166,0.15)',
  },
  copiedLabel: {
    position: 'absolute',
    top: -22,
    right: 0,
    backgroundColor: 'rgba(20,184,166,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  copiedLabelText: {
    fontSize: 10,
    color: C.white,
    fontWeight: '700',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 3,
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textSub,
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: 14.5,
    color: C.text,
    lineHeight: 20,
  },
  bubbleTextMe: { color: C.white },
  msgTime: {
    fontSize: 9,
    color: C.textMuted,
    textAlign: 'right',
  },
  msgTimeMe: {
    color: 'rgba(255,255,255,0.5)',
  },
  bubbleTextDeleted: { fontStyle: 'italic', opacity: 0.6 },
  readMark: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
  },
  readMarkSeen: { color: '#34D399' },
});
