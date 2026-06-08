// ============================================================
// Chat Repository — শুধু database access (single responsibility)
//
// এই layer-এ কোনো business logic নেই — শুধু Supabase query +
// row<->object রূপান্তর। উপরের service গুলো (ride/anonymous) এটা ব্যবহার করে।
// একজন senior-এর pattern: data access আলাদা, logic আলাদা।
// ============================================================
import { supabase } from '@/config/supabase.config';
import { ChatRoom, ChatMessage, MessageType } from './types';

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

  // system message — sender_id null
  async insertSystemMessage(chatId: string, text: string, alias: string): Promise<void> {
    await this.insertMessage(chatId, null, alias, text, 'system');
  }
}

export const chatRepository = new ChatRepository();
