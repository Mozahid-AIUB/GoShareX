/**
 * chatService.ts
 * Firestore-backed chat between two riders matched on a ride.
 *
 * Collections:
 *   /chats/{chatId}         — Chat metadata
 *   /chats/{chatId}/messages/{msgId} — Individual messages
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  where,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Message, Chat, MessageType } from '@/types/chat.types';

const CHATS_COLLECTION = 'chats';
const MESSAGES_SUBCOLLECTION = 'messages';

// ─── Quick-reply catalogue ────────────────────────────────────────────────────

const QUICK_REPLIES: Record<string, string> = {
  on_my_way: "I'm on my way!",
  wait_5_min: 'Please wait 5 minutes.',
  at_pickup: "I'm at the pickup point.",
  lets_go: "Let's go!",
  confirm_deal: 'Deal confirmed! See you there.',
  cancel: 'Sorry, I need to cancel.',
};

// ─── Chat summary (for chat list screen) ────────────────────────────────────

export interface ChatSummary {
  chatId: string;
  rideId: string;
  partnerId: string;
  lastMessage: string;
  lastTimestamp: number;
  unreadCount: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new chat document between two riders.
 * Uses a deterministic chatId (sorted UIDs + rideId) to avoid duplicate chats.
 */
export async function createChat(
  rider1Id: string,
  rider2Id: string,
  rideId: string,
): Promise<string> {
  const sorted = [rider1Id, rider2Id].sort();
  const chatId = `${sorted[0]}_${sorted[1]}_${rideId}`;
  const ref = doc(db, CHATS_COLLECTION, chatId);

  const existing = await getDoc(ref);
  if (existing.exists()) return chatId;

  await setDoc(ref, {
    chatId,
    participants: [rider1Id, rider2Id],
    rideId,
    lastMessage: '',
    lastTimestamp: Date.now(),
    unreadCount: { [rider1Id]: 0, [rider2Id]: 0 },
    dealConfirmed: { [rider1Id]: false, [rider2Id]: false },
    createdAt: Date.now(),
  } satisfies Omit<Chat, never>);

  return chatId;
}

/**
 * Send a message to a chat thread.
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  text: string,
  type: MessageType = 'text',
): Promise<void> {
  const msgRef = doc(collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION));
  const now = Date.now();

  const message: Message = {
    msgId: msgRef.id,
    senderId,
    text,
    timestamp: now,
    type,
    read: false,
  };

  await setDoc(msgRef, message);

  // Update chat metadata (last message preview + unread counter)
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) return;

  const chat = chatSnap.data() as Chat;
  const [other] = chat.participants.filter((p) => p !== senderId);

  await updateDoc(chatRef, {
    lastMessage: text.length > 60 ? `${text.slice(0, 57)}…` : text,
    lastTimestamp: now,
    [`unreadCount.${other}`]: increment(1),
  });
}

/**
 * Real-time listener for all messages in a chat thread, ordered oldest first.
 * Returns an unsubscribe function.
 */
export function subscribeToChat(
  chatId: string,
  callback: (messages: Message[]) => void,
): () => void {
  const q = query(
    collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION),
    orderBy('timestamp', 'asc'),
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as Message));
  });
}

/**
 * Reset the unread counter for a user in a given chat.
 */
export async function markAsRead(chatId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, CHATS_COLLECTION, chatId), {
    [`unreadCount.${userId}`]: 0,
  });
}

/**
 * Fetch all chats for a user, sorted by most-recent message.
 */
export async function getChatList(userId: string): Promise<ChatSummary[]> {
  const q = query(
    collection(db, CHATS_COLLECTION),
    where('participants', 'array-contains', userId),
    orderBy('lastTimestamp', 'desc'),
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const chat = d.data() as Chat;
    const partnerId = chat.participants.find((p) => p !== userId) ?? '';
    return {
      chatId: chat.chatId,
      rideId: chat.rideId,
      partnerId,
      lastMessage: chat.lastMessage ?? '',
      lastTimestamp: chat.lastTimestamp ?? 0,
      unreadCount: chat.unreadCount?.[userId] ?? 0,
    };
  });
}

/**
 * Send a pre-defined quick-reply by its id.
 */
export async function sendQuickReply(
  chatId: string,
  senderId: string,
  replyId: string,
): Promise<void> {
  const text = QUICK_REPLIES[replyId];
  if (!text) throw new Error(`Unknown quick reply id: "${replyId}"`);
  await sendMessage(chatId, senderId, text, 'quick_reply');
}
