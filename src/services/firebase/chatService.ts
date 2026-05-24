import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  getDoc,
  getDocs,
  writeBatch,
  limit,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { logger } from '@/utils/logger';

export type ChatMode = 'ride' | 'anonymous_1v1' | 'anonymous_group';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'text' | 'quick_reply' | 'location' | 'system';
}

export interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantAliases?: Record<string, string>;
  rideId?: string;
  destination: string;
  fare: number;
  mode?: ChatMode;
  anonymous?: boolean;
  expiresAt?: number;
  searching?: boolean;
  minParticipants?: number;
  maxParticipants?: number;
  lastMessage?: string;
  lastMessageTime?: number;
  dealConfirmed?: Record<string, boolean>;
}

// All chats expire after 10 minutes — messages + doc fully deleted
const CHAT_DURATION_MS = 10 * 60 * 1000;

// Anonymous group chat capacity (hidden-identity room).
// At least 2 to be considered active, up to 10 strangers.
export const ANON_GROUP_MIN_PARTICIPANTS = 2;
export const ANON_GROUP_MAX_PARTICIPANTS = 10;

class ChatService {

  private buildAnonymousAlias(position: number): string {
    return `Anonymous ${position}`;
  }

  private async appendSystemMessage(chatId: string, text: string): Promise<void> {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      senderId: 'system',
      senderName: 'System',
      text,
      type: 'system',
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
    });
  }

  // Delete all messages + the chat doc entirely
  async deleteChat(chatId: string): Promise<void> {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const snap = await getDocs(messagesRef);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'chats', chatId));
      await batch.commit();
    } catch (e) {
      logger.warn('chatService.deleteChat', e);
    }
  }

  // Create or get existing ride chat — always sets a 10-min expiry
  async getOrCreateChat(
    user1Id: string,
    user1Name: string,
    user2Id: string,
    user2Name: string,
    destination: string,
    fare: number,
    rideId?: string
  ): Promise<string> {
    const chatId = [user1Id, user2Id].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    const existing = await getDoc(chatRef);

    if (!existing.exists()) {
      const expiresAt = Date.now() + CHAT_DURATION_MS;
      await setDoc(chatRef, {
        participants: [user1Id, user2Id],
        participantNames: { [user1Id]: user1Name, [user2Id]: user2Name },
        destination,
        fare,
        mode: 'ride',
        anonymous: false,
        rideId: rideId ?? null,
        expiresAt,
        createdAt: serverTimestamp(),
        dealConfirmed: { [user1Id]: false, [user2Id]: false },
        lastMessage: '',
        lastMessageTime: Date.now(),
      });
      await this.appendSystemMessage(chatId, 'Chat started. This conversation will auto-delete in 10 minutes.');
    }
    return chatId;
  }

  // Returns existing active (non-expired) anonymous room for this user, or null
  async getUserActiveAnonymousRoom(userId: string, mode: 'anonymous_1v1' | 'anonymous_group'): Promise<string | null> {
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('mode', '==', mode),
      where('participants', 'array-contains', userId),
      limit(5)
    );
    const snap = await getDocs(q);
    const now = Date.now();
    for (const d of snap.docs) {
      const data = d.data() as Chat;
      if ((data.expiresAt ?? 0) > now) return d.id;
    }
    return null;
  }

  async getUserAnyActiveAnonymousRoom(userId: string): Promise<{ chatId: string; mode: 'anonymous_1v1' | 'anonymous_group' } | null> {
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('anonymous', '==', true),
      where('participants', 'array-contains', userId),
      limit(10)
    );
    const snap = await getDocs(q);
    const now = Date.now();
    for (const d of snap.docs) {
      const data = d.data() as Chat;
      if ((data.expiresAt ?? 0) > now && (data.mode === 'anonymous_1v1' || data.mode === 'anonymous_group')) {
        return { chatId: d.id, mode: data.mode };
      }
    }
    return null;
  }

  async cleanupDuplicateAnonymousRooms(userId: string): Promise<{ chatId: string; mode: 'anonymous_1v1' | 'anonymous_group' } | null> {
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('anonymous', '==', true),
      where('participants', 'array-contains', userId),
      limit(20)
    );
    const snap = await getDocs(q);
    const now = Date.now();

    const activeRooms = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Chat) }))
      .filter((room) =>
        (room.expiresAt ?? 0) > now &&
        (room.mode === 'anonymous_1v1' || room.mode === 'anonymous_group')
      )
      .sort((a, b) => (b.lastMessageTime ?? 0) - (a.lastMessageTime ?? 0));

    const keep = activeRooms[0];
    const duplicates = activeRooms.slice(1);
    await Promise.all(duplicates.map((room) => this.deleteChat(room.id)));

    return keep ? { chatId: keep.id, mode: keep.mode as 'anonymous_1v1' | 'anonymous_group' } : null;
  }

  // Delete all searching/waiting rooms created by this user that are still empty
  async cleanupUserOrphanRooms(userId: string): Promise<void> {
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', userId),
      where('searching', '==', true),
      limit(10)
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => this.deleteChat(d.id)));
  }

  // Try to join one of the existing waiting 1v1 rooms. Returns chatId or null.
  private async tryJoinWaiting1v1(userId: string): Promise<string | null> {
    const chatsRef = collection(db, 'chats');
    const waitingQuery = query(
      chatsRef,
      where('mode', '==', 'anonymous_1v1'),
      where('searching', '==', true),
      limit(10)
    );
    const waitingRooms = await getDocs(waitingQuery);
    const now = Date.now();

    for (const roomDoc of waitingRooms.docs) {
      const room = roomDoc.data() as Chat;
      const alreadyJoined = room.participants?.includes(userId);
      const expired = !!room.expiresAt && room.expiresAt <= now;
      const hasSlot = (room.participants?.length ?? 0) < 2;
      if (alreadyJoined || expired || !hasSlot) continue;

      const joinedId = await runTransaction(db, async (transaction) => {
        const latest = await transaction.get(roomDoc.ref);
        if (!latest.exists()) return null;
        const data = latest.data() as Chat;
        if (
          data.searching !== true ||
          (data.participants?.length ?? 0) >= 2 ||
          (data.expiresAt ?? 0) <= Date.now() ||
          data.participants?.includes(userId)
        ) return null;

        const participants = [...(data.participants ?? []), userId];
        const aliases = {
          ...(data.participantAliases ?? {}),
          [userId]: this.buildAnonymousAlias(participants.length),
        };
        transaction.set(roomDoc.ref, {
          participants,
          participantAliases: aliases,
          participantNames: aliases,
          searching: false,
          lastMessageTime: Date.now(),
        }, { merge: true });
        return roomDoc.id;
      });

      if (joinedId) {
        await this.appendSystemMessage(joinedId, 'Another anonymous user joined. Chat auto-deletes in 10 minutes.');
        return joinedId;
      }
    }
    return null;
  }

  async startAnonymousOneToOne(userId: string): Promise<string> {
    // Try existing waiting rooms first
    const firstAttempt = await this.tryJoinWaiting1v1(userId);
    if (firstAttempt) return firstAttempt;

    // Race-condition guard: another user may have just created a room
    // while we were checking. Quick retry before creating our own.
    const retry = await this.tryJoinWaiting1v1(userId);
    if (retry) return retry;

    const chatsRef = collection(db, 'chats');
    const roomRef = doc(chatsRef);
    const expiresAt = Date.now() + CHAT_DURATION_MS;
    await setDoc(roomRef, {
      participants: [userId],
      participantNames: { [userId]: this.buildAnonymousAlias(1) },
      participantAliases: { [userId]: this.buildAnonymousAlias(1) },
      destination: 'Anonymous 1:1',
      fare: 0,
      mode: 'anonymous_1v1',
      anonymous: true,
      searching: true,
      minParticipants: 2,
      maxParticipants: 2,
      expiresAt,
      createdAt: serverTimestamp(),
      dealConfirmed: { [userId]: false },
      lastMessage: '',
      lastMessageTime: Date.now(),
    });

    await this.appendSystemMessage(roomRef.id, 'Anonymous room created. Waiting for another person to join. Auto-deletes in 10 minutes.');
    return roomRef.id;
  }

  // Join a specific existing group room by ID (used when user picks from list)
  async joinGroupById(chatId: string, userId: string): Promise<string> {
    const roomRef = doc(db, 'chats', chatId);
    const joinedId = await runTransaction(db, async (transaction) => {
      const latest = await transaction.get(roomRef);
      if (!latest.exists()) return null;
      const data = latest.data() as Chat;
      const currentParticipants = data.participants ?? [];
      if (
        currentParticipants.length >= ANON_GROUP_MAX_PARTICIPANTS ||
        (data.expiresAt ?? 0) <= Date.now() ||
        currentParticipants.includes(userId)
      ) return null;

      const participants = [...currentParticipants, userId];
      const aliases = {
        ...(data.participantAliases ?? {}),
        [userId]: this.buildAnonymousAlias(participants.length),
      };
      transaction.set(roomRef, {
        participants,
        participantAliases: aliases,
        participantNames: aliases,
        searching: participants.length < ANON_GROUP_MAX_PARTICIPANTS,
        lastMessageTime: Date.now(),
      }, { merge: true });
      return chatId;
    });
    if (!joinedId) throw new Error('Room full or expired');
    await this.appendSystemMessage(chatId, 'A new anonymous member joined the group.');
    return chatId;
  }

  // Try to join one of the existing waiting group rooms. Returns chatId or null.
  private async tryJoinWaitingGroup(userId: string): Promise<string | null> {
    const chatsRef = collection(db, 'chats');
    const waitingQuery = query(
      chatsRef,
      where('mode', '==', 'anonymous_group'),
      where('searching', '==', true),
      limit(10)
    );
    const waitingRooms = await getDocs(waitingQuery);
    const now = Date.now();

    for (const roomDoc of waitingRooms.docs) {
      const room = roomDoc.data() as Chat;
      const alreadyJoined = room.participants?.includes(userId);
      const expired = !!room.expiresAt && room.expiresAt <= now;
      const hasSlot = (room.participants?.length ?? 0) < ANON_GROUP_MAX_PARTICIPANTS;
      if (alreadyJoined || expired || !hasSlot) continue;

      const joinedId = await runTransaction(db, async (transaction) => {
        const latest = await transaction.get(roomDoc.ref);
        if (!latest.exists()) return null;
        const data = latest.data() as Chat;
        const currentParticipants = data.participants ?? [];
        if (
          data.searching !== true ||
          currentParticipants.length >= ANON_GROUP_MAX_PARTICIPANTS ||
          (data.expiresAt ?? 0) <= Date.now() ||
          currentParticipants.includes(userId)
        ) return null;

        const participants = [...currentParticipants, userId];
        const aliases = {
          ...(data.participantAliases ?? {}),
          [userId]: this.buildAnonymousAlias(participants.length),
        };
        transaction.set(roomDoc.ref, {
          participants,
          participantAliases: aliases,
          participantNames: aliases,
          searching: participants.length < ANON_GROUP_MAX_PARTICIPANTS,
          lastMessageTime: Date.now(),
        }, { merge: true });
        return roomDoc.id;
      });

      if (joinedId) {
        await this.appendSystemMessage(joinedId, 'A new anonymous member joined the group.');
        return joinedId;
      }
    }
    return null;
  }

  async startAnonymousGroup(userId: string): Promise<string> {
    const firstAttempt = await this.tryJoinWaitingGroup(userId);
    if (firstAttempt) return firstAttempt;

    // Race-condition guard: someone else may have just created/joined.
    const retry = await this.tryJoinWaitingGroup(userId);
    if (retry) return retry;

    const chatsRef = collection(db, 'chats');
    const roomRef = doc(chatsRef);
    const expiresAt = Date.now() + CHAT_DURATION_MS;
    await setDoc(roomRef, {
      participants: [userId],
      participantNames: { [userId]: this.buildAnonymousAlias(1) },
      participantAliases: { [userId]: this.buildAnonymousAlias(1) },
      destination: 'Anonymous Group',
      fare: 0,
      mode: 'anonymous_group',
      anonymous: true,
      searching: true,
      minParticipants: ANON_GROUP_MIN_PARTICIPANTS,
      maxParticipants: ANON_GROUP_MAX_PARTICIPANTS,
      expiresAt,
      createdAt: serverTimestamp(),
      dealConfirmed: { [userId]: false },
      lastMessage: '',
      lastMessageTime: Date.now(),
    });

    await this.appendSystemMessage(roomRef.id, 'Anonymous group created. Auto-deletes in 10 minutes.');
    return roomRef.id;
  }

  async sendMessage(
    chatId: string,
    senderId: string,
    senderName: string,
    text: string,
    type: Message['type'] = 'text'
  ): Promise<void> {
    const clean = text.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/[​-‍⁠﻿]/g, '').substring(0, 1000);
    if (!clean) throw new Error('Message cannot be empty');
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      senderId,
      senderName,
      text: clean,
      type,
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
    });
    const chatRef = doc(db, 'chats', chatId);
    await setDoc(chatRef, { lastMessage: clean, lastMessageTime: Date.now() }, { merge: true });
  }

  listenToMessages(chatId: string, callback: (messages: Message[]) => void): () => void {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Message, 'id'>),
      }));
      callback(msgs);
    });
  }

  async confirmDeal(chatId: string, userId: string): Promise<boolean> {
    const chatRef = doc(db, 'chats', chatId);
    await setDoc(chatRef, { [`dealConfirmed.${userId}`]: true }, { merge: true });
    const updated = await getDoc(chatRef);
    const data = updated.data();
    if (!data) return false;
    const confirmed = data.dealConfirmed as Record<string, boolean>;
    return Object.values(confirmed).every(Boolean);
  }

  listenToChat(chatId: string, callback: (chat: Partial<Chat>) => void): () => void {
    return onSnapshot(doc(db, 'chats', chatId), (snap) => {
      if (snap.exists()) callback(snap.data() as Partial<Chat>);
    });
  }

  // Legacy aliases — kept for backward compat with existing call sites
  async deleteOneToOneHistory(chatId: string): Promise<void> {
    return this.deleteChat(chatId);
  }

  async deleteAnonymousRoom(chatId: string): Promise<void> {
    return this.deleteChat(chatId);
  }
}

export default new ChatService();
