-- ============================================================
-- Welcome email — user email confirm করার ঠিক ১০ মিনিট পর একটা soft,
-- friendly "Welcome to GoShareX" email পাঠায় (registration confirm email
-- থেকে আলাদা, যেটা সাথে সাথেই যায়)।
--
-- কীভাবে: auth.users-এ AFTER UPDATE trigger — email_confirmed_at
-- null → non-null হলে, একটা pending_welcome_emails সারিতে row বসায়
-- (send_at = now() + 10 minutes)। pg_cron প্রতি মিনিটে চেক করে যাদের
-- send_at পার হয়ে গেছে, তাদের জন্য send-welcome-email Edge Function
-- কল করে (pg_net দিয়ে, 0030-এর pattern অনুসরণ করে)।
--
-- পূর্বশর্ত: send-welcome-email Edge Function deploy করা থাকতে হবে।
-- project ref: bzaurdogjufztmcnnxes
-- ============================================================

create extension if not exists pg_cron with schema extensions;

-- ── queue টেবিল ──────────────────────────────────────────────
create table if not exists public.pending_welcome_emails (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text not null,
  name       text,
  send_at    timestamptz not null,
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pending_welcome_emails enable row level security;
-- শুধু service_role পড়তে/লিখতে পারবে — client কখনো এই টেবিল ছুঁবে না।

-- ── trigger: email_confirmed_at null → set হলে queue-তে বসাই ──
create or replace function public.queue_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    insert into public.pending_welcome_emails (user_id, email, name, send_at)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      now() + interval '10 minutes'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_email_confirmed on auth.users;
create trigger on_email_confirmed
  after update on auth.users
  for each row
  execute function public.queue_welcome_email();

-- ── cron: প্রতি মিনিটে due হওয়া email-গুলো পাঠায় ──────────────
create or replace function public.dispatch_due_welcome_emails()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  fn_url text := 'https://bzaurdogjufztmcnnxes.supabase.co/functions/v1/send-welcome-email';
  r record;
begin
  for r in
    select id, email, name
    from public.pending_welcome_emails
    where sent_at is null
      and send_at <= now()
    limit 25
  loop
    perform net.http_post(
      url     := fn_url,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := jsonb_build_object('id', r.id, 'email', r.email, 'name', r.name)
    );
    update public.pending_welcome_emails set sent_at = now() where id = r.id;
  end loop;
end;
$$;

select cron.schedule(
  'dispatch-welcome-emails',
  '* * * * *', -- প্রতি মিনিটে
  $$select public.dispatch_due_welcome_emails();$$
);
