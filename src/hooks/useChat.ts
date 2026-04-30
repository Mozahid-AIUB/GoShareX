import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { Message, MessageType } from '@/types';
import { useAuthStore } from '@/store';
import { logger } from '@/utils/logger';
import { db } from '@/services/firebase/config';

interface SendMessageParams {
  text: string;
  type?: MessageType;
}

interface UseChatResult {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  sendQuickReply: (text: string) => Promise<void>;
}

const CHATS_COLLECTION = 'chats';
const MESSAGES_SUBCOLLECTION = 'messages';

/**
 * Real-time chat subscription for a given chatId.
 * Automatically marks incoming messages as read.
 */
export function useChat(chatId: string): UseChatResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!chatId) return;

    setIsLoading(true);

    const messagesQuery = query(
      collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION),
      orderBy('timestamp', 'asc'),
    );

    unsubscribeRef.current = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const fetched: Message[] = snapshot.docs.map((doc) => ({
          ...(doc.data() as Message),
          msgId: doc.id,
        }));
        setMessages(fetched);
        setIsLoading(false);

        // Mark unread messages from the other participant as read
        if (user) {
          const unread = snapshot.docs.filter(
            (doc) =>
              !doc.data().read && doc.data().senderId !== user.uid,
          );
          const batch = writeBatch(db);
          unread.forEach((messageDoc) => batch.update(messageDoc.ref, { read: true }));
          if (unread.length > 0) {
            batch.commit().catch((err) =>
              logger.warn('useChat', `Failed to mark read: ${err}`),
            );
          }
        }
      },
      (err) => {
        logger.error('useChat.subscribe', err);
        setIsLoading(false);
      },
    );

    return () => {
      unsubscribeRef.current?.();
    };
  }, [chatId, user]);

  const send = useCallback(
    async ({ text, type = 'text' }: SendMessageParams): Promise<void> => {
      if (!user || !chatId || !text.trim()) return;

      try {
        const message: Omit<Message, 'msgId'> = {
          senderId: user.uid,
          text: text.trim(),
          timestamp: Date.now(),
          type,
          read: false,
        };

        const chatRef = doc(db, CHATS_COLLECTION, chatId);
        const batch = writeBatch(db);

        batch.set(doc(collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION)), {
          ...message,
          createdAt: serverTimestamp(),
        });

        batch.update(chatRef, {
          lastMessage: text.trim(),
          lastTimestamp: message.timestamp,
          updatedAt: serverTimestamp(),
        });

        await batch.commit();
      } catch (err) {
        logger.error('useChat.sendMessage', err);
      }
    },
    [chatId, user],
  );

  const sendMessage = useCallback(
    (text: string) => send({ text, type: 'text' }),
    [send],
  );

  const sendQuickReply = useCallback(
    (text: string) => send({ text, type: 'quick_reply' }),
    [send],
  );

  return { messages, isLoading, sendMessage, sendQuickReply };
}
