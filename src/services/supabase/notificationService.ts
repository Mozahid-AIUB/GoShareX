// ============================================================
// Supabase Notification Service
//
// Firebase Firestore `notifications` collection -> Supabase notifications
// টেবিল + Realtime। HomeScreen যে ৩টা কাজ করে তার সমতুল্য:
//   subscribeToNotifications — প্রাপকের notification live (recent 50)
//   markRead                 — একটা notification read করা
//   markAllRead              — সব read করা
//
// Supabase কলাম snake_case; AppNotification (camelCase, createdAt = ms) এ map।
// ============================================================
import { supabase } from '@/config/supabase.config';
import { logger } from '@/utils/logger';
import type { AppNotification } from '@/screens/home/utils/homeHelpers';

const RECENT_LIMIT = 50;

// notifications row -> AppNotification (HomeScreen যে shape আশা করে)
function rowToNotification(row: any): AppNotification {
  return {
    id: row.id,
    type: row.type ?? '',
    message: row.message ?? undefined,
    read: !!row.read,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
    toUserId: row.to_user_id ?? undefined,
  };
}

class SupabaseNotificationService {
  /**
   * প্রাপকের notification live শোনে (recent 50, নতুন আগে)।
   * Firebase onSnapshot এর সমতুল্য — unsubscribe function ফেরত।
   */
  subscribeToNotifications(
    uid: string,
    onUpdate: (items: AppNotification[]) => void,
  ): () => void {
    const load = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('to_user_id', uid)
        .order('created_at', { ascending: false })
        .limit(RECENT_LIMIT);
      if (error) {
        logger.warn('notif.subscribe.load', error.message);
        return;
      }
      onUpdate((data ?? []).map(rowToNotification));
    };
    void load();

    // real-time: এই ইউজারের notification-এ পরিবর্তন হলে আবার লোড করি।
    const channel = supabase
      .channel(`notifications_${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `to_user_id=eq.${uid}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /** একটা notification read করা (RLS: শুধু প্রাপক পারে)। */
  async markRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) logger.warn('notif.markRead', error.message);
  }

  /** প্রাপকের সব unread notification read করা (এক query-তে)। */
  async markAllRead(uid: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('to_user_id', uid)
      .eq('read', false);
    if (error) logger.warn('notif.markAllRead', error.message);
  }
}

export const supabaseNotificationService = new SupabaseNotificationService();
