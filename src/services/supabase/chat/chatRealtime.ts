// ============================================================
// Chat Realtime — live subscriptions + typing + read receipts
//
// Firebase onSnapshot -> Supabase channel().on('postgres_changes')।
// listenToMessages/listenToChat একই signature (unsubscribe ফেরত)।
// ============================================================
import { supabase } from '@/config/supabase.config';
import { chatRepository, rowToChat, rowToMessage } from './chatRepository';
import { ChatMessage, ChatRoom } from './types';
import { logger } from '@/utils/logger';

class ChatRealtime {
  /**
   * একটা chat-এর সব message live শোনে। প্রথমে initial load, তারপর
   * INSERT/UPDATE event-এ তালিকা আপডেট। unsubscribe function ফেরত।
   */
  listenToMessages(
    chatId: string,
    callback: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    let current: ChatMessage[] = [];

    chatRepository
      .getMessages(chatId)
      .then((msgs) => {
        current = msgs;
        callback(current);
      })
      .catch((e) => onError?.(e as Error));

    const channel = supabase
      .channel(`msgs:${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const m = rowToMessage(payload.new);
          if (current.some((x) => x.id === m.id)) return; // dedupe
          current = [...current, m];
          callback(current);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const m = rowToMessage(payload.new);
          current = current.map((x) => (x.id === m.id ? m : x));
          callback(current);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * একটা chat row-এর পরিবর্তন live শোনে (typing, lastRead, deal, participants,
   * close ইত্যাদি)। প্রথমে initial, তারপর UPDATE event।
   */
  listenToChat(
    chatId: string,
    callback: (chat: ChatRoom) => void,
    onError?: (error: Error) => void,
  ): () => void {
    chatRepository
      .getChat(chatId)
      .then((c) => {
        if (c) callback(c);
        else onError?.(new Error('chat-not-found'));
      })
      .catch((e) => onError?.(e as Error));

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chats', filter: `id=eq.${chatId}` },
        (payload) => callback(rowToChat(payload.new)),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // -------- typing indicator --------
  async setTyping(chatId: string, userId: string, alias: string): Promise<void> {
    const chat = await chatRepository.getChat(chatId);
    if (!chat) return;
    const typing = { ...(chat.typing ?? {}), [userId]: { alias, at: Date.now() } };
    await chatRepository.updateChat(chatId, { typing }).catch((e) =>
      logger.warn('chatRealtime.setTyping', e),
    );
  }

  async clearTyping(chatId: string, userId: string): Promise<void> {
    const chat = await chatRepository.getChat(chatId);
    if (!chat) return;
    const typing = { ...(chat.typing ?? {}), [userId]: null };
    await chatRepository.updateChat(chatId, { typing }).catch((e) =>
      logger.warn('chatRealtime.clearTyping', e),
    );
  }

  // -------- read receipt --------
  async markRead(chatId: string, userId: string): Promise<void> {
    const chat = await chatRepository.getChat(chatId);
    if (!chat) return;
    const lastRead = { ...(chat.lastRead ?? {}), [userId]: Date.now() };
    await Promise.all([
      chatRepository.updateChat(chatId, { lastRead }),
      supabase
        .from('messages')
        .update({ read: true })
        .eq('chat_id', chatId)
        .eq('read', false)
        .neq('sender_id', userId),
    ]).catch((e) => logger.warn('chatRealtime.markRead', e));
  }
}

export const chatRealtime = new ChatRealtime();
