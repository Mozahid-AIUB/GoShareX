// ============================================================
// Ride Chat Service — 'ride' mode (match হওয়া দুজন পরিচিত)
//
// Firebase chatService-এর ride-সম্পর্কিত অংশের Supabase সংস্করণ:
//   getOrCreateChat, sendMessage, confirmDeal, markRead, deleteChat
// (anonymous matching আলাদা ফাইলে — anonymousChatService.ts)
// ============================================================
import { supabase } from '@/config/supabase.config';
import { chatRepository, rowToChat } from './chatRepository';
import { MessageType, RIDE_CHAT_DURATION_MS } from './types';
import { logger } from '@/utils/logger';

class RideChatService {
  /**
   * match হওয়া দুজনের জন্য ride chat খোঁজে বা বানায়।
   * একই active pair-এর room থাকলে সেটাই ফেরত (ডুপ্লিকেট এড়ায়)।
   */
  async getOrCreateChat(
    user1Id: string,
    user1Name: string,
    user2Id: string,
    user2Name: string,
    destination: string,
    fare: number,
    rideId?: string,
  ): Promise<string> {
    const now = Date.now();

    // বিদ্যমান active ride chat খুঁজি (user1-এর সব ride chat থেকে pair মেলাই)
    const { data: existing } = await supabase
      .from('chats')
      .select('*')
      .eq('mode', 'ride')
      .contains('participants', [user1Id])
      .limit(10);

    for (const row of existing ?? []) {
      const c = rowToChat(row);
      const samePair = c.participants.includes(user2Id);
      const active = (c.expiresAt ?? 0) > now && !(c.closedAt && c.closedAt <= now);
      if (samePair && active) return c.id;
    }

    // নতুন ride chat বানাই
    const expiresAt = new Date(now + RIDE_CHAT_DURATION_MS).toISOString();
    const { data: created, error } = await supabase
      .from('chats')
      .insert({
        participants: [user1Id, user2Id],
        participant_names: { [user1Id]: user1Name, [user2Id]: user2Name },
        destination,
        fare,
        mode: 'ride',
        anonymous: false,
        ride_id: rideId ?? null,
        expires_at: expiresAt,
        deal_confirmed: { [user1Id]: false, [user2Id]: false },
        last_message: '',
        last_message_time: new Date(now).toISOString(),
      })
      .select('id')
      .single();

    if (error || !created) {
      logger.error('rideChat.getOrCreate', error);
      throw new Error('Could not start chat. Please try again.');
    }

    await chatRepository.insertSystemMessage(
      created.id,
      'Chat started. This conversation will auto-delete in 10 minutes.',
      user1Name,
    );
    return created.id;
  }

  async sendMessage(
    chatId: string,
    senderId: string,
    senderName: string,
    text: string,
    type: MessageType = 'text',
  ): Promise<void> {
    const clean = text.trim();
    if (!clean || clean.length > 1000) return;
    try {
      await chatRepository.insertMessage(chatId, senderId, senderName, clean, type);
      await chatRepository.updateChat(chatId, {
        lastMessage: clean,
        lastMessageTime: Date.now(),
      });
    } catch (e) {
      logger.error('rideChat.sendMessage', e);
      throw e;
    }
  }

  /** uid নিজের deal confirm করে। দুজনেই confirm করলে system message। */
  async confirmDeal(chatId: string, userId: string, userName: string): Promise<void> {
    const chat = await chatRepository.getChat(chatId);
    if (!chat) return;
    const deal = { ...(chat.dealConfirmed ?? {}), [userId]: true };
    await chatRepository.updateChat(chatId, { dealConfirmed: deal });

    const allConfirmed =
      chat.participants.length > 0 && chat.participants.every((p) => deal[p]);
    if (allConfirmed) {
      await chatRepository.insertSystemMessage(
        chatId,
        '✅ Both riders confirmed the deal. Have a safe trip!',
        userName,
      );
    } else {
      await chatRepository.insertSystemMessage(
        chatId,
        `${userName} confirmed the deal.`,
        userName,
      );
    }
  }

  /** এই user-এর জন্য সব message read mark (অন্যের পাঠানো)। */
  async markRead(chatId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('chat_id', chatId)
        .eq('read', false)
        .neq('sender_id', userId);

      // read receipt: lastRead আপডেট
      const chat = await chatRepository.getChat(chatId);
      if (chat) {
        const lastRead = { ...(chat.lastRead ?? {}), [userId]: Date.now() };
        await chatRepository.updateChat(chatId, { lastRead });
      }
    } catch (e) {
      logger.warn('rideChat.markRead', e);
    }
  }

  /** chat বন্ধ (expire মার্ক — পরে cleanup function ডেটা মুছবে)। */
  async deleteChat(chatId: string): Promise<void> {
    try {
      await chatRepository.updateChat(chatId, {
        expiresAt: Date.now(),
        closedAt: Date.now(),
        searching: false,
      });
    } catch (e) {
      logger.warn('rideChat.deleteChat', e);
    }
  }
}

export const rideChatService = new RideChatService();
