-- ============================================================
-- ধাপ ৫ (chat): Anonymous matching — atomic, secure RPC
--
-- কেন RPC (database function), client না?
--   Firebase-এ matching হতো client runTransaction দিয়ে। Supabase-এ
--   একাধিক client একসাথে একই waiting room-এ join করতে চাইলে race
--   condition হবে (দুজন একই 1v1 room-এ ঢুকে যাবে)। সমাধান: matching
--   logic database-এর ভেতরে, row-level lock (FOR UPDATE SKIP LOCKED)
--   দিয়ে — একসময় শুধু একজনই একটা waiting room lock করতে পারে।
--   এটাই concurrency-safe matching-এর industry standard।
--
-- security definer: RLS বাইপাস করে atomic কাজ করে; client শুধু
--   supabase.rpc('...') ডাকতে পারে, সরাসরি table হ্যাক করতে পারে না।
-- ============================================================

-- alias helper: position অনুযায়ী "Anonymous N"
create or replace function public.anon_alias(pos int)
returns text language sql immutable as $$
  select 'Anonymous ' || pos::text;
$$;

-- ------------------------------------------------------------
-- 1v1 matching: একটা waiting 1v1 room-এ join, নাহলে নতুন বানাও
-- ফেরত: chat_id (uuid)
-- ------------------------------------------------------------
create or replace function public.match_anonymous_1v1(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room    public.chats%rowtype;
  v_chat_id uuid;
  v_aliases jsonb;
begin
  -- 1) একটা waiting room atomic ভাবে lock করি (অন্য কেউ ধরতে পারবে না)
  select * into v_room
  from public.chats
  where mode = 'anonymous_1v1'
    and searching = true
    and (expires_at is null or expires_at > now())
    and array_length(participants, 1) = 1
    and not (p_user = any(participants))
  order by created_at asc
  limit 1
  for update skip locked;          -- ← concurrency-safe lock

  if found then
    -- 2) এই room-এ আমি join করি (২য় participant)
    v_aliases := coalesce(v_room.participant_aliases, '{}'::jsonb)
                 || jsonb_build_object(p_user::text, public.anon_alias(2));
    update public.chats
    set participants        = participants || p_user,
        participant_aliases = v_aliases,
        participant_names   = v_aliases,
        searching           = false,
        last_message_time   = now()
    where id = v_room.id;

    insert into public.messages (chat_id, sender_id, sender_name, text, type, read)
    values (v_room.id, null, public.anon_alias(2),
            'Another anonymous user joined. Chat auto-deletes in 5 minutes.', 'system', false);

    return v_room.id;
  end if;

  -- 3) কোনো waiting room নেই — নিজে একটা বানাই (waiting)
  v_aliases := jsonb_build_object(p_user::text, public.anon_alias(1));
  insert into public.chats
    (participants, participant_names, participant_aliases, destination, fare,
     mode, anonymous, searching, min_participants, max_participants,
     expires_at, deal_confirmed, last_message, last_message_time)
  values
    (array[p_user], v_aliases, v_aliases, 'Anonymous 1:1', 0,
     'anonymous_1v1', true, true, 2, 2,
     now() + interval '5 minutes', '{}'::jsonb, '', now())
  returning id into v_chat_id;

  insert into public.messages (chat_id, sender_id, sender_name, text, type, read)
  values (v_chat_id, null, public.anon_alias(1),
          'Anonymous room created. Waiting for another person. Auto-deletes in 5 minutes.', 'system', false);

  return v_chat_id;
end;
$$;

-- ------------------------------------------------------------
-- group matching: একটা open group room-এ join, নাহলে নতুন বানাও
-- ------------------------------------------------------------
create or replace function public.match_anonymous_group(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room    public.chats%rowtype;
  v_chat_id uuid;
  v_aliases jsonb;
  v_count   int;
begin
  select * into v_room
  from public.chats
  where mode = 'anonymous_group'
    and searching = true
    and (expires_at is null or expires_at > now())
    and array_length(participants, 1) < 10
    and not (p_user = any(participants))
  order by created_at asc
  limit 1
  for update skip locked;

  if found then
    v_count := coalesce(array_length(v_room.participants, 1), 0) + 1;
    v_aliases := coalesce(v_room.participant_aliases, '{}'::jsonb)
                 || jsonb_build_object(p_user::text, public.anon_alias(v_count));
    update public.chats
    set participants        = participants || p_user,
        participant_aliases = v_aliases,
        participant_names   = v_aliases,
        searching           = (v_count < 10),
        last_message_time   = now()
    where id = v_room.id;

    insert into public.messages (chat_id, sender_id, sender_name, text, type, read)
    values (v_room.id, null, public.anon_alias(v_count),
            'A new anonymous member joined the group.', 'system', false);

    return v_room.id;
  end if;

  -- নতুন group বানাই
  v_aliases := jsonb_build_object(p_user::text, public.anon_alias(1));
  insert into public.chats
    (participants, participant_names, participant_aliases, destination, fare,
     mode, anonymous, searching, min_participants, max_participants,
     expires_at, deal_confirmed, last_message, last_message_time)
  values
    (array[p_user], v_aliases, v_aliases, 'Anonymous Group', 0,
     'anonymous_group', true, true, 2, 10,
     now() + interval '10 minutes', '{}'::jsonb, '', now())
  returning id into v_chat_id;

  insert into public.messages (chat_id, sender_id, sender_name, text, type, read)
  values (v_chat_id, null, public.anon_alias(1),
          'Anonymous group created. Auto-deletes in 10 minutes.', 'system', false);

  return v_chat_id;
end;
$$;

-- ------------------------------------------------------------
-- নির্দিষ্ট group room-এ join (তালিকা থেকে বেছে)
-- ------------------------------------------------------------
create or replace function public.join_group_by_id(p_chat_id uuid, p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room    public.chats%rowtype;
  v_aliases jsonb;
  v_count   int;
begin
  select * into v_room from public.chats
  where id = p_chat_id and mode = 'anonymous_group'
  for update;

  if not found then return null; end if;
  if (v_room.expires_at is not null and v_room.expires_at <= now())
     or array_length(v_room.participants, 1) >= 10
     or p_user = any(v_room.participants) then
    return null;
  end if;

  v_count := coalesce(array_length(v_room.participants, 1), 0) + 1;
  v_aliases := coalesce(v_room.participant_aliases, '{}'::jsonb)
               || jsonb_build_object(p_user::text, public.anon_alias(v_count));
  update public.chats
  set participants = participants || p_user,
      participant_aliases = v_aliases,
      participant_names = v_aliases,
      searching = (v_count < 10),
      last_message_time = now()
  where id = p_chat_id;

  insert into public.messages (chat_id, sender_id, sender_name, text, type, read)
  values (p_chat_id, null, public.anon_alias(v_count),
          'A new anonymous member joined the group.', 'system', false);

  return p_chat_id;
end;
$$;

-- client (authenticated) শুধু এই function গুলো execute করতে পারবে
grant execute on function public.match_anonymous_1v1(uuid)   to authenticated;
grant execute on function public.match_anonymous_group(uuid) to authenticated;
grant execute on function public.join_group_by_id(uuid, uuid) to authenticated;
