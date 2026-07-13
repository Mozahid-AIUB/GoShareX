-- ============================================================
-- Push when app is closed (ধাপ D) — ride request / new message / post-
-- interest notification এলে receiver-এর ফোনে status bar push পাঠাই।
--
-- কীভাবে: প্রতিটা উৎস টেবিলে AFTER INSERT trigger pg_net (Postgres→HTTP)
-- দিয়ে send-push Edge Function-কে { to, title, body, data } POST করে।
-- Function receiver-এর push_token নিয়ে Expo Push API-তে পাঠায় — কোনো
-- FCM/Firebase secret লাগে না (Expo নিজে deliver করে)।
--
-- নিরাপত্তা: trigger server-side; Edge Function service_role-এ token পড়ে।
-- Expo token না থাকলে function চুপচাপ skip করে (crash নয়)।
--
-- পূর্বশর্ত: send-push Edge Function deploy করা থাকতে হবে।
-- project ref: bzaurdogjufztmcnnxes
-- ============================================================

create extension if not exists pg_net with schema extensions;

-- generic sender — যে কোনো trigger থেকে receiver-uid + title + body + data
-- দিয়ে Edge Function-এ POST করে (async, fire-and-forget)।
create or replace function public.send_push_to(
  p_to_user uuid,
  p_title   text,
  p_body    text,
  p_data    jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  fn_url text := 'https://bzaurdogjufztmcnnxes.supabase.co/functions/v1/send-push';
begin
  if p_to_user is null then return; end if;
  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'to_user_id', p_to_user,
      'title',      p_title,
      'body',       p_body,
      'data',       p_data
    )
  );
end;
$$;

-- ── 1) notifications টেবিল (post interest ইত্যাদি) ──
create or replace function public.push_on_notification()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
begin
  perform public.send_push_to(
    new.to_user_id,
    coalesce(nullif(new.type, ''), 'GoShareX'),
    new.message,
    jsonb_build_object('type', new.type) || coalesce(new.data, '{}'::jsonb)
  );
  return new;
end; $$;

drop trigger if exists trg_push_on_notification on public.notifications;
create trigger trg_push_on_notification
  after insert on public.notifications
  for each row execute function public.push_on_notification();

-- ── 2) ride_requests টেবিল (someone wants to share a ride) ──
create or replace function public.push_on_ride_request()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
begin
  perform public.send_push_to(
    new.to_user,
    'New ride request 🚕',
    new.from_name || ' wants to share a ride to ' || new.destination,
    jsonb_build_object('type', 'ride_request', 'fromUser', new.from_user)
  );
  return new;
end; $$;

drop trigger if exists trg_push_on_ride_request on public.ride_requests;
create trigger trg_push_on_ride_request
  after insert on public.ride_requests
  for each row execute function public.push_on_ride_request();

-- ── 3) messages টেবিল (new chat message) ──
-- receiver = chat-এর participants-এর মধ্যে যে sender নয়।
create or replace function public.push_on_message()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
declare
  recipients uuid[];
  r uuid;
begin
  select participants into recipients from public.chats where id = new.chat_id;
  if recipients is null then return new; end if;
  foreach r in array recipients loop
    if r <> new.sender_id then
      perform public.send_push_to(
        r,
        'New message 💬',
        left(new.text, 120),
        jsonb_build_object('type', 'chat_message', 'chatId', new.chat_id)
      );
    end if;
  end loop;
  return new;
end; $$;

drop trigger if exists trg_push_on_message on public.messages;
create trigger trg_push_on_message
  after insert on public.messages
  for each row execute function public.push_on_message();
