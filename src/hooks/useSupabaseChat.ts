import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/config/supabase.config';
import { Message, MessageType } from '@/types';
import { useAuthStore } from '@/store';
import { logger } from '@/utils/logger';

// firebase useChat-এর Supabase যমজ — একই interface।
// real-time: supabase.channel().on('postgres_changes')
// messages টেবিল (chat_id দিয়ে, ধাপ ১-এ বানানো)।

interface UseChatResult {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  sendQuickReply: (text: string) => Promise<void>;
}

// DB row (snake_case) -> অ্যাপের Message (camelCase)
function rowToMessage(row: any): Message {
  return {
    msgId: row.id,
    senderId: row.sender_id,
    text: row.text,
    timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    type: (row.type ?? 'text') as MessageType,
    read: Boolean(row.read),
  };
}

export function useSupabaseChat(chatId: string): UseChatResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    if (!chatId) return;
    setIsLoading(true);
    let cancelled = false;

    // অন্য participant-এর unread message read mark করা
    const markRead = async () => {
      if (!user) return;
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('chat_id', chatId)
        .eq('read', false)
        .neq('sender_id', user.uid)
        .then(({ error }) => {
          if (error) logger.warn('useSupabaseChat.markRead', error.message);
        });
    };

    // 1) প্রথমে এখনকার সব message একবার লোড করি (initial fetch)
    const loadInitial = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (cancelled) return;
      if (error) {
        logger.error('useSupabaseChat.load', error);
        setIsLoading(false);
        return;
      }
      const list = (data ?? []).map(rowToMessage);
      messagesRef.current = list;
      setMessages(list);
      setIsLoading(false);
      void markRead();
    };
    void loadInitial();

    // 2) এই chat-এর নতুন/আপডেট হওয়া message real-time-এ শুনি
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const msg = rowToMessage(payload.new);
          // ডুপ্লিকেট এড়াই (নিজের পাঠানো message-ও INSERT event দেয়)
          if (messagesRef.current.some((m) => m.msgId === msg.msgId)) return;
          messagesRef.current = [...messagesRef.current, msg];
          setMessages(messagesRef.current);
          // আমার নয় এমন নতুন message এলে read mark
          if (user && msg.senderId !== user.uid) void markRead();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const updated = rowToMessage(payload.new);
          messagesRef.current = messagesRef.current.map((m) =>
            m.msgId === updated.msgId ? updated : m,
          );
          setMessages(messagesRef.current);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [chatId, user]);

  const send = useCallback(
    async (text: string, type: MessageType = 'text'): Promise<void> => {
      if (!user || !chatId || !text.trim()) return;
      try {
        // 1) message insert
        const { error: msgErr } = await supabase.from('messages').insert({
          chat_id: chatId,
          sender_id: user.uid,
          text: text.trim(),
          type,
          read: false,
        });
        if (msgErr) throw msgErr;

        // 2) chat-এর updated_at রিফ্রেশ (তালিকায় উপরে আনতে)
        await supabase
          .from('chats')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', chatId);
      } catch (err) {
        logger.error('useSupabaseChat.send', err);
      }
    },
    [chatId, user],
  );

  const sendMessage = useCallback((text: string) => send(text, 'text'), [send]);
  const sendQuickReply = useCallback((text: string) => send(text, 'quick_reply'), [send]);

  return { messages, isLoading, sendMessage, sendQuickReply };
}
