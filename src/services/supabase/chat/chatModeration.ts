// ============================================================
// Chat Moderation — leave, block, delete-own-message
//
// Firebase: users/{uid}/blocked subcollection -> Supabase blocked_aliases টেবিল
// (0008-এ বানানো হবে)। leave: mode অনুযায়ী room বন্ধ/membership সরানো।
// ============================================================
import { supabase } from '@/config/supabase.config';
import { chatRepository } from './chatRepository';
import { ANON_GROUP_MAX_PARTICIPANTS } from './types';
import { logger } from '@/utils/logger';

class ChatModeration {
  /**
   * user স্বেচ্ছায় chat ছাড়ে।
   * - 1v1/ride: room বন্ধ (অন্যজন auto-dismiss হবে)
   * - group: membership সরানো; শেষ জন হলে room বন্ধ
   */
  async leaveChat(chatId: string, userId: string): Promise<void> {
    const chat = await chatRepository.getChat(chatId);
    if (!chat) return;
    const remaining = chat.participants.filter((p) => p !== userId);

    // 1v1 বা ride: leave = room বন্ধ
    if (chat.mode === 'anonymous_1v1' || chat.mode === 'ride') {
      await chatRepository.updateChat(chatId, {
        expiresAt: Date.now(),
        closedAt: Date.now(),
        closedBy: userId,
        searching: false,
        lastMessageTime: Date.now(),
      });
      return;
    }

    // group: শেষ জন হলে বন্ধ
    if (remaining.length === 0) {
      await chatRepository.updateChat(chatId, {
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

    // group: শুধু এই member সরানো
    const aliases = { ...(chat.participantAliases ?? {}) };
    delete aliases[userId];
    await chatRepository.updateChat(chatId, {
      participants: remaining,
      participantAliases: aliases,
      participantNames: aliases,
      searching: remaining.length < ANON_GROUP_MAX_PARTICIPANTS,
      lastMessageTime: Date.now(),
    });
  }

  /**
   * block: এই user অন্য একজন (alias) কে block করে। তাদের message
   * client-side hide হবে, আর নতুন anonymous match-এ আসবে না।
   * ride chat-এ no-op (পরিচিত partner — report flow আলাদা)।
   */
  async blockUser(blockerId: string, blockedAlias: string, chatId: string): Promise<void> {
    const { error } = await supabase.from('blocked_aliases').upsert({
      blocker_id: blockerId,
      chat_id: chatId,
      blocked_alias: blockedAlias,
    });
    if (error) {
      logger.warn('chatModeration.blockUser', error);
      throw new Error('Could not block user.');
    }
  }

  /** এই user যাদের block করেছে তাদের {chatId, alias} তালিকা (client-side filter)। */
  async getBlockedAliases(userId: string): Promise<Array<{ chatId: string; alias: string }>> {
    const { data } = await supabase
      .from('blocked_aliases')
      .select('chat_id, blocked_alias')
      .eq('blocker_id', userId);
    return (data ?? []).map((r: any) => ({ chatId: r.chat_id, alias: r.blocked_alias }));
  }

  /**
   * নিজের message ৬০ সেকেন্ডের মধ্যে soft-delete ([deleted] দিয়ে replace)।
   * পুরো মুছি না — order + read receipt অক্ষত থাকে।
   */
  async deleteOwnMessage(chatId: string, messageId: string, userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('messages')
      .select('sender_id, created_at')
      .eq('id', messageId)
      .single();
    if (error || !data) throw new Error('Message not found');
    if (data.sender_id !== userId) throw new Error('Not the sender');
    const age = Date.now() - new Date(data.created_at).getTime();
    if (age > 60 * 1000) throw new Error('Too late to delete (60s limit)');

    const { error: updErr } = await supabase
      .from('messages')
      .update({ text: '[deleted]' })
      .eq('id', messageId);
    if (updErr) throw updErr;
  }
}

export const chatModeration = new ChatModeration();
