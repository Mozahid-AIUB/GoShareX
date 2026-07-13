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

// প্রতিটা subscription-এর জন্য unique channel নাম — দ্রুত unmount→remount-এ
// একই নামের channel আবার subscribe করলে Supabase "callbacks after subscribe()"
// crash দেয়; unique suffix সেটা এড়ায়।
const uniq = (base: string) => `${base}:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
      .channel(uniq(`msgs:${chatId}`))
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
      .channel(uniq(`chat:${chatId}`))
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

  /**
   * ইউজারের সব chat তালিকা live শোনে (ChatListScreen-এর liveChats এর সমতুল্য)।
   * Firestore where('participants','array-contains',uid) → Supabase
   * .contains('participants',[uid])। chats টেবিলে যেকোনো পরিবর্তনে আবার লোড
   * করি (chat সংখ্যা কম, তাই সহজ ও নির্ভরযোগ্য)।
   */
  listenToUserChats(
    userId: string,
    callback: (chats: ChatRoom[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    const load = async () => {
      try {
        callback(await chatRepository.getUserChats(userId));
      } catch (e) {
        onError?.(e as Error);
      }
    };
    void load();

    const channel = supabase
      .channel(uniq(`user_chats:${userId}`))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => void load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * join করার মতো খোলা anonymous_group room live শোনে (ChatListScreen-এর
   * groupRooms এর সমতুল্য)। searching=true, expired না, পূর্ণ না, নিজে নেই।
   */
  listenToOpenGroupRooms(
    userId: string,
    callback: (rooms: ChatRoom[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    const load = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('mode', 'anonymous_group')
        .eq('searching', true)
        .limit(20);
      if (error) { onError?.(new Error(error.message)); return; }
      const now = Date.now();
      const rooms = (data ?? [])
        .map(rowToChat)
        .filter((r) =>
          !r.participants?.includes(userId) &&
          (r.expiresAt ?? 0) > now &&
          (r.participants?.length ?? 0) < (r.maxParticipants ?? 10),
        );
      callback(rooms);
    };
    void load();

    const channel = supabase
      .channel(uniq(`open_group_rooms:${userId}`))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => void load())
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
