import { useCallback, useEffect, useRef, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { Message, MessageType } from '@/types';
import { useAuthStore } from '@/store';
import { logger } from '@/utils/logger';

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

    const query = firestore()
      .collection(CHATS_COLLECTION)
      .doc(chatId)
      .collection(MESSAGES_SUBCOLLECTION)
      .orderBy('timestamp', 'asc');

    unsubscribeRef.current = query.onSnapshot(
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
          const batch = firestore().batch();
          unread.forEach((doc) => batch.update(doc.ref, { read: true }));
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

        const chatRef = firestore()
          .collection(CHATS_COLLECTION)
          .doc(chatId);

        const batch = firestore().batch();

        // Add message to subcollection
        batch.set(chatRef.collection(MESSAGES_SUBCOLLECTION).doc(), message);

        // Update chat metadata
        batch.update(chatRef, {
          lastMessage: text.trim(),
          lastTimestamp: message.timestamp,
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
