-- ============================================================
-- Atomic ride-request system — state machine + race-safe accept।
--
-- প্রতি user-এর ride_status: free / reserved / in_ride।
--   free     = request পাঠাতে/পেতে পারে
--   reserved = একটা request accept হয়েছে, chat চলছে (deal pending)
--   in_ride  = deal confirmed, locked
--
-- concurrency: যত খুশি request আসুক (pending row); accept ATOMIC —
-- receiver free হলেই lock হয়, প্রথম accept জেতে, বাকি auto-expire।
-- (চ্যাট matching-এর FOR UPDATE প্যাটার্নের মতোই race-safe।)
-- ============================================================

-- ১) users-এ ride_status
alter table public.users
  add column if not exists ride_status text not null default 'free'
  check (ride_status in ('free', 'reserved', 'in_ride'));

-- ২) atomic accept RPC — B একটা request accept করে।
--    ভিতরে: B free তো? A free তো? দুজনকে atomic lock + chat তৈরি +
--    এই pair-এর বাকি pending request expire। সব এক transaction-এ।
--    ফেরত: chat_id (accept সফল হলে), নাহলে exception।
create or replace function public.accept_ride_request(
  p_request_id uuid,
  p_receiver_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req       public.ride_requests%rowtype;
  v_chat_id   uuid;
  v_a_status  text;
  v_b_status  text;
begin
  -- request লক করে নিই (concurrent accept আটকাতে)
  select * into v_req
  from public.ride_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'request not found';
  end if;

  -- শুধু receiver (to_user) accept করতে পারে
  if auth.uid() <> v_req.to_user then
    raise exception 'only the receiver can accept';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'request is no longer pending';
  end if;

  -- দুজনের status লক করে চেক — দুজনেই free হতে হবে
  select ride_status into v_b_status from public.users where id = v_req.to_user for update;
  select ride_status into v_a_status from public.users where id = v_req.from_user for update;

  if v_b_status <> 'free' then
    raise exception 'you are already in a ride';
  end if;
  if v_a_status <> 'free' then
    raise exception 'requester is no longer available';
  end if;

  -- chat তৈরি (ride mode) — নিজেই বানাই (getOrCreateChat-এর সমতুল্য)
  insert into public.chats (
    participants, participant_names, destination, fare, mode, anonymous,
    expires_at, deal_confirmed, last_message, last_message_time
  ) values (
    array[v_req.from_user, v_req.to_user],
    jsonb_build_object(v_req.from_user::text, v_req.from_name, v_req.to_user::text, p_receiver_name),
    v_req.destination, v_req.fare, 'ride', false,
    now() + interval '10 minutes',
    jsonb_build_object(v_req.from_user::text, false, v_req.to_user::text, false),
    '', now()
  )
  returning id into v_chat_id;

  -- দুজনকে reserved (locked) করি
  update public.users set ride_status = 'reserved'
  where id in (v_req.from_user, v_req.to_user);

  -- এই request accepted + chat_id
  update public.ride_requests
  set status = 'accepted', chat_id = v_chat_id, responded_at = now()
  where id = p_request_id;

  -- এই দুজনের জড়িত বাকি সব pending request expire (race-safe broadcast cleanup):
  -- A বা B যাকে/যে পাঠিয়েছিল সব pending শেষ — কারণ দুজনেই এখন reserved।
  update public.ride_requests
  set status = 'expired', responded_at = now()
  where status = 'pending'
    and id <> p_request_id
    and (from_user in (v_req.from_user, v_req.to_user)
         or to_user in (v_req.from_user, v_req.to_user));

  return v_chat_id;
end;
$$;

revoke all on function public.accept_ride_request(uuid, text) from public;
grant execute on function public.accept_ride_request(uuid, text) to authenticated;

-- ৩) ride শেষ/cancel হলে user-দের free করার RPC
create or replace function public.release_ride_status(p_uids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.users set ride_status = 'free' where id = any(p_uids);
$$;

revoke all on function public.release_ride_status(uuid[]) from public;
grant execute on function public.release_ride_status(uuid[]) to authenticated;

-- ৪) deal confirm হলে reserved → in_ride (lock দৃঢ় করি)
create or replace function public.set_riders_in_ride(p_uids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.users set ride_status = 'in_ride'
  where id = any(p_uids) and ride_status = 'reserved';
$$;

revoke all on function public.set_riders_in_ride(uuid[]) from public;
grant execute on function public.set_riders_in_ride(uuid[]) to authenticated;
