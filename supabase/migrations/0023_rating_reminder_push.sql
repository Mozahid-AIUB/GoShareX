-- ============================================================
-- Rating reminder push notification system
--
-- Ride complete হলে → 1 hour পর → push দিয়ে rating reminder পাঠাই
-- User rating submit করলে auto mark as "rated"
-- ============================================================

-- ১) ride_complete_ratings table — কে rate করেনি তার track
create table if not exists public.ride_complete_ratings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null,
  ratee_id uuid not null references public.users(id) on delete cascade,
  rater_id uuid not null references public.users(id) on delete cascade,
  ratee_name text not null,
  rater_name text not null,
  rated boolean not null default false,
  reminder_sent boolean not null default false,
  reminder_sent_at timestamp with time zone,
  completed_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_ride_complete_ratings_ride on public.ride_complete_ratings(ride_id);
create index if not exists idx_ride_complete_ratings_ratee on public.ride_complete_ratings(ratee_id);
create index if not exists idx_ride_complete_ratings_pending on public.ride_complete_ratings(rated, reminder_sent)
  where not rated and not reminder_sent;

-- ২) RLS: users শুধু নিজের rating status দেখতে পারবে
alter table public.ride_complete_ratings enable row level security;

create policy "users_view_own_ratings" on public.ride_complete_ratings
  for select using (auth.uid() = rater_id or auth.uid() = ratee_id);

-- ৩) RideCompleteScreen থেকে call: ride complete mark করবো
create or replace function public.mark_ride_completed(
  p_ride_id uuid,
  p_ratee_id uuid,
  p_ratee_name text,
  p_rater_id uuid,
  p_rater_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.ride_complete_ratings (
    ride_id, ratee_id, rater_id, ratee_name, rater_name
  ) values (p_ride_id, p_ratee_id, p_rater_id, p_ratee_name, p_rater_name)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.mark_ride_completed(uuid, uuid, text, uuid, text) from public;
grant execute on function public.mark_ride_completed(uuid, uuid, text, uuid, text) to authenticated;

-- ४) submitRating-এ trigger: যখন rating submit হয় → marked as rated
create or replace function public.mark_rating_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ride_complete_ratings
  set rated = true
  where ride_id = new.ride_id
    and rater_id = new.rater_id
    and not rated;
  return new;
end;
$$;

drop trigger if exists trg_mark_rating_submitted on public.ratings;
create trigger trg_mark_rating_submitted
  after insert on public.ratings
  for each row
  execute function public.mark_rating_submitted();

-- ५) pg_cron: প্রতি ৫ মিনিট — pending ratings যাদের ১ hour+ হয়েছে তাদের reminder সেট
create or replace function public.queue_rating_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ride_complete_ratings
  set reminder_sent = true
  where not rated
    and not reminder_sent
    and completed_at < now() - interval '1 hour';
end;
$$;

do $$
begin
  perform cron.unschedule('queue-rating-reminders');
exception when others then null;
end $$;

-- cron format: '*/5 * * * *' = every 5 minutes
select cron.schedule(
  'queue-rating-reminders',
  '*/5 * * * *',
  $$ select public.queue_rating_reminders(); $$
);

-- ६) pg_cron: প্রতি ৩০s call করবে Edge Function যা reminders পাঠায়
-- (Edge Function deploy করতে হবে manually: supabase functions deploy send-rating-reminders)
create or replace function public.trigger_send_rating_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_function_url text;
  v_response jsonb;
begin
  -- Edge Function URL: https://<project-id>.supabase.co/functions/v1/send-rating-reminders
  -- (আপাতত placeholder; production-এ actual URL set করতে হবে)
  v_function_url := 'https://' || (select split_part(split_part(current_database(), '-', 1), '_', 1)) ||
                    '.supabase.co/functions/v1/send-rating-reminders';

  -- HTTP POST call via pg_http (if available)
  -- For now: just logging সেট করা যায়, actual implementation deploy-এর সময় করতে হবে
  raise notice 'Would trigger Edge Function at: %', v_function_url;
end;
$$;

do $$
begin
  perform cron.unschedule('trigger-send-rating-reminders');
exception when others then null;
end $$;

-- Trigger Edge Function every 30s to send pending reminders
-- cron format limitation: minimum 1 minute, so use */1 * * * * (every minute) instead
-- Note: Edge Function must be deployed first
select cron.schedule(
  'trigger-send-rating-reminders',
  '* * * * *',
  $$ select public.trigger_send_rating_reminders(); $$
);
