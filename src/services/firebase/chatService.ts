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
  closedAt?: number;
  closedBy?: string;
  dealConfirmed?: Record<string, boolean>;
  /** uid -> last read timestamp (for read receipts) */
  lastRead?: Record<string, number>;
  /** uid -> { alias, at } (for typing indicator) */
  typing?: Record<string, { alias: string; at: number } | null>;
}

// Chat expiry durations — messages + doc fully deleted on expiry
const RIDE_CHAT_DURATION_MS = 10 * 60 * 1000;       // 10 min for ride coordination
const ANON_1V1_DURATION_MS = 5 * 60 * 1000;          // 5 min for 1v1 anonymous
const ANON_GROUP_DURATION_MS = 10 * 60 * 1000;       // 10 min for group anonymous

// Anonymous group chat capacity (hidden-identity room).
// At least 2 to be considered active, up to 10 strangers.
export const ANON_GROUP_MIN_PARTICIPANTS = 2;
export const ANON_GROUP_MAX_PARTICIPANTS = 10;

class ChatService {
  private isExpectedPermissionError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return message.includes('permission-denied') || message.includes('Missing or insufficient permissions');
  }

  private buildAnonymousAlias(position: number): string {
    return `Anonymous ${position}`;
  }

  private async appendSystemMessage(
    chatId: string,
    text: string,
    actorId: string,
    actorName: string,
  ): Promise<void> {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      senderId: actorId,
      senderName: actorName,
      text,
      type: 'system',
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
    });
  }

  // Production-safe client cleanup: mark chat expired and let admin cleanup remove data.
  async deleteChat(chatId: string): Promise<void> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      await setDoc(chatRef, {
        expiresAt: Date.now(),
        closedAt: Date.now(),
        searching: false,
      }, { merge: true });
    } catch (e) {
      logger.warn('chatService.deleteChat', e);
    }
  }

  /**
   * User voluntarily leaves a chat.
   * - 1v1: room is destroyed (other side gets auto-dismissed on snapshot)
   * - Group: user is removed from participants; if last person, room destroyed
   * - Ride: same as 1v1 (both must agree, so leaving ends it)
   */
  async leaveChat(chatId: string, userId: string): Promise<void> {
    const chatRef = doc(db, 'chats', chatId);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(chatRef);
        if (!snap.exists()) return;
        const data = snap.data() as Chat;
        const participants = data.participants ?? [];
        const remaining = participants.filter((p) => p !== userId);

        // 1v1 / ride: leaving = closing the room for cleanup
        if (data.mode === 'anonymous_1v1' || data.mode === 'ride') {
          tx.update(chatRef, {
            expiresAt: Date.now(),
            closedAt: Date.now(),
            closedBy: userId,
            searching: false,
            lastMessageTime: Date.now(),
          });
          return;
        }

        // Group: if last person, close; else remove membership
        if (remaining.length === 0) {
          tx.update(chatRef, {
            participants: [],
            participantAliases: {},
            participantNames: {},
            searching: false,
            expiresAt: Date.now(),
            closedAt: Date.now(),
            closedBy: userId,
            lastMessageTime: Date.now(),
          });
          return;
        }

        const aliases = { ...(data.participantAliases ?? {}) };
        delete aliases[userId];

        tx.update(chatRef, {
          participants: remaining,
          participantAliases: aliases,
          participantNames: aliases,
          searching: remaining.length < ANON_GROUP_MAX_PARTICIPANTS,
          lastMessageTime: Date.now(),
        });
      });

    } catch (e) {
      logger.warn('chatService.leaveChat', e);
      throw e;
    }
  }

  /**
   * Block another user. Their messages will be hidden from this user
   * client-side, and they won't be matchable into new anonymous chats.
   *
   * For ride chats this is a no-op (you already know who the partner is —
   * use the existing report flow instead).
   */
  async blockUser(
    blockerId: string,
    blockedAlias: string,
    chatId: string,
  ): Promise<void> {
    const blockRef = doc(db, 'users', blockerId, 'blocked', `${chatId}_${blockedAlias}`);
    await setDoc(blockRef, {
      chatId,
      blockedAlias,
      createdAt: Date.now(),
    });
    logger.info('chatService.blockUser', `Blocked ${blockedAlias} in ${chatId}`);
  }

  /**
   * Returns the set of {chatId, alias} pairs this user has blocked.
   * Use client-side to filter incoming messages.
   */
  async getBlockedAliases(userId: string): Promise<Array<{ chatId: string; alias: string }>> {
    const snap = await getDocs(collection(db, 'users', userId, 'blocked'));
    return snap.docs.map((d) => {
      const data = d.data();
      return { chatId: data.chatId, alias: data.blockedAlias };
    });
  }

  // Create or get existing active ride chat — always sets a 10-min expiry
  async getOrCreateChat(
    user1Id: string,
    user1Name: string,
    user2Id: string,
    user2Name: string,
    destination: string,
    fare: number,
    rideId?: string
  ): Promise<string> {
    const chatsRef = collection(db, 'chats');
    const existingQuery = query(
      chatsRef,
      where('mode', '==', 'ride'),
      where('participants', 'array-contains', user1Id),
      limit(10),
    );
    const existingSnap = await getDocs(existingQuery);
    const now = Date.now();

    for (const existing of existingSnap.docs) {
      const data = existing.data() as Chat;
      const samePair = data.participants?.includes(user2Id);
      const active = (data.expiresAt ?? 0) > now && !(data.closedAt && data.closedAt <= now);
      if (samePair && active) return existing.id;
    }

    const chatRef = doc(chatsRef);
    if (!(await getDoc(chatRef)).exists()) {
      const expiresAt = Date.now() + RIDE_CHAT_DURATION_MS;
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
      await this.appendSystemMessage(
        chatRef.id,
        'Chat started. This conversation will auto-delete in 10 minutes.',
        user1Id,
        user1Name,
      );
    }
    return chatRef.id;
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

  /**
   * Find this user's active anonymous room.
   *
   * Behavior:
   * - If `preferredMode` given (user is trying to start that mode): prefer a
   *   room of that mode. Don't redirect them to a different-mode active room.
   * - Without preferredMode: return the most-recent active room.
   * - Delete actual duplicates within the same mode (>1 of same mode).
   *
   * Bug fix: previously kept whichever room had recent messages regardless of
   * mode, so a user clicking 'Find 1v1' got redirected to an old group.
   */
  async cleanupDuplicateAnonymousRooms(
    userId: string,
    preferredMode?: 'anonymous_1v1' | 'anonymous_group',
  ): Promise<{ chatId: string; mode: 'anonymous_1v1' | 'anonymous_group' } | null> {
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

    // Group by mode and delete same-mode duplicates (keep the most recent of each mode)
    const byMode = new Map<string, typeof activeRooms>();
    for (const room of activeRooms) {
      const arr = byMode.get(room.mode as string) ?? [];
      arr.push(room);
      byMode.set(room.mode as string, arr);
    }
    const duplicates: typeof activeRooms = [];
    for (const arr of byMode.values()) {
      if (arr.length > 1) duplicates.push(...arr.slice(1));
    }
    await Promise.all(duplicates.map((room) => this.deleteChat(room.id)));

    // Pick which room to return: prefer requested mode, else most recent
    let keep = activeRooms.find((r) => r.mode === preferredMode) ?? activeRooms[0];
    // If user wants 1v1 but only has a group active, DON'T redirect — return null
    // so they can start a fresh 1v1 search.
    if (preferredMode && keep && keep.mode !== preferredMode) {
      keep = undefined as never;
    }
    return keep ? { chatId: keep.id, mode: keep.mode as 'anonymous_1v1' | 'anonymous_group' } : null;
  }

  /**
   * Delete only this user's SOLO waiting rooms (anonymous 1v1 where they are
   * the only participant). Group rooms with multiple members are NEVER touched
   * — bug fix: previously this deleted any searching room including active
   * groups the user had joined.
   */
  async cleanupUserOrphanRooms(userId: string): Promise<void> {
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', userId),
      where('searching', '==', true),
      limit(10)
    );
    const snap = await getDocs(q);
    const soloRooms = snap.docs.filter((d) => {
      const data = d.data() as Chat;
      // Only solo waiting rooms: user is the only participant
      return (data.participants?.length ?? 0) <= 1
        && data.participants?.[0] === userId
        && data.mode === 'anonymous_1v1';
    });
    await Promise.all(soloRooms.map((d) => this.deleteChat(d.id)));
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
        await this.appendSystemMessage(
          joinedId,
          'Another anonymous user joined. Chat auto-deletes in 5 minutes.',
          userId,
          this.buildAnonymousAlias(2),
        );
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
    const expiresAt = Date.now() + ANON_1V1_DURATION_MS;
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

    await this.appendSystemMessage(
      roomRef.id,
      'Anonymous room created. Waiting for another person to join. Auto-deletes in 5 minutes.',
      userId,
      this.buildAnonymousAlias(1),
    );
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
    await this.appendSystemMessage(
      chatId,
      'A new anonymous member joined the group.',
      userId,
      this.buildAnonymousAlias((await getDoc(roomRef)).data()?.participants?.length ?? 2),
    );
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
        await this.appendSystemMessage(
          joinedId,
          'A new anonymous member joined the group.',
          userId,
          this.buildAnonymousAlias(
            ((await getDoc(roomDoc.ref)).data() as Chat | undefined)?.participants?.length ?? 2,
          ),
        );
        return joinedId;
      }
    }
    return null;
  }

  async startAnonymousGroup(userId: string): Promise<string> {
    const existingGroup = await this.getUserActiveAnonymousRoom(userId, 'anonymous_group');
    if (existingGroup) return existingGroup;

    const firstAttempt = await this.tryJoinWaitingGroup(userId);
    if (firstAttempt) return firstAttempt;

    // Race-condition guard: someone else may have just created/joined.
    const retry = await this.tryJoinWaitingGroup(userId);
    if (retry) return retry;

    const chatsRef = collection(db, 'chats');
    const roomRef = doc(chatsRef);
    const expiresAt = Date.now() + ANON_GROUP_DURATION_MS;
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

    await this.appendSystemMessage(
      roomRef.id,
      'Anonymous group created. Auto-deletes in 10 minutes.',
      userId,
      this.buildAnonymousAlias(1),
    );
    return roomRef.id;
  }

  async sendMessage(
    chatId: string,
    senderId: string,
    senderName: string,
    text: string,
    type: Message['type'] = 'text'
  ): Promise<void> {
    const clean = Array.from(text.trim())
      .filter((char) => {
        const code = char.charCodeAt(0);
        const isControl =
          (code >= 0x00 && code <= 0x08) ||
          code === 0x0b ||
          code === 0x0c ||
          (code >= 0x0e && code <= 0x1f) ||
          code === 0x7f;
        const isInvisible =
          code === 0x200b ||
          code === 0x200c ||
          code === 0x200d ||
          code === 0x2060 ||
          code === 0xfeff;
        return !isControl && !isInvisible;
      })
      .join('')
      .substring(0, 1000);
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

  /**
   * Mark this user as currently typing.
   * Writes to chat doc with TTL — caller must clear via clearTyping().
   * Throttled by caller (debounce 800ms in UI).
   */
  async setTyping(chatId: string, userId: string, alias: string): Promise<void> {
    const ref = doc(db, 'chats', chatId);
    await setDoc(
      ref,
      {
        typing: {
          [userId]: { alias, at: Date.now() },
        },
      },
      { merge: true },
    );
  }

  async clearTyping(chatId: string, userId: string): Promise<void> {
    const ref = doc(db, 'chats', chatId);
    await setDoc(
      ref,
      { typing: { [userId]: null } },
      { merge: true },
    );
  }

  /**
   * Mark messages as read up to a timestamp.
   * Used for read receipts in ride chat (Type 1).
   */
  async markRead(chatId: string, userId: string): Promise<void> {
    const ref = doc(db, 'chats', chatId);
    await setDoc(
      ref,
      { lastRead: { [userId]: Date.now() } },
      { merge: true },
    );
  }

  /**
   * Soft-delete a message within 60s of sending (sender only).
   * Replaces text with [deleted] placeholder rather than full removal —
   * preserves message order + read receipts.
   */
  async deleteOwnMessage(chatId: string, messageId: string, userId: string): Promise<void> {
    const ref = doc(db, 'chats', chatId, 'messages', messageId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Message not found');
    const data = snap.data();
    if (data.senderId !== userId) throw new Error('Not the sender');
    const age = Date.now() - (data.timestamp ?? 0);
    if (age > 60 * 1000) throw new Error('Too late to delete (60s limit)');
    await setDoc(ref, { text: '[deleted]', deletedAt: Date.now() }, { merge: true });
  }

  listenToMessages(
    chatId: string,
    callback: (messages: Message[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const msgs: Message[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Message, 'id'>),
        }));
        callback(msgs);
      },
      (error) => {
        if (!this.isExpectedPermissionError(error)) {
          logger.warn('chatService.listenToMessages', error);
        }
        onError?.(error);
      },
    );
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

  listenToChat(
    chatId: string,
    callback: (chat: Partial<Chat>) => void,
    onError?: (error: Error) => void,
  ): () => void {
    return onSnapshot(
      doc(db, 'chats', chatId),
      (snap) => {
        if (snap.exists()) {
          callback(snap.data() as Partial<Chat>);
          return;
        }
        onError?.(new Error('chat-not-found'));
      },
      (error) => {
        if (!this.isExpectedPermissionError(error)) {
          logger.warn('chatService.listenToChat', error);
        }
        onError?.(error);
      },
    );
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

