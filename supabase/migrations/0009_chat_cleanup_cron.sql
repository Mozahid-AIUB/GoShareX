-- ============================================================
-- ধাপ ৫/৬ (chat): auto-delete expired chats — privacy
--
-- requirement: chat timeout (expires_at) পার হওয়ার ৫ মিনিট পর পুরো
-- room + সব message database থেকে মুছে যাবে (history থাকবে না)।
--
-- Firebase: cleanupAnonymousChats Cloud Function (প্রতি ৫ মিনিটে)।
-- Supabase: pg_cron — database-এর ভেতরেই scheduled job। কোনো আলাদা
-- server/VPS লাগে না।
--
-- timing: 1v1 = 5 min active, group/ride = 10 min active (expires_at-এ
-- সেট করা)। expires_at + 5 min পার হলে delete। messages টেবিলে
-- 'on delete cascade' আছে (chat মুছলে message-ও মুছবে)।
-- ============================================================

-- pg_cron extension (Supabase-এ available)
create extension if not exists pg_cron;

-- ------------------------------------------------------------
-- cleanup function: expired+grace chat মুছে
-- ------------------------------------------------------------
create or replace function public.cleanup_expired_chats()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_deleted integer;
begin
  -- expires_at-এর ৫ মিনিট পর পার হওয়া chat মুছি।
  -- messages টেবিল on delete cascade — তাই message-ও মুছবে।
  with del as (
    delete from public.chats
    where expires_at is not null
      and expires_at < (now() - interval '5 minutes')
    returning id
  )
  select count(*) into v_deleted from del;
  return v_deleted;
end;
$$;

-- ------------------------------------------------------------
-- cron: প্রতি ৫ মিনিটে cleanup চালাও
-- (আগের একই নামের job থাকলে আগে সরাই — idempotent)
-- ------------------------------------------------------------
do $$
begin
  perform cron.unschedule('cleanup-expired-chats');
exception when others then null;
end $$;

select cron.schedule(
  'cleanup-expired-chats',
  '*/5 * * * *',                       -- প্রতি ৫ মিনিটে
  $$ select public.cleanup_expired_chats(); $$
);
