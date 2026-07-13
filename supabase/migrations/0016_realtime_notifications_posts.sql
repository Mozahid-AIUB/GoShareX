-- ============================================================
-- ধাপ ৫+ : notifications + posts কে realtime publication-এ যোগ
--
-- 0005-এ messages/chats/active_riders/rides যোগ হয়েছিল, কিন্তু
-- notifications ও posts বাদ পড়েছিল। তাই HomeScreen-এর notification feed
-- ও PostBoard real-time আপডেট হয় না (নতুন এলে refresh ছাড়া দেখায় না)।
-- এই দুটো যোগ করলে postgres_changes subscription কাজ করবে।
--
-- idempotent: ইতিমধ্যে থাকলে error এড়াতে DO block-এ try করি।
-- ============================================================

do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then
    null;  -- ইতিমধ্যে আছে
  end;

  begin
    alter publication supabase_realtime add table public.posts;
  exception when duplicate_object then
    null;  -- ইতিমধ্যে আছে
  end;
end $$;
