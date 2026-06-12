-- ============================================================
-- Request system — edge case গুলো শেষ করা:
--   ১) 30s timeout — pending request accept না হলে auto-expire
--   ২) chat বন্ধ/expired হলে reserved দুজনকে free (ghost user আটকে না থাকে)
-- ============================================================

create extension if not exists pg_cron;

-- ── ১) 30s timeout: পুরনো pending request expire ──
-- প্রতি ৩০s চলে; ৩০s-এর বেশি পুরনো pending → expired।
-- (accept না করলে A আর আটকে থাকবে না, পরেরজনকে পাঠাতে পারবে।)
create or replace function public.expire_stale_ride_requests()
returns void
language sql
security definer
set search_path = public
as $$
  update public.ride_requests
  set status = 'expired', responded_at = now()
  where status = 'pending'
    and created_at < now() - interval '30 seconds';
$$;

do $$
begin
  perform cron.unschedule('expire-ride-requests');
exception when others then null;
end $$;

select cron.schedule(
  'expire-ride-requests',
  '15 seconds',   -- প্রতি ১৫s চেক (৩০s সীমা দ্রুত ধরতে)
  $$ select public.expire_stale_ride_requests(); $$
);

-- ── ২) chat close/expire হলে reserved দুজনকে free ──
-- কেউ accept করে reserved হলো কিন্তু chat ঘোস্ট করল (ride confirm/cancel
-- করল না) → chats.closed_at সেট হলে (leaveChat/expire) ওই ride chat-এর
-- participants যারা এখনো reserved (in_ride না) তাদের free করি।
create or replace function public.release_on_chat_close()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- শুধু ride chat, আর যখন প্রথমবার closed_at সেট হলো
  if new.mode = 'ride'
     and new.closed_at is not null
     and (old.closed_at is null)
  then
    update public.users
    set ride_status = 'free'
    where id = any(new.participants)
      and ride_status = 'reserved';   -- in_ride (deal হয়ে গেছে) বাদ
  end if;
  return new;
end;
$$;

drop trigger if exists trg_release_on_chat_close on public.chats;
create trigger trg_release_on_chat_close
  after update on public.chats
  for each row
  execute function public.release_on_chat_close();
