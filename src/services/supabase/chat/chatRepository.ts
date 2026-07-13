// ============================================================
// Chat Repository — শুধু database access (single responsibility)
//
// এই layer-এ কোনো business logic নেই — শুধু Supabase query +
// row<->object রূপান্তর। উপরের service গুলো (ride/anonymous) এটা ব্যবহার করে।
// একজন senior-এর pattern: data access আলাদা, logic আলাদা।
// ============================================================
import { supabase } from '@/config/supabase.config';
import { ChatRoom, ChatMessage, MessageType } from './types';
import { logger } from '@/utils/logger';

// epoch ms <-> timestamptz helpers
const toMs = (ts: string | null | undefined): number | undefined =>
  ts ? new Date(ts).getTime() : undefined;
const toIso = (ms: number | undefined): string | null =>
  ms ? new Date(ms).toISOString() : null;

// ------- row -> object -------
export function rowToChat(row: any): ChatRoom {
  return {
    id: row.id,
    participants: row.participants ?? [],
    participantNames: row.participant_names ?? {},
    participantAliases: row.participant_aliases ?? {},
    rideId: row.ride_id ?? null,
    destination: row.destination ?? '',
    fare: Number(row.fare ?? 0),
    mode: row.mode ?? 'ride',
    anonymous: Boolean(row.anonymous ?? false),
    expiresAt: toMs(row.expires_at),
    searching: Boolean(row.searching ?? false),
    minParticipants: row.min_participants ?? 2,
    maxParticipants: row.max_participants ?? 2,
    lastMessage: row.last_message ?? '',
    lastMessageTime: toMs(row.last_message_time),
    closedAt: toMs(row.closed_at),
    closedBy: row.closed_by ?? undefined,
    dealConfirmed: row.deal_confirmed ?? {},
    lastRead: row.last_read ?? {},
    typing: row.typing ?? {},
  };
}

export function rowToMessage(row: any): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id ?? null,
    senderName: row.sender_name ?? '',
    text: row.text ?? '',
    timestamp: toMs(row.created_at) ?? Date.now(),
    type: (row.type ?? 'text') as MessageType,
  };
}

class ChatRepository {
  // -------- chats --------
  async getChat(chatId: string): Promise<ChatRoom | null> {
    const { data, error } = await supabase.from('chats').select('*').eq('id', chatId).single();
    if (error || !data) return null;
    return rowToChat(data);
  }

  // partial update (camelCase patch -> snake_case)
  async updateChat(chatId: string, patch: Partial<ChatRoom>): Promise<void> {
    const row: Record<string, any> = {};
    if (patch.participants !== undefined) row.participants = patch.participants;
    if (patch.participantNames !== undefined) row.participant_names = patch.participantNames;
    if (patch.participantAliases !== undefined) row.participant_aliases = patch.participantAliases;
    if (patch.searching !== undefined) row.searching = patch.searching;
    if (patch.expiresAt !== undefined) row.expires_at = toIso(patch.expiresAt);
    if (patch.closedAt !== undefined) row.closed_at = toIso(patch.closedAt);
    if (patch.closedBy !== undefined) row.closed_by = patch.closedBy;
    if (patch.dealConfirmed !== undefined) row.deal_confirmed = patch.dealConfirmed;
    if (patch.lastRead !== undefined) row.last_read = patch.lastRead;
    if (patch.typing !== undefined) row.typing = patch.typing;
    if (patch.lastMessage !== undefined) row.last_message = patch.lastMessage;
    if (patch.lastMessageTime !== undefined) row.last_message_time = toIso(patch.lastMessageTime);
    row.updated_at = new Date().toISOString();

    const { error } = await supabase.from('chats').update(row).eq('id', chatId);
    if (error) throw error;
  }

  // user-এর chat তালিকা (তালিকা screen-এর জন্য)
  async getUserChats(userId: string): Promise<ChatRoom[]> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .contains('participants', [userId])
      .order('last_message_time', { ascending: false, nullsFirst: false });
    if (error || !data) return [];
    return data.map(rowToChat);
  }

  /**
   * এই user-এর কি অন্য কোনো ride chat-এ deal confirm করা আছে (এই chat ছাড়া),
   * যেটা এখনও active (expired/closed না)? business rule: একসময়ে একটাই active
   * ride-deal। থাকলে সেই chat-এর partner নাম ফেরত (alert-এ দেখাতে), নাহলে null।
   */
  async findOtherActiveConfirmedDeal(
    userId: string,
    exceptChatId: string,
  ): Promise<{ chatId: string; partnerName: string } | null> {
    const now = Date.now();
    const chats = await this.getUserChats(userId);
    for (const c of chats) {
      if (c.id === exceptChatId) continue;
      if (c.mode !== 'ride') continue;
      const iConfirmed = c.dealConfirmed?.[userId] === true;
      const active = (c.expiresAt ?? 0) > now && !(c.closedAt && c.closedAt <= now);
      if (iConfirmed && active) {
        const other = c.participants.find((p) => p !== userId);
        const partnerName = (other && c.participantNames?.[other]) || 'another rider';
        return { chatId: c.id, partnerName };
      }
    }
    return null;
  }

  // -------- messages --------
  async getMessages(chatId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map(rowToMessage);
  }

  async insertMessage(
    chatId: string,
    senderId: string | null,
    senderName: string,
    text: string,
    type: MessageType = 'text',
  ): Promise<void> {
    const { error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: senderId,
      sender_name: senderName,
      text,
      type,
      read: false,
    });
    if (error) throw error;
  }

  /**
   * system message — RPC দিয়ে (security definer)। সরাসরি insert করা যায় না
   * কারণ messages RLS চায় sender_id = auth.uid(), আর system message-এর
   * sender_id null (42501 হতো — এটাই "chat unavailable" এর root cause ছিল)।
   *
   * NON-FATAL: system message cosmetic — fail করলেও chat খোলা/deal confirm
   * ভাঙা চলবে না। তাই throw না করে শুধু warn।
   */
  async insertSystemMessage(chatId: string, text: string, alias: string): Promise<void> {
    const { error } = await supabase.rpc('insert_system_message', {
      p_chat_id: chatId,
      p_text: text,
      p_alias: alias,
    });
    if (error) logger.warn('chatRepo.systemMessage', error.message);
  }
}

export const chatRepository = new ChatRepository();
