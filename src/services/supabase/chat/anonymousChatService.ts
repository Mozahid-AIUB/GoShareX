// ============================================================
// Anonymous Chat Service — random 1v1 + group
//
// matching logic database RPC-তে (atomic/secure)। এই client service
// শুধু RPC ডাকে + cleanup। logic database-এ থাকায় race condition নেই।
// ============================================================
import { supabase } from '@/config/supabase.config';
import { rideChatService } from './rideChatService';
import { logger } from '@/utils/logger';

class AnonymousChatService {
  /** random 1v1: waiting room-এ join বা নতুন বানায় (RPC, atomic)। */
  async startAnonymousOneToOne(userId: string): Promise<string> {
    const { data, error } = await supabase.rpc('match_anonymous_1v1', { p_user: userId });
    if (error || !data) {
      logger.error('anonChat.start1v1', error);
      throw new Error('Could not start anonymous chat. Please try again.');
    }
    return data as string;
  }

  /** random group: open group-এ join বা নতুন বানায় (RPC, atomic)। */
  async startAnonymousGroup(userId: string): Promise<string> {
    const { data, error } = await supabase.rpc('match_anonymous_group', { p_user: userId });
    if (error || !data) {
      logger.error('anonChat.startGroup', error);
      throw new Error('Could not start group chat. Please try again.');
    }
    return data as string;
  }

  /** নির্দিষ্ট group room-এ join (তালিকা থেকে বেছে)। */
  async joinGroupById(chatId: string, userId: string): Promise<string> {
    const { data, error } = await supabase.rpc('join_group_by_id', {
      p_chat_id: chatId,
      p_user: userId,
    });
    if (error || !data) throw new Error('Room full or expired');
    return data as string;
  }

  /**
   * user-এর active anonymous room খোঁজে।
   * preferredMode দিলে সেই mode-এর room prefer; অন্য mode হলে null
   * (যাতে 1v1 খুঁজতে গিয়ে পুরনো group-এ redirect না হয়)।
   * একই mode-এর ডুপ্লিকেট room বন্ধ করে।
   */
  async cleanupDuplicateAnonymousRooms(
    userId: string,
    preferredMode?: 'anonymous_1v1' | 'anonymous_group',
  ): Promise<{ chatId: string; mode: 'anonymous_1v1' | 'anonymous_group' } | null> {
    const { data } = await supabase
      .from('chats')
      .select('*')
      .eq('anonymous', true)
      .contains('participants', [userId])
      .limit(20);

    const now = Date.now();
    const active = (data ?? [])
      .filter((r: any) => {
        const exp = r.expires_at ? new Date(r.expires_at).getTime() : 0;
        return exp > now && (r.mode === 'anonymous_1v1' || r.mode === 'anonymous_group');
      })
      .sort((a: any, b: any) => {
        const at = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
        const bt = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
        return bt - at;
      });

    // একই mode-এর ডুপ্লিকেট বন্ধ (সবচেয়ে recent রাখি)
    const seen = new Set<string>();
    const dups: any[] = [];
    for (const r of active) {
      if (seen.has(r.mode)) dups.push(r);
      else seen.add(r.mode);
    }
    await Promise.all(dups.map((r) => rideChatService.deleteChat(r.id)));

    // কোনটা ফেরত দেব: preferredMode থাকলে সেটা, নাহলে recent
    let keep = active.find((r: any) => r.mode === preferredMode) ?? active[0];
    if (preferredMode && keep && keep.mode !== preferredMode) keep = undefined;
    return keep ? { chatId: keep.id, mode: keep.mode } : null;
  }

  /** এই user-এর solo waiting 1v1 room মুছে (একা অপেক্ষমাণ)। */
  async cleanupUserOrphanRooms(userId: string): Promise<void> {
    const { data } = await supabase
      .from('chats')
      .select('*')
      .contains('participants', [userId])
      .eq('searching', true)
      .eq('mode', 'anonymous_1v1')
      .limit(10);

    const solo = (data ?? []).filter(
      (r: any) => (r.participants?.length ?? 0) <= 1 && r.participants?.[0] === userId,
    );
    await Promise.all(solo.map((r: any) => rideChatService.deleteChat(r.id)));
  }
}

export const anonymousChatService = new AnonymousChatService();
