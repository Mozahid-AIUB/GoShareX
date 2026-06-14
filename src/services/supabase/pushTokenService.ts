/**
 * pushTokenService — device-এর Expo push token Supabase users টেবিলে রাখে।
 *
 * token = user-কে notification পাঠানোর "ঠিকানা"। শুধু নিজের row-তে লেখা যায়
 * (RLS: auth.uid() = id)। token না থাকলে server কখনো push পাঠাতে পারে না, তাই
 * এটা push system-এর ভিত্তি। migration 0029 push_token column যোগ করে।
 */

import { supabase } from '@/config/supabase.config';
import { logger } from '@/utils/logger';

/** নিজের push token Supabase-এ save/আপডেট করি (login-এর পর + token বদলালে)। */
export async function saveMyPushToken(token: string): Promise<void> {
  if (!token) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // logged-in না হলে save করার মানে নেই।
    const { error } = await supabase
      .from('users')
      .update({ push_token: token, push_token_updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) {
      logger.warn('pushTokenService.save', error.message);
    } else {
      logger.info('pushTokenService', 'Push token saved to Supabase');
    }
  } catch (err) {
    logger.warn('pushTokenService.save', String((err as Error)?.message ?? err));
  }
}
